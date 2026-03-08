# Design: State Management Enhancement

## Overview

Enhance the Context class with additional type-safe accessors, session persistence capabilities, and security features for logging. These enhancements improve developer experience and enable more robust workflow state management.

## Architecture

### Components

1. **Context Class** (`src/pipeline/context.js`)
   - Existing key-value store with type-safe getters
   - Adding: `getObject()`, `getArray()` for complex types
   - Adding: `exportSession()`, `importSession()` for persistence: Secret masking for
   - Adding log entries

2. **Log Manager** (integrated into Context)
   - Intercepts log entries containing secrets
   - Applies masking before storage

3. **Session Serializer**
   - Handles JSON serialization/deserialization
   - Supports both file and in-memory formats

## Functional Requirements

### FR-001: Type-Safe Object Accessor
**Type**: Ubiquitous  
**Statement**: The Context class shall provide a `getObject(key, defaultValue)` method that returns a parsed JSON object or the default value if the key does not exist or is not valid JSON.  
**Rationale**: Developers need type-safe access to complex data structures stored in context without manual JSON parsing.

### FR-002: Type-Safe Array Accessor
**Type**: Ubiquitous  
**Statement**: The Context class shall provide a `getArray(key, defaultValue)` method that returns an array or the default value if the key does not exist or is not an array.  
**Rationale**: Workflows frequently work with lists (e.g., file paths, results) and need type-safe array retrieval.

### FR-003: Session Export
**Type**: Event-driven  
**Statement**: WHEN a user calls `context.exportSession()`, the system shall return a JSON-serializable object containing all context values, logs, and metadata.  
**Rationale**: Enables workflow state persistence, debugging, and session transfer between pipeline runs.

### FR-004: Session Import
**Type**: Event-driven  
**Statement**: WHEN a user calls `context.importSession(sessionData)`, the system shall restore all values and logs from the provided session object.  
**Rationale**: Enables workflow state restoration for checkpoint recovery, session sharing, and testing scenarios.

### FR-005: Secret Masking in Logs
**Type**: Unwanted Behavior  
**Statement**: IF a log entry contains values matching configured secret patterns, THEN the system shall mask the secret values with asterisks before storing the log entry.  
**Rationale**: Prevents sensitive data (API keys, passwords, tokens) from being exposed in workflow logs.

### FR-006: Environment-Aware Secret Detection
**Type**: Optional Feature  
**Statement**: WHERE environment variables with names matching `*_SECRET`, `*_KEY`, `*_TOKEN`, `*_PASSWORD` patterns exist, the system shall automatically mask their values when appearing in logs.  
**Rationale**: Provides zero-configuration secret detection based on common naming conventions.

## Non-Functional Requirements

### NFR-001: Performance
- `getObject()` and `getArray()` shall complete in O(1) time
- Session export shall complete in O(n) where n is the number of context keys
- Secret masking shall not add more than 10ms overhead per log entry

### NFR-002: Backward Compatibility
- All existing Context methods shall remain functional
- Default values for new methods shall match existing patterns (empty object `{}` for getObject, empty array `[]` for getArray)

### NFR-003: Error Handling
- Invalid JSON in getObject shall return default value (not throw)
- Non-array values in getArray shall return default value (not throw)
- Import with invalid data shall throw descriptive error

## Dependencies

- Node.js 18+ (JSON parsing built-in)
- No new external dependencies required

## Open Questions

- Should session export include checkpoint metadata (timestamp, node progress)?
- Should there be a maximum session size limit?
- Should secret patterns be configurable via environment variables?
