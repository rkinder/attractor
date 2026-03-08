# Requirements: State Management Enhancement

## Overview

Enhance state management capabilities for workflows, including type-safe accessors for complex types, session persistence, and secret masking in logs.

## Architecture Note

**Global Cross-Workflow Context** will be implemented as part of Phase 5a (Shared Infrastructure) using Redis for persistence. This enables:
- Shared state across multiple workflow runs
- Cross-instance data access in distributed deployments
- TTL support for automatic cleanup

---

## Technical Specifications

### REQ-STATE-001: Enhanced Local Context
**From Design**: FR-001  
**Description**: Make local workflow context accessible with key-value store and environment variable access.

**Acceptance Criteria**:
- [x] Context class provides key-value store with get/set methods
- [x] Context supports nested keys via dot notation
- [x] Added `context.getEnv(key)` for environment variables
- [x] Added `context.getEnvString(key, default)` for env vars with defaults
- [x] Added `context.hasEnv(key)` to check env var existence

---

### REQ-STATE-002: Session Persistence via Checkpoint
**From Design**: FR-002  
**Description**: Enable session persistence across restarts via checkpointing.

**Acceptance Criteria**:
- [x] Checkpoint saves context values after each node
- [x] Checkpoint saves logs
- [x] Resume restores context from checkpoint

---

### REQ-STATE-003: Secret/Variable Injection
**From Design**: FR-003  
**Description**: Support secure secret and variable injection.

**Acceptance Criteria**:
- [x] Context supports setting values via set() method
- [x] Added $env.VAR syntax in ConditionEvaluator
- [x] Added $env.VAR syntax in CodergenHandler variable expansion

---

### REQ-STATE-004: Type-Safe Primitive Getters
**From Design**: FR-004  
**Description**: Add type-safe context accessors for primitive types.

**Acceptance Criteria**:
- [x] getString(key, defaultValue) - returns string or default
- [x] getNumber(key, defaultValue) - returns number or default (0 if NaN)
- [x] getBoolean(key, defaultValue) - returns boolean or default

---

### REQ-STATE-005: Type-Safe Object Accessor
**From Design**: FR-001  
**Description**: Add getObject method for retrieving JSON-parsed objects.

**Acceptance Criteria**:
- [ ] `context.getObject(key)` returns parsed JSON object when value is valid JSON
- [ ] `context.getObject(key)` returns default value `{}` when key does not exist
- [ ] `context.getObject(key)` returns default value `{}` when value is not valid JSON
- [ ] `context.getObject(key, {custom: 'default'})` returns custom default when key missing/invalid
- [ ] Method handles nested JSON objects correctly

---

### REQ-STATE-006: Type-Safe Array Accessor
**From Design**: FR-002  
**Description**: Add getArray method for retrieving arrays.

**Acceptance Criteria**:
- [ ] `context.getArray(key)` returns array when value is an array
- [ ] `context.getArray(key)` returns default value `[]` when key does not exist
- [ ] `context.getArray(key)` returns default value `[]` when value is not an array
- [ ] `context.getArray(key, ['a', 'b'])` returns custom default when key missing/invalid
- [ ] Method correctly handles empty arrays

---

### REQ-STATE-007: Session Export
**From Design**: FR-003  
**Description**: Export full session state to a serializable object.

**Acceptance Criteria**:
- [ ] `context.exportSession()` returns object containing all context values
- [ ] `context.exportSession()` returns object containing all log entries
- [ ] `context.exportSession()` includes metadata (export timestamp)
- [ ] Exported session is valid JSON (JSON.stringify succeeds)
- [ ] Export does not modify the original context

---

### REQ-STATE-008: Session Import
**From Design**: FR-004  
**Description**: Import session state from a previously exported session object.

**Acceptance Criteria**:
- [ ] `context.importSession(sessionData)` restores all key-value pairs
- [ ] `context.importSession(sessionData)` restores all log entries
- [ ] Import throws error when sessionData is invalid
- [ ] Import throws descriptive error when sessionData is missing required fields
- [ ] Import replaces existing values with imported values

---

### REQ-STATE-009: Secret Masking in Logs
**From Design**: FR-005  
**Description**: Mask secret values in log entries to prevent exposure.

**Acceptance Criteria**:
- [ ] Log entries containing values matching `*_SECRET` env vars are masked
- [ ] Log entries containing values matching `*_KEY` env vars are masked
- [ ] Log entries containing values matching `*_TOKEN` env vars are masked
- [ ] Log entries containing values matching `*_PASSWORD` env vars are masked
- [ ] Masking replaces value with `***` (6 asterisks)
- [ ] Secret detection works case-insensitively
- [ ] Original values are not modified in context

---

### REQ-STATE-010: Global Cross-Workflow Context (Phase 5a)
**From Design**: FR-001b  
**Description**: Redis-backed context shared across workflow runs and instances.

**Acceptance Criteria**:
- [ ] Redis-backed global key-value store
- [ ] Cross-workflow data sharing
- [ ] TTL support for automatic expiration
- [ ] Atomic operations for concurrent access
- [ ] Support cross-instance access in distributed deployment

**Implementation Note**: This will be implemented as part of `specs/server-expansion/` using Redis.

---

## Interface Contracts

### Context Class (Updated)
```javascript
class Context {
  // Basic key-value
  set(key, value)                    // Set a value
  get(key, default)                  // Get a value
  has(key)                           // Check if key exists
  delete(key)                        // Remove a key
  keys()                             // Get all keys

  // Type-safe getters
  getString(key, defaultValue)       // Get string with default (default: '')
  getNumber(key, defaultValue)       // Get number with default (default: 0)
  getBoolean(key, defaultValue)      // Get boolean with default (default: false)
  getObject(key, defaultValue)       // Get object with default (default: {})
  getArray(key, defaultValue)        // Get array with default (default: [])

  // Session management
  snapshot()                         // Export all values (alias for exportSession)
  exportSession()                    // Export full session state
  importSession(sessionData)         // Import session state
  clone()                            // Create copy
  applyUpdates(obj)                  // Apply multiple updates

  // Logging
  appendLog(entry)                   // Add log entry (with secret masking)

  // Environment
  getEnv(key, defaultValue)          // Get env var
  getEnvString(key, defaultValue)    // Get env var as string
  hasEnv(key)                        // Check if env var exists
}
```

### Session Data Schema
```json
{
  "version": "1.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "values": {
    "key1": "value1",
    "key2": { "nested": "object" }
  },
  "logs": [
    { "timestamp": "2024-01-15T10:00:00.000Z", "message": "log entry" }
  ]
}
```

---

## Constraints

- **Performance**: getObject/getArray must complete in O(1) time
- **Backward Compatibility**: Default values must match existing patterns
- **Error Handling**: Invalid data returns default, not exceptions (except importSession)

---

## Traceability Matrix

| Requirement | Design Source | Status |
|-------------|---------------|--------|
| REQ-STATE-001 | FR-001 | ✅ Complete |
| REQ-STATE-002 | FR-002 | ✅ Complete |
| REQ-STATE-003 | FR-003 | ✅ Complete |
| REQ-STATE-004 | FR-004 | ✅ Complete |
| REQ-STATE-005 | FR-001 | 📋 Pending |
| REQ-STATE-006 | FR-002 | 📋 Pending |
| REQ-STATE-007 | FR-003 | 📋 Pending |
| REQ-STATE-008 | FR-004 | 📋 Pending |
| REQ-STATE-009 | FR-005, FR-006 | 📋 Pending |
| REQ-STATE-010 | FR-001b | 📋 Phase 5a |

---

## Definition of Done

### Complete
- [x] Basic context functionality (get/set/has/delete/keys)
- [x] Checkpoint/resume for session persistence
- [x] Environment variable injection ($env.VAR)
- [x] Type-safe getters (getString, getNumber, getBoolean)

### Pending Implementation
- [ ] Session export (exportSession)
- [ ] Session import (importSession)
- [ ] getObject accessor
- [ ] getArray accessor
- [ ] Secret masking in logs

### Moved to Phase 5a
- [ ] Enhanced global context (cross-workflow) - See `specs/server-expansion/`
