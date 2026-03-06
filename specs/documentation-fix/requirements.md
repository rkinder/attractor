# Requirements: Documentation Rewrite

## Technical Specifications

### REQ-DOC-001: Rewrite api-reference.md
**From Design**: FR-001  
**Description**: Completely rewrite api-reference.md to match actual implementation.

**Acceptance Criteria**:
- [ ] Read all source files in `src/` to understand actual API
- [ ] Document only classes/methods that actually exist
- [ ] Remove all fictional classes (ValidationEngine, AttractorError hierarchy)
- [ ] Remove all fictional methods (runFromString, resume, validate, etc.)
- [ ] Document actual constructor options
- [ ] Verify all code examples actually work

---

### REQ-DOC-002: Fix Attractor Class Section
**From Design**: FR-002  
**Description**: Document only actual Attractor methods.

**Acceptance Criteria**:
- [ ] Keep: `Attractor.create(options)` static method
- [ ] Keep: `attractor.run(dotFilePath, options)` instance method
- [ ] Keep: `attractor.on(event, listener)` instance method
- [ ] Keep: `attractor.registerHandler(type, handler)` instance method
- [ ] Remove: `runFromString()`, `resume()`, `validate()`, `once()`, `off()`, `emit()`
- [ ] Document actual return value of `run()`

---

### REQ-DOC-003: Fix Event Documentation
**From Design**: FR-003  
**Description**: Document events with actual payload shapes.

**Acceptance Criteria**:
- [ ] Document `pipeline_start` with actual fields: `{ runId, dotFilePath, logsDir }`
- [ ] Document `pipeline_complete` with actual fields: `{ runId, result }`
- [ ] Document `pipeline_error` with actual fields: `{ runId, error }`
- [ ] Document `node_execution_start` with actual fields: `{ nodeId, attempt, maxAttempts }`
- [ ] Document `node_execution_success` with actual fields: `{ nodeId, outcome }`
- [ ] Document `node_execution_failed` (note: not `node_execution_failure`)
- [ ] Document `edge_traversed` with actual fields: `{ from, to, edge }`
- [ ] Remove fictional events: `context_updated`, `checkpoint_saved`, `checkpoint_loaded`

---

### REQ-DOC-004: Fix Outcome Class Documentation
**From Design**: FR-004  
**Description**: Document Outcome with correct methods and properties.

**Acceptance Criteria**:
- [ ] Document static methods: `success()`, `fail()`, `partialSuccess()`, `retry()`, `skipped()`
- [ ] Document properties: `status`, `preferred_label`, `suggested_next_ids`, `context_updates`, `notes`, `failure_reason`
- [ ] Remove: `message`, `data`, `timestamp` properties (don't exist)
- [ ] Document StageStatus enum: `SUCCESS`, `PARTIAL_SUCCESS`, `RETRY`, `FAIL`, `SKIPPED`

---

### REQ-DOC-005: Fix Context Class Documentation
**From Design**: FR-005  
**Description**: Document Context with correct name and methods.

**Acceptance Criteria**:
- [ ] Rename from "PipelineContext" to "Context"
- [ ] Document existing methods: `set()`, `get()`, `getString()`, `getNumber()`, `getBoolean()`, `has()`, `delete()`, `keys()`, `snapshot()`, `clone()`, `applyUpdates()`, `appendLog()`
- [ ] Remove: `clear()`, `toJSON()` (don't exist)
- [ ] Document actual built-in keys: `OUTCOME`, `PREFERRED_LABEL`, `GRAPH_GOAL`, `CURRENT_NODE`, `LAST_STAGE`, `LAST_RESPONSE`

---

### REQ-DOC-006: Add Missing Node Types
**From Design**: FR-006  
**Description**: Add all node shapes to documentation.

**Acceptance Criteria**:
- [ ] Add to node types table: `component` → `parallel`
- [ ] Add to node types table: `tripleoctagon` → `parallel.fan_in`
- [ ] Add to node types table: `house` → `stack.manager_loop`

---

### REQ-DOC-007: Export Secrets Module
**From Design**: FR-007  
**Description**: Export secrets classes from main index.js.

**Acceptance Criteria**:
- [ ] Export from `src/index.js`:
  - `SecretsProvider`, `EnvironmentSecretsProvider`, `AWSSecretsManagerProvider`, `AzureKeyVaultProvider`
  - `resolveSecret`, `resolveSecretsInObject`, `isSecretReference`, `createSecretsProvider`, `createAllProviders`
- [ ] Verify: `import { resolveSecret } from 'attractor'` works

---

### REQ-DOC-008: Fix advanced-features.md
**From Design**: FR-008  
**Description**: Fix inaccuracies in advanced-features.md.

**Acceptance Criteria**:
- [ ] Remove "Not Implemented" label from Parallel Execution section
- [ ] Add documentation for FanInHandler
- [ ] Fix predefined stylesheet names: remove `.budget()`, add `.balanced()`, `.performance()`, `.quality()`, `.multiProvider()`
- [ ] Update variable expansion section to note $last_response only works in FanInHandler

---

### REQ-DOC-009: Fix README.md
**From Design**: FR-009  
**Description**: Fix node types table and examples in README.

**Acceptance Criteria**:
- [ ] Add `house` → `stack.manager_loop` to node types table
- [ ] Fix $last_response example or add note about limitation
- [ ] Verify all DOT examples parse correctly

---

## Verification Checklist

- [ ] All documented classes can be imported from 'attractor'
- [ ] All documented methods exist on their classes
- [ ] All event payloads match what's actually emitted
- [ ] All code examples in documentation work when copy-pasted
- [ ] Node types table includes all shapes from SHAPE_TO_TYPE

---

## Definition of Done

- [ ] api-reference.md is completely rewritten
- [ ] getting-started.md is fixed
- [ ] advanced-features.md is fixed
- [ ] README.md is fixed
- [ ] Secrets are exported from index.js
- [ ] All code examples are verified to work
- [ ] Documentation builds without errors
