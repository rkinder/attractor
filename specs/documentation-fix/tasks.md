# Tasks: Documentation Rewrite

## Phase 1: Source Code Analysis

- [x] **1.1** Read all source files in `src/` to inventory actual API
- [x] **1.2** Document all classes, methods, properties in a working note
- [x] **1.3** List all events and their actual payloads
- [x] **1.4** Identify gap between current docs and reality

**Analysis Complete - Key Findings:**

| Item | Status in Docs | Actual Implementation |
|------|---------------|----------------------|
| Attractor.create() | ✅ Correct | Static async method |
| attractor.run() | ✅ Correct | Instance method |
| attractor.runFromString() | ✅ Correct | Instance method |
| attractor.resume() | ❌ Wrong signature | Takes (runId, options), not (checkpointPath) |
| attractor.validate() | ❌ Doesn't exist | Not a public method |
| attractor.once() | ❌ Doesn't exist | Not available |
| attractor.off() | ❌ Doesn't exist | Not available |
| attractor.emit() | ❌ Doesn't exist | Not available |
| attractor.on() | ✅ Correct | Instance method |
| attractor.registerHandler() | ✅ Correct | Instance method |
| Attractor.listCheckpoints() | ✅ Correct | Static method |
| Context.clear() | ❌ Doesn't exist | Remove from docs |
| Context.toJSON() | ❌ Doesn't exist | Remove from docs |
| Context.getObject() | ✅ Added | New method |
| Context.getArray() | ✅ Added | New method |
| Context.exportSession() | ✅ Added | New method |
| Context.importSession() | ✅ Added | New method |
| Outcome.fail() | ✅ Correct | Method name is fail (not failure) |
| Outcome.notes | ✅ Correct | Property is notes (not message) |
| node_execution_failure | ❌ Wrong name | Actual name: node_execution_failed |

---

## Phase 2: Core API Documentation (api-reference.md)

### Task 2.1: Attractor Class
- [x] **2.1.1** Rewrite constructor and create() section
- [x] **2.1.2** Document run(), on(), registerHandler() with correct signatures
- [x] **2.1.3** Remove fictional methods (validate, once, off, emit)
- [x] **Estimated**: 2 hours

### Task 2.2: PipelineEngine Class  
- [x] **2.2.1** Document actual config options
- [x] **2.2.2** Document run() return value correctly
- [x] **Estimated**: 1 hour

### Task 2.3: Context Class
- [x] **2.3.1** Document only existing methods
- [x] **2.3.2** Remove clear() and toJSON() from docs
- [x] **Estimated**: 1 hour

### Task 2.4: Outcome Class
- [x] **2.4.1** Fix method names (fail, not failure)
- [x] **2.4.2** Fix properties (notes, not message)
- [x] **2.4.3** Document StageStatus correctly
- [x] **Estimated**: 1 hour

### Task 2.5: Events Section
- [x] **2.5.1** Rewrite all event documentation with actual payloads
- [x] **2.5.2** Fix event name: node_execution_failed (not failure)
- [x] **2.5.3** Remove fictional events (checkpoint_saved, checkpoint_loaded, context_updated)
- [x] **Estimated**: 2 hours

### Task 2.6: Handler Classes
- [x] **2.6.1** Document all 9 handler types
  - [x] StartHandler, ExitHandler, CodergenHandler
  - [x] ConditionalHandler, WaitForHumanHandler
  - [x] ToolHandler, ParallelHandler, FanInHandler
  - [x] StackManagerLoopHandler
- [x] **2.6.2** Add shape-to-handler mapping
- [x] **Estimated**: 1 hour

---

## Phase 3: Other Documentation Files

### Task 3.1: getting-started.md
- [ ] **3.1.1** Fix node types table (add component, tripleoctagon, house)
- [ ] **3.1.2** Fix configuration options section
- [ ] **3.1.3** Reference CLI commands
- [ ] **Estimated**: 1 hour

### Task 3.2: advanced-features.md
- [ ] **3.2.1** Mark parallel execution as implemented
- [ ] **3.2.2** Fix predefined stylesheet names
- [ ] **3.2.3** Add variable expansion caveat for $last_response
- [ ] **Estimated**: 1 hour

### Task 3.3: README.md
- [ ] **3.3.1** Add house shape to node types
- [ ] **3.3.2** Fix $last_response example
- [ ] **Estimated**: 30 minutes

---

## Phase 4: Code Changes

### Task 4.1: Export Secrets
- [ ] **4.1.1** Add secrets exports to src/index.js
- [ ] **4.1.2** Test imports work
- [ ] **Estimated**: 30 minutes

---

## Phase 5: Verification

- [ ] **5.1** Copy-paste each code example and verify it runs
- [ ] **5.2** Import each documented class/method and verify it exists
- [ ] **5.3** Run pipeline and verify event payloads match docs
- [ ] **5.4** Check all node shapes are documented

---

## Total Estimated Effort

| Phase | Hours |
|-------|-------|
| Phase 1: Analysis | 4 |
| Phase 2: api-reference.md | 8 |
| Phase 3: Other Docs | 2.5 |
| Phase 4: Code Changes | 0.5 |
| Phase 5: Verification | 3 |
| **Total** | **~18 hours** |

---

## Dependencies

- Phase 1 must complete before Phase 2
- Phase 4 can happen in parallel with Phase 3

---

## Notes

- This is a documentation-only task but requires deep code understanding
- Consider using a documentation generator (JSDoc) to auto-generate some sections
- Add "Last verified: [date]" to each section to track staleness
