# Design: Error Class Hierarchy

## Overview

The documentation describes error classes (AttractorError, ValidationError, etc.) that don't exist. This spec addresses implementing a proper error class hierarchy for better error handling.

## Problem Statement

1. Documentation lists error classes that don't exist
2. Code uses standard Error or ParseError inconsistently
3. No structured error handling for different error types
4. Hard to catch specific error types programmatically

## Functional Requirements

### FR-001: Base Error Class
**Type**: Ubiquitous  
**Statement**: The system shall implement `AttractorError` as the base error class for all Attractor-specific errors.  
**Rationale**: Enable catching all Attractor errors with one type.

### FR-002: Specific Error Types
**Type**: Ubiquitous  
**Statement**: The system shall implement specific error subclasses: ValidationError, ExecutionError, ProviderError, TimeoutError, CheckpointError.  
**Rationale**: Enable catching specific error types.

### FR-003: Error Properties
**Type**: Ubiquitous  
**Statement**: Each error shall include helpful properties: message, code, details, nodeId (if applicable).  
**Rationale**: Enable programmatic error handling.

### FR-004: Export Errors
**Type**: Ubiquitous  
**Statement**: The system shall export all error classes from the main package entry point.  
**Rationale**: Enable users to catch specific errors.

## Dependencies

- `src/errors/` - New directory for error classes
- `src/index.js` - Export error classes

## Non-Functional Requirements

### NFR-001: Backward Compatibility
- All existing Error throws must still work
- Don't break existing catch blocks

## Open Questions

1. **Where to put error classes?**
   - Decision: New `src/errors/` directory

2. **Error code format?**
   - Decision: Uppercase string like 'PARSE_ERROR'
