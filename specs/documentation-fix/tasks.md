# Tasks: Documentation Rewrite

## Phase 1: Source Code Analysis

- [ ] **1.1** Read all source files in `src/` to inventory actual API
- [ ] **1.2** Document all classes, methods, properties in a working note
- [ ] **1.3** List all events and their actual payloads
- [ ] **1.4** Identify gap between current docs and reality

---

## Phase 2: Core API Documentation (api-reference.md)

### Task 2.1: Attractor Class
- [ ] **2.1.1** Rewrite constructor and create() section
- [ ] **2.1.2** Document run(), on(), registerHandler() with correct signatures
- [ ] **2.1.3** Remove fictional methods
- [ ] **Estimated**: 2 hours

### Task 2.2: PipelineEngine Class  
- [ ] **2.2.1** Document actual config options
- [ ] **2.2.2** Document run() return value correctly
- [ ] **Estimated**: 1 hour

### Task 2.3: Context Class
- [ ] **2.3.1** Rename to "Context" (not PipelineContext)
- [ ] **2.3.2** Document only existing methods
- [ ] **2.3.3** Remove clear() and toJSON()
- [ ] **Estimated**: 1 hour

### Task 2.4: Outcome Class
- [ ] **2.4.1** Fix method names (fail, not failure)
- [ ] **2.4.2** Fix properties (notes, not message)
- [ ] **2.4.3** Document StageStatus correctly
- [ ] **Estimated**: 1 hour

### Task 2.5: Events Section
- [ ] **2.5.1** Rewrite all event documentation with actual payloads
- [ ] **2.5.2** Fix event name: node_execution_failed (not failure)
- [ ] **2.5.3** Remove fictional events
- [ ] **Estimated**: 2 hours

### Task 2.6: Handler Classes
- [ ] **2.6.1** Document all 9 handler types
- [ ] **2.6.2** Add ParallelHandler, FanInHandler, MCPHandler, StackManagerLoopHandler
- [ ] **Estimated**: 1 hour

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
