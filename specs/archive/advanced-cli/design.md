# Design: Advanced CLI

## Overview

Advanced CLI provides a comprehensive command-line interface with argument parsing, validation, configuration options, and professional help output. Replaces current ad-hoc runner scripts with unified, user-friendly CLI tool.

**Problem Statement**: Current CLI consists of separate scripts (run-workflow.js, run-with-kilo.js) with inconsistent argument handling and no help system. Users struggle to discover options and provide correct arguments.

**Solution**: Implement single CLI entry point using `commander` or `yargs` library with subcommands, rich help text, argument validation, and configuration file support.

## Functional Requirements

### FR-001: Main Command
**Type**: Ubiquitous  
**Statement**: The system shall provide `attractor run <dot-file>` as primary execution command.

### FR-002: Validation Subcommand
**Type**: Ubiquitous  
**Statement**: The system shall provide `attractor validate <dot-file>` for validation-only mode.

### FR-003: Configuration Options
**Type**: Ubiquitous  
**Statement**: The system shall accept options: --gateway-config, --gateway, --stylesheet, --mcp-config, --auto-approve, --logs, --resume, --max-tokens.

### FR-004: Help System
**Type**: Ubiquitous  
**Statement**: The system shall provide `--help` flag showing all commands, options, and examples.

### FR-005: Version Display
**Type**: Ubiquitous  
**Statement**: The system shall provide `--version` flag showing package version.

### FR-006: Error Messages
**Type**: Unwanted Behavior  
**Statement**: IF arguments invalid, THEN the system shall show clear error message and usage hint.

### FR-007: File Existence Validation
**Type**: Unwanted Behavior  
**Statement**: IF DOT file doesn't exist, THEN the system shall exit with error before attempting execution.

### FR-008: Exit Codes
**Type**: Ubiquitous  
**Statement**: The system shall return exit code 0 for success, 1 for pipeline failure, 2 for CLI error.

## Non-Functional Requirements
- **NFR-001**: Help text <50 lines for readability
- **NFR-002**: Argument parsing <10ms
- **NFR-003**: Compatible with npm scripts and CI/CD

## Dependencies
- `commander` (^11.0.0) or `yargs` (^17.0.0)

## Open Questions
1. Config file support (.attractorrc)? **Decision**: Defer to v2
