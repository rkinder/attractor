# Advanced CLI

The Advanced CLI provides a comprehensive command-line interface for the Attractor pipeline runner with argument parsing, validation, configuration options, and professional help output.

## Installation

The CLI is automatically available after installing the package:

```bash
npm install
```

You can also run it directly:

```bash
node src/cli.js --help
```

Or link it for global use:

```bash
npm link
attractor --help
```

## Commands

### Run a Workflow

Execute a workflow from a DOT file:

```bash
attractor run <dot-file> [options]
```

**Options:**

- `--gateway-config <value>` - Override KILO_CONFIG environment variable
- `--gateway <host>` - Override KILO_GATEWAY environment variable  
- `--stylesheet <file>` - Apply specified model stylesheet
- `--mcp-config <value>` - Load specified MCP configuration
- `--auto-approve` - Automatically approve all human gates
- `--logs <dir>` - Write logs to specified directory (default: ./logs)
- `--resume <run-id>` - Resume from specified checkpoint
- `--max-tokens <value>` - Override token limit for LLM calls

**Example:**

```bash
attractor run workflow.dot
attractor run workflow.dot --logs ./my-logs
attractor run workflow.dot --gateway-config balanced
```

### Validate a Workflow

Validate a DOT file without executing:

```bash
attractor validate <dot-file>
```

**Example:**

```bash
attractor validate workflow.dot
```

## Help System

Get help for all commands:

```bash
attractor --help
```

Get help for a specific command:

```bash
attractor run --help
attractor validate --help
```

## Version Display

Show the package version:

```bash
attractor --version
```

## Exit Codes

- `0` - Success
- `1` - Pipeline failure
- `2` - CLI error (invalid arguments, missing file, etc.)

## Examples

### Basic Usage

```bash
# Run a workflow
attractor run examples/simple-linear.dot

# Validate a workflow
attractor validate examples/simple-linear.dot
```

### With Configuration

```bash
# Run with custom gateway config
attractor run workflow.dot --gateway-config balanced

# Run with custom logs directory
attractor run workflow.dot --logs ./run-logs

# Resume from previous run
attractor run workflow.dot --resume run-2024-01-15-123456-abc123
```

### CI/CD Integration

```bash
# Validate before running
attractor validate workflow.dot || exit 1

# Run with error handling
attractor run workflow.dot
exit_code=$?
if [ $exit_code -eq 0 ]; then
  echo "Success"
elif [ $exit_code -eq 1 ]; then
  echo "Pipeline failed"
else
  echo "CLI error"
fi
```
