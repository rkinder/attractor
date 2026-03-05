# Design: Tool Handler

## Overview

The Tool Handler enables Attractor pipelines to execute external shell commands as part of workflow execution. This feature allows pipelines to integrate with system utilities, run build scripts, execute tests, or interact with any command-line tool without requiring custom JavaScript code.

**Problem Statement**: Currently, the JavaScript Attractor can only execute LLM tasks (codergen), human approval gates, and basic control flow. There is no mechanism to execute shell commands, limiting integration with external tools and system operations.

**Solution**: Implement a `ToolHandler` class that executes shell commands specified in node attributes, captures output, handles errors, and respects timeout constraints. This mirrors the mature Python implementation while adapting to Node.js conventions.

## Architecture

### Components

1. **ToolHandler** (`src/handlers/tool.js`)
   - Extends `Handler` base class
   - Executes shell commands using Node.js `child_process.exec`
   - Captures stdout/stderr
   - Enforces timeout constraints
   - Returns `Outcome` with execution results

2. **Handler Registry Integration** (`src/handlers/registry.js`)
   - Already maps `parallelogram` shape to `tool` type (line 13)
   - No changes needed - registry is ready

3. **Pipeline Engine Integration** (`src/pipeline/engine.js`)
   - No changes needed - uses handler registry for dispatch

### Data Flow

```
DOT Pipeline → Parser → Graph (Node with shape=parallelogram)
                           ↓
                    Engine.executeNode()
                           ↓
                    Registry.resolve('tool')
                           ↓
                    ToolHandler.execute()
                           ↓
                    child_process.exec(command)
                           ↓
                    {stdout, stderr, exitCode}
                           ↓
                    Outcome(success/fail)
                           ↓
                    Context updated + logs written
```

## Functional Requirements

### FR-001: Shell Command Execution
**Type**: Ubiquitous  
**Statement**: The system shall execute shell commands specified in the `tool_command` node attribute using Node.js child_process.exec.  
**Rationale**: Core functionality - tool nodes must be able to run arbitrary shell commands.

### FR-002: Command Timeout Enforcement
**Type**: State-driven  
**Statement**: WHILE a tool command is executing, the system shall terminate execution if it exceeds the timeout specified in the `timeout` attribute (default: 30000ms).  
**Rationale**: Prevents hung processes from blocking pipeline execution indefinitely.

### FR-003: Output Capture
**Type**: Ubiquitous  
**Statement**: The system shall capture both stdout and stderr from executed commands and store them in the execution context.  
**Rationale**: Enables downstream nodes to access tool output and debug failures.

### FR-004: Success Detection
**Type**: Event-driven  
**Statement**: WHEN a tool command completes with exit code 0, the system shall return Outcome.success() with stdout stored in context key `tool.output`.  
**Rationale**: Standard Unix convention - exit code 0 indicates success.

### FR-005: Failure Detection
**Type**: Event-driven  
**Statement**: WHEN a tool command completes with non-zero exit code, the system shall return Outcome.fail() with the exit code and stderr in the failure reason.  
**Rationale**: Enables error handling and conditional branching based on command failures.

### FR-006: Timeout Failure Handling
**Type**: Unwanted Behavior  
**Statement**: IF a tool command exceeds its timeout, THEN the system shall kill the process and return Outcome.fail() with message "Command timed out after Xms".  
**Rationale**: Distinguishes timeout failures from command failures for debugging.

### FR-007: Missing Command Validation
**Type**: Unwanted Behavior  
**Statement**: IF a tool node is missing the `tool_command` attribute, THEN the system shall immediately return Outcome.fail() with message "No tool_command specified" without attempting execution.  
**Rationale**: Fail fast on misconfigured nodes rather than executing undefined behavior.

### FR-008: Execution Logging
**Type**: Ubiquitous  
**Statement**: The system shall write command details, stdout, stderr, and exit code to files in the stage log directory.  
**Rationale**: Enables debugging and auditing of tool executions.

### FR-009: Variable Expansion
**Type**: Optional Feature  
**Statement**: WHERE a tool_command contains context variables (e.g., `$last_response`), the system shall expand them using the same variable substitution mechanism as CodergenHandler.  
**Rationale**: Enables dynamic commands based on prior pipeline state.

### FR-010: Shell Injection Protection
**Type**: Unwanted Behavior  
**Statement**: IF a tool_command contains user-provided input from context variables, THEN the system shall document that users are responsible for proper escaping (no automatic sanitization).  
**Rationale**: Matches Node.js child_process.exec behavior - shell interpretation is intentional.

## Non-Functional Requirements

### NFR-001: Performance
The system shall start command execution within 10ms of handler invocation (excluding command runtime).

### NFR-002: Compatibility
The system shall work on Linux, macOS, and Windows platforms using platform-appropriate shell defaults (sh on Unix, cmd.exe on Windows).

### NFR-003: Error Clarity
Error messages shall include sufficient detail to diagnose failures: command text, exit code, and stderr output.

### NFR-004: Resource Cleanup
The system shall ensure child processes are terminated when timeout occurs or parent process exits.

## Dependencies

### Internal
- `src/handlers/registry.js` - Handler base class
- `src/pipeline/outcome.js` - Outcome construction
- `src/pipeline/context.js` - Context key constants
- `fs/promises` - Log file writing
- `path` - Log directory construction

### External
- Node.js `child_process` module - Command execution
- Node.js `util.promisify` - Promise-based exec wrapper

### Similar Implementations
- Python version: `src/attractor/advanced_handlers.py:70-108`
- Uses `subprocess.run()` with similar timeout/capture logic

## Open Questions

1. **Should we support streaming stdout/stderr for long-running commands?**
   - Current design: Buffer entire output (matches Python)
   - Alternative: Stream to log files and context incrementally
   - Decision: Start with buffered approach (simpler), add streaming later if needed

2. **Should we support command arrays (exec vs execFile)?**
   - Current: Single string passed to shell (exec)
   - Alternative: Array of args without shell (execFile - safer but less flexible)
   - Decision: Start with exec (matches Python), document security implications

3. **Should we support environment variable overrides?**
   - Python version doesn't support this for tool handler
   - Could add `tool_env` attribute for custom environment
   - Decision: Defer to future enhancement

4. **How should we handle commands that produce binary output?**
   - Current: Treat all output as text (encoding: 'utf8')
   - Alternative: Support buffer mode for binary data
   - Decision: Text only for MVP, add binary support if requested

5. **Should we support input via stdin?**
   - Python version doesn't support stdin input
   - Could add `tool_input` attribute
   - Decision: Defer to future enhancement
