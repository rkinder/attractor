# Requirements: Advanced CLI

## Technical Specifications

### REQ-001: CLI Entry Point
Create `src/cli.js` using commander or yargs library.

### REQ-002: Run Command
Implement `attractor run <dot-file>` with all execution options.

### REQ-003: Validate Command
Implement `attractor validate <dot-file>` that only runs validation, exits with validation result.

### REQ-004: Option Definitions
Define options: `--gateway-config <path>`, `--gateway <name>`, `--stylesheet <path>`, `--mcp-config <path>`, `--auto-approve`, `--logs <dir>`, `--resume`, `--max-tokens <n>`.

### REQ-005: Positional Argument
Define `<dot-file>` as required positional argument for run and validate commands.

### REQ-006: Help Text
Generate help text showing commands, options, defaults, and usage examples.

### REQ-007: Version Flag
Implement `--version` that reads from package.json and displays.

### REQ-008: File Validation
Check DOT file exists before parsing, exit with clear error if missing.

### REQ-009: Exit Code Handling
Return 0 on success, 1 on pipeline failure, 2 on argument/validation error, 130 on SIGINT.

### REQ-010: Error Formatting
Format errors with command name prefix, clear message, and suggestion (e.g., "Try 'attractor --help'").

### REQ-011: Executable Script
Add shebang `#!/usr/bin/env node` to `src/cli.js`, add `bin` entry in package.json.

### REQ-012: Integration with Engine
Call existing engine/pipeline execution code, don't reimplement logic.

## Test Cases
- TC-001: Run command executes pipeline
- TC-002: Validate command only validates
- TC-003: --help shows documentation
- TC-004: --version shows version
- TC-005: Missing file shows error
- TC-006: Invalid option shows error
- TC-007: Exit codes correct
- TC-008: Options parsed correctly

## Estimated Effort: ~4 hours
