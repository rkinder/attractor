# Requirements: State Management Enhancement

## Overview

Enhance state management capabilities for workflows, including global context, session persistence, and secret/variable injection.

## Current State

- Context class provides basic key-value store
- Checkpointing enables session persistence across restarts
- Secret/variable injection via context

## Architecture Note

**Global Cross-Workflow Context** will be implemented as part of Phase 5a (Shared Infrastructure) using Redis for persistence. This enables:
- Shared state across multiple workflow runs
- Cross-instance data access in distributed deployments
- TTL support for automatic cleanup

## Technical Specifications

### REQ-STATE-001: Enhanced Local Context (COMPLETE)
**From Design**: FR-001  
**Description**: Make local workflow context accessible.

**Acceptance Criteria**:
- [x] Context class provides key-value store with get/set methods
- [x] Context supports nested keys via dot notation
- [x] Added `context.getEnv(key)` for environment variables
- [x] Added `context.getEnvString(key, default)` for env vars with defaults
- [x] Added `context.hasEnv(key)` to check env var existence

---

### REQ-STATE-001b: Global Cross-Workflow Context (Phase 5a)
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

### REQ-STATE-002: Session Persistence
**From Design**: FR-002  
**Description**: Enable session persistence across restarts.

**Acceptance Criteria**:
- [x] Checkpoint saves context values after each node
- [x] Checkpoint saves logs
- [x] Resume restores context from checkpoint
- [ ] Add ability to export/import full session state
- [ ] Add session encryption for sensitive data

---

### REQ-STATE-003: Secret/Variable Injection
**From Design**: FR-003  
**Description**: Support secure secret and variable injection.

**Acceptance Criteria**:
- [x] Context supports setting values via set() method
- [x] Added $env.VAR syntax in ConditionEvaluator
- [x] Added $env.VAR syntax in CodergenHandler variable expansion
- [ ] Add secret masking in logs
- [ ] Support runtime variable updates

---

### REQ-STATE-004: Context Type Safety
**From Design**: FR-004  
**Description**: Add type-safe context accessors.

**Acceptance Criteria**:
- [x] getString(key, defaultValue)
- [x] getNumber(key, defaultValue)
- [x] getBoolean(key, defaultValue)
- [ ] Add getObject(key, defaultValue)
- [ ] Add getArray(key, defaultValue)

---

## Interface Contracts

### Context Class
```javascript
class Context {
  set(key, value)     // Set a value
  get(key, default)   // Get a value
  getString(key, '')  // Get string with default
  getNumber(key, 0)  // Get number with default
  getBoolean(key, false) // Get boolean with default
  has(key)            // Check if key exists
  delete(key)         // Remove a key
  keys()              // Get all keys
  snapshot()          // Export all values
  clone()             // Create copy
  applyUpdates(obj)   // Apply multiple updates
  appendLog(entry)   // Add log entry
}
```

---

## Definition of Done

### Complete (Local Context)
- [x] Basic context functionality implemented
- [x] Checkpoint/resume for session persistence
- [x] Environment variable injection ($env.VAR)
- [x] Type-safe getters (getString, getNumber, getBoolean)

### Remaining (Phase 3)
- [ ] Session export/import
- [ ] Secret masking in logs
- [ ] getObject/getArray accessors

### Moved to Phase 5a (Redis-Backed Global Context)
- [ ] Enhanced global context (cross-workflow) - See `specs/server-expansion/`

Note: The cross-workflow context feature has been moved to Phase 5a as it requires Redis infrastructure.
