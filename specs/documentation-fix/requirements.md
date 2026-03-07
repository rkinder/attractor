# Requirements: Documentation Fix

## Overview

Update documentation to match actual implementation. Many methods that were marked as "fictional" have now been implemented.

## Technical Specifications

### REQ-DOC-001: Update api-reference.md
**From Design**: FR-001  
**Description**: Update api-reference.md to reflect implemented features.

**Acceptance Criteria**:
- [x] Keep: `Attractor.create(options)` static method
- [x] Keep: `attractor.run(dotFilePath, options)` instance method
- [x] Keep: `attractor.on(event, listener)` instance method
- [x] Keep: `attractor.registerHandler(type, handler)` instance method
- [x] Add: `attractor.runFromString(dotText, options)` - now implemented
- [x] Add: `attractor.resume(runId, options)` - now implemented
- [x] Add: `Attractor.listCheckpoints(options)` - now implemented
- [x] Document return value of each method

---

### REQ-DOC-002: Fix Event Documentation
**From Design**: FR-003  
**Description**: Document events with actual payload shapes.

**Acceptance Criteria**:
- [x] Document `pipeline_start` with actual fields: `{ runId, dotFilePath, logsDir }`
- [x] Document `pipeline_complete` with actual fields: `{ runId, result }`
- [x] Document `pipeline_error` with actual fields: `{ runId, error }`
- [x] Document `pipeline_resume` with actual fields: `{ runId, checkpoint }`
- [x] Document `pipeline_resume_complete` with actual fields: `{ runId, success, resumedFrom }`
- [x] Document `node_execution_start` with actual fields: `{ nodeId, attempt, maxAttempts }`
- [x] Document `node_execution_success` with actual fields: `{ nodeId, outcome }`
- [x] Document `node_execution_failed` with actual fields: `{ nodeId, error, retryTarget? }`
- [x] Document `node_execution_error` with actual fields: `{ nodeId, error }`
- [x] Document `node_execution_retry` with actual fields: `{ nodeId, attempt, reason }`
- [x] Document `node_execution_partial` with actual fields: `{ nodeId }`
- [x] Document `condition_error` with actual fields: `{ condition, error }`
- [x] Document `edge_traversed` with actual fields: `{ from, to, edge }`
- [x] Document `loop_restart` with actual fields: `{ nodeId, iteration }`
- [x] Document `goal_gate_retry` with actual fields: `{ failedGoal, retryTarget }`
- [x] Document `pipeline_terminal` with actual fields: `{ nodeId }`
- [x] Document `validation_warnings` with actual fields: `{ warnings }`
- [x] Document `validation_complete` with actual fields: `{ valid, errors, warnings }`
- [x] Document `stylesheet_loaded` with actual fields: `{ stylesheet }`

---

### REQ-DOC-003: Fix Outcome Class Documentation
**From Design**: FR-004  
**Description**: Document Outcome with correct methods and properties.

**Acceptance Criteria**:
- [x] Document static methods: `success()`, `fail()`, `partialSuccess()`, `retry()`, `skipped()`
- [x] Document properties: `status`, `preferred_label`, `suggested_next_ids`, `context_updates`, `notes`, `failure_reason`
- [x] Document StageStatus enum: `SUCCESS`, `PARTIAL_SUCCESS`, `RETRY`, `FAIL`, `SKIPPED`

---

### REQ-DOC-004: Export New Classes
**From Design**: FR-007  
**Description**: Export newly implemented classes from main index.js.

**Acceptance Criteria**:
- [x] Export error classes from src/index.js
- [x] Export OutputExtractor from src/index.js
- [x] Export ConditionEvaluator (internal, but available)
- [x] Verify all exports work correctly

---

### REQ-DOC-005: Update Variable Expansion Documentation
**From Design**: FR-005  
**Description**: Update docs to reflect that variable expansion now works in CodergenHandler.

**Acceptance Criteria**:
- [x] Variable expansion in CodergenHandler now supports:
  - `$goal` - graph goal
  - `$last_response` - last LLM response
  - `$current_node` - current node ID
  - `$context.<key>` - arbitrary context keys
  - `$<nodeId>.output` - previous node outputs

---

## Verification Checklist

- [ ] All documented classes can be imported from 'attractor'
- [ ] All documented methods exist on their classes
- [ ] All event payloads match what's actually emitted
- [ ] Variable expansion docs updated

---

## Definition of Done

- [x] runFromString() implemented and exported
- [x] resume() implemented and exported
- [x] listCheckpoints() implemented and exported
- [x] Error classes implemented and exported
- [x] OutputExtractor implemented and exported
- [x] Event documentation verified (30 events)
- [x] All exports verified working
