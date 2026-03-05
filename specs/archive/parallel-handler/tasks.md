# Tasks: Parallel Handler

## Implementation Tasks

### Phase 1: Foundation

#### TASK-001: Add PARTIAL_SUCCESS status to outcome
- **Depends on**: None
- **Files**: `src/pipeline/outcome.js`
- **Estimated**: 10 minutes
- **Description**: Add `PARTIAL_SUCCESS` to `StageStatus` enum and update JSDoc
- **Acceptance**: Status enum includes PARTIAL_SUCCESS, documentation updated

#### TASK-002: Verify Context snapshot() method
- **Depends on**: None
- **Files**: `src/pipeline/context.js`
- **Estimated**: 15 minutes
- **Description**: Test that `snapshot()` creates proper isolated copies, fix if needed
- **Acceptance**: Snapshot returns independent object, modifications don't affect original

#### TASK-003: Create ParallelHandler class file
- **Depends on**: TASK-001
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 20 minutes
- **Description**: Create file with ParallelHandler class skeleton extending Handler
- **Acceptance**: File exists, class exports, imports Handler and Outcome

---

### Phase 2: Core Handler Logic

#### TASK-004: Implement edge discovery and validation
- **Depends on**: TASK-003
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 20 minutes
- **Description**: Get outgoing edges from graph, handle empty case, extract target nodes
- **Acceptance**: Returns success immediately if no edges, collects all edge targets

#### TASK-005: Implement max_parallel configuration extraction
- **Depends on**: TASK-003
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 15 minutes
- **Description**: Extract and validate `max_parallel` attribute with default of 4
- **Acceptance**: Defaults to 4, validates range 1-50, logs warnings for invalid values

#### TASK-006: Implement context snapshot creation for branches
- **Depends on**: TASK-002, TASK-004
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 25 minutes
- **Description**: Create isolated context for each branch using snapshot()
- **Acceptance**: Each branch gets independent context, no shared references

---

### Phase 3: Concurrency Control

#### TASK-007: Decide on concurrency control approach
- **Depends on**: TASK-005
- **Files**: None (decision/research)
- **Estimated**: 30 minutes
- **Description**: Evaluate p-limit vs custom semaphore, make implementation choice
- **Acceptance**: Decision documented with rationale, dependencies installed if needed

#### TASK-008: Implement concurrency limiter
- **Depends on**: TASK-007
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 45 minutes
- **Description**: Implement chosen concurrency control (p-limit or custom semaphore)
- **Acceptance**: Enforces max_parallel limit, queues excess branches correctly

---

### Phase 4: Branch Execution

#### TASK-009: Implement _executeBranch() method
- **Depends on**: TASK-006
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 45 minutes
- **Description**: Execute single branch by resolving handler and calling execute()
- **Acceptance**: Resolves correct handler, executes with branch context, returns outcome

#### TASK-010: Implement branch exception handling
- **Depends on**: TASK-009
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 20 minutes
- **Description**: Wrap branch execution in try-catch, convert exceptions to FAIL outcomes
- **Acceptance**: Exceptions captured, other branches continue, FAIL outcome returned

#### TASK-011: Implement concurrent branch execution with Promise.allSettled
- **Depends on**: TASK-008, TASK-009, TASK-010
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 30 minutes
- **Description**: Execute all branches concurrently using Promise.allSettled and limiter
- **Acceptance**: All branches execute, waits for all to complete, returns all results

---

### Phase 5: Result Aggregation

#### TASK-012: Implement full success aggregation
- **Depends on**: TASK-011
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 20 minutes
- **Description**: Detect all branches succeeded, return Outcome.success() with counts
- **Acceptance**: Returns SUCCESS when all branches succeed, includes success count in notes

#### TASK-013: Implement partial success aggregation
- **Depends on**: TASK-011, TASK-001
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 25 minutes
- **Description**: Detect mixed success/failure, return PARTIAL_SUCCESS outcome
- **Acceptance**: Returns PARTIAL_SUCCESS, includes counts, lists failed branches

#### TASK-014: Implement complete failure aggregation
- **Depends on**: TASK-011
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 20 minutes
- **Description**: Detect all branches failed, return Outcome.fail() with details
- **Acceptance**: Returns FAIL, includes all failure reasons, no success count

#### TASK-015: Implement context result storage
- **Depends on**: TASK-012, TASK-013, TASK-014
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 30 minutes
- **Description**: Store branch results in context keys (parallel.results, etc.)
- **Acceptance**: Context includes parallel.results JSON, individual branch outputs, counts

---

### Phase 6: Logging

#### TASK-016: Implement branch log directory creation
- **Depends on**: TASK-009
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 20 minutes
- **Description**: Create log subdirectories for each branch
- **Acceptance**: Creates <parallel_node_id>/branch_<id>/ directories with recursive option

#### TASK-017: Implement summary logging
- **Depends on**: TASK-015
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 25 minutes
- **Description**: Write summary.json with aggregate results, counts, timestamps
- **Acceptance**: Summary file created with all required fields, valid JSON

---

### Phase 7: Integration

#### TASK-018: Register ParallelHandler in engine
- **Depends on**: TASK-003
- **Files**: `src/pipeline/engine.js` or `src/index.js`
- **Estimated**: 20 minutes
- **Description**: Instantiate ParallelHandler with handler registry, register with key 'parallel'
- **Acceptance**: Handler registered, registry.has('parallel') returns true

#### TASK-019: Update engine initialization in entry points
- **Depends on**: TASK-018
- **Files**: `run-workflow.js`, `run-with-kilo.js`, `run-with-gateway.js`
- **Estimated**: 15 minutes
- **Description**: Ensure ParallelHandler registered in all CLI runners
- **Acceptance**: Parallel handler available when running from any entry point

---

### Phase 8: Observability

#### TASK-020: Implement event emission (optional)
- **Depends on**: TASK-011, TASK-015
- **Files**: `src/handlers/parallel.js`
- **Estimated**: 30 minutes (optional)
- **Description**: Emit events for parallel lifecycle (start, branch start/complete, complete)
- **Acceptance**: Events emitted with correct data, timestamps included

---

### Phase 9: Examples and Documentation

#### TASK-021: Create parallel handler example pipeline
- **Depends on**: TASK-018
- **Files**: `examples/parallel-workflow.dot`
- **Estimated**: 30 minutes
- **Description**: Create DOT file with parallel node demonstrating 3 concurrent branches
- **Acceptance**: Pipeline executes successfully with parallel branches

#### TASK-022: Create parallel handler runner script
- **Depends on**: TASK-021
- **Files**: `examples/run-parallel-example.js`
- **Estimated**: 15 minutes
- **Description**: Create Node.js script to run parallel workflow example
- **Acceptance**: Script successfully executes parallel-workflow.dot

#### TASK-023: Add parallel handler documentation
- **Depends on**: TASK-021
- **Files**: `docs/parallel-handler.md`
- **Estimated**: 45 minutes
- **Description**: Document parallel handler attributes, usage, concurrency control, examples
- **Acceptance**: Documentation includes all features, PARTIAL_SUCCESS status, examples

#### TASK-024: Update main README with parallel handler
- **Depends on**: TASK-023
- **Files**: `README.md`
- **Estimated**: 10 minutes
- **Description**: Add parallel handler to feature list and node types table
- **Acceptance**: README mentions component shape maps to parallel execution

---

### Phase 10: Testing

#### TASK-025: Create unit tests for ParallelHandler
- **Depends on**: TASK-017
- **Files**: `test/parallel-handler.test.js`
- **Estimated**: 90 minutes
- **Description**: Write unit tests for all requirements (see test cases below)
- **Acceptance**: All 16 test cases pass

#### TASK-026: Create integration test with pipeline
- **Depends on**: TASK-019, TASK-025
- **Files**: `test/integration/parallel-pipeline.test.js`
- **Estimated**: 45 minutes
- **Description**: End-to-end test running a DOT pipeline with parallel node
- **Acceptance**: Pipeline with parallel branches executes, results aggregated correctly

#### TASK-027: Run existing test suite
- **Depends on**: TASK-019
- **Files**: None (validation only)
- **Estimated**: 10 minutes
- **Description**: Execute existing tests to ensure no regressions
- **Acceptance**: All existing tests pass

---

## Test Cases

### TC-001: ParallelHandler class exists
**Requirement**: REQ-001  
**Type**: Unit  
**Steps**:
1. Import ParallelHandler from `src/handlers/parallel.js`
2. Assert class is exported
3. Assert extends Handler base class
**Expected**: Class imported successfully, inheritance correct

---

### TC-002: Execute branches with all success
**Requirement**: REQ-001, REQ-006, REQ-008  
**Type**: Unit  
**Steps**:
1. Create parallel node with 3 outgoing edges
2. Mock handler registry to return success outcomes for all branches
3. Call `handler.execute()`
4. Assert outcome.status === 'SUCCESS'
5. Assert notes includes "All 3 branches succeeded"
**Expected**: Success outcome with correct count

---

### TC-003: Handle empty branches (no edges)
**Requirement**: REQ-002  
**Type**: Unit  
**Steps**:
1. Create parallel node with no outgoing edges
2. Call `handler.execute()`
3. Assert outcome.status === 'SUCCESS'
4. Assert notes includes "No branches to execute"
**Expected**: Immediate success without branch execution

---

### TC-004: Max parallel default value
**Requirement**: REQ-003  
**Type**: Unit  
**Steps**:
1. Create parallel node without `max_parallel` attribute
2. Spy on concurrency limiter creation
3. Assert limiter created with max=4
**Expected**: Default value of 4 used

---

### TC-005: Max parallel custom value
**Requirement**: REQ-003  
**Type**: Unit  
**Steps**:
1. Create parallel node with `max_parallel=2`
2. Spy on concurrency limiter creation
3. Assert limiter created with max=2
**Expected**: Custom value used

---

### TC-006: Context isolation between branches
**Requirement**: REQ-004  
**Type**: Unit  
**Steps**:
1. Set context value `foo=bar`
2. Create parallel node with 2 branches
3. Mock branch 1 to modify context: `foo=changed`
4. Assert main context still has `foo=bar` after execution
5. Assert branch 2 context has `foo=bar` (not `changed`)
**Expected**: Branch contexts isolated from each other and parent

---

### TC-007: Concurrent execution of branches
**Requirement**: REQ-005  
**Type**: Integration  
**Steps**:
1. Create parallel node with 3 branches
2. Mock each branch to take 100ms
3. Measure total execution time
4. Assert time < 150ms (concurrent, not sequential)
**Expected**: Branches execute concurrently, not sequentially

---

### TC-008: Concurrency limit enforcement
**Requirement**: REQ-005, REQ-015  
**Type**: Integration  
**Steps**:
1. Create parallel node with `max_parallel=2` and 5 branches
2. Track concurrent execution count
3. Assert max concurrent count never exceeds 2
**Expected**: Only 2 branches execute at any time

---

### TC-009: Branch exception handling
**Requirement**: REQ-007  
**Type**: Unit  
**Steps**:
1. Create parallel node with 3 branches
2. Mock branch 2 to throw exception
3. Call `handler.execute()`
4. Assert branch 1 and 3 still execute
5. Assert branch 2 result is FAIL outcome
**Expected**: Exception caught, converted to FAIL, other branches continue

---

### TC-010: Full success aggregation
**Requirement**: REQ-008  
**Type**: Unit  
**Steps**:
1. Create parallel node with 3 branches
2. Mock all branches to return SUCCESS
3. Call `handler.execute()`
4. Assert outcome.status === 'SUCCESS'
5. Assert context has `parallel.success_count=3`
**Expected**: SUCCESS status with correct counts

---

### TC-011: Partial success aggregation
**Requirement**: REQ-009, REQ-013  
**Type**: Unit  
**Steps**:
1. Create parallel node with 3 branches
2. Mock 2 branches SUCCESS, 1 FAIL
3. Call `handler.execute()`
4. Assert outcome.status === 'PARTIAL_SUCCESS'
5. Assert notes includes "2/3 branches succeeded"
6. Assert failureReason lists failed branch
**Expected**: PARTIAL_SUCCESS status with details

---

### TC-012: Complete failure aggregation
**Requirement**: REQ-010  
**Type**: Unit  
**Steps**:
1. Create parallel node with 3 branches
2. Mock all branches to return FAIL
3. Call `handler.execute()`
4. Assert outcome.status === 'FAIL'
5. Assert failureReason includes all 3 failure reasons
**Expected**: FAIL status with aggregated reasons

---

### TC-013: Context result storage
**Requirement**: REQ-011  
**Type**: Unit  
**Steps**:
1. Execute parallel node with 2 branches
2. Assert context has `parallel.results` (JSON string)
3. Parse JSON, verify structure includes branches array
4. Assert context has `parallel.success_count`
5. Assert context has `parallel.fail_count`
6. Assert context has `parallel.total_count`
**Expected**: All context keys populated correctly

---

### TC-014: Branch log directory creation
**Requirement**: REQ-012, REQ-017  
**Type**: Unit  
**Steps**:
1. Execute parallel node with 2 branches
2. Assert directory exists: `<logsRoot>/<parallel_id>/branch_<branch1_id>`
3. Assert directory exists: `<logsRoot>/<parallel_id>/branch_<branch2_id>`
4. Assert file exists: `<logsRoot>/<parallel_id>/summary.json`
5. Assert summary.json contains valid JSON with counts
**Expected**: All log directories and summary created

---

### TC-015: Handler registration
**Requirement**: REQ-014  
**Type**: Integration  
**Steps**:
1. Import and initialize engine with handler registry
2. Assert `registry.has('parallel')` returns true
3. Create node with `shape='component'`
4. Assert `registry.resolve(node)` returns ParallelHandler instance
**Expected**: Handler registered and resolvable

---

### TC-016: Event emission (if implemented)
**Requirement**: REQ-016  
**Type**: Unit  
**Steps**:
1. Spy on event emitter
2. Execute parallel node with 2 branches
3. Assert `parallel_start` event emitted
4. Assert 2 `parallel_branch_start` events emitted
5. Assert 2 `parallel_branch_complete` events emitted
6. Assert `parallel_complete` event emitted
**Expected**: All lifecycle events emitted with correct data

---

## Definition of Done

### Code Quality
- [ ] All implementation tasks completed
- [ ] Code follows project style conventions (consistent with CodergenHandler)
- [ ] No ESLint errors or warnings
- [ ] All exports use ES6 module syntax
- [ ] Error handling covers all edge cases
- [ ] Proper async/await usage throughout

### Testing
- [ ] All 16 test cases implemented and passing
- [ ] Integration test with DOT pipeline passes
- [ ] No regressions in existing test suite
- [ ] Code coverage > 85% for ParallelHandler class
- [ ] Concurrency tests verify max_parallel enforcement

### Documentation
- [ ] Parallel handler documented in `docs/parallel-handler.md`
- [ ] README.md updated with parallel handler reference
- [ ] PARTIAL_SUCCESS status documented
- [ ] Example pipeline created and tested
- [ ] JSDoc comments on all public methods
- [ ] Concurrency control approach documented

### Integration
- [ ] ParallelHandler registered in all entry points
- [ ] Works with existing pipeline engine
- [ ] Compatible with checkpoint/resume (if implemented)
- [ ] Log files follow existing conventions
- [ ] Context isolation verified

### Performance
- [ ] Parallel execution faster than sequential for I/O-bound tasks
- [ ] Concurrency limit respected under load
- [ ] No memory leaks with large branch counts
- [ ] Handler overhead < 50ms

### User Acceptance
- [ ] Can execute 3 parallel branches successfully
- [ ] Partial success status works correctly
- [ ] Concurrency limit enforced (tested with max_parallel=2)
- [ ] Branch failures isolated (one failure doesn't crash all)
- [ ] Example pipeline runs successfully
- [ ] Log output is clear and organized

---

## Estimated Total Effort

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Foundation | 3 tasks | 45 minutes |
| Phase 2: Core Logic | 3 tasks | 1 hour |
| Phase 3: Concurrency | 2 tasks | 1.25 hours |
| Phase 4: Branch Execution | 3 tasks | 1.75 hours |
| Phase 5: Aggregation | 4 tasks | 1.75 hours |
| Phase 6: Logging | 2 tasks | 45 minutes |
| Phase 7: Integration | 2 tasks | 35 minutes |
| Phase 8: Observability | 1 task | 30 minutes (optional) |
| Phase 9: Examples & Docs | 4 tasks | 1.75 hours |
| Phase 10: Testing | 3 tasks | 2.5 hours |
| **Total** | **27 tasks** | **~12 hours** |

---

## Implementation Order

1. ✅ **Foundation**: Add PARTIAL_SUCCESS status, verify context (TASK-001, TASK-002)
2. ✅ **Setup**: Create ParallelHandler file (TASK-003)
3. ✅ **Core Logic**: Edge discovery, config extraction, context isolation (TASK-004 to TASK-006)
4. ✅ **Concurrency**: Decide approach and implement limiter (TASK-007, TASK-008)
5. ✅ **Execution**: Branch execution logic (TASK-009 to TASK-011)
6. ✅ **Aggregation**: Result aggregation for all cases (TASK-012 to TASK-015)
7. ✅ **Logging**: Log directories and summary (TASK-016, TASK-017)
8. ✅ **Integration**: Register handler (TASK-018, TASK-019)
9. ✅ **Testing**: Write tests and verify (TASK-025 to TASK-027)
10. ✅ **Examples**: Create examples and docs (TASK-021 to TASK-024)
11. ✅ **Observability**: Add events (TASK-020) - optional

---

## Risk Mitigation

### Risk: Context isolation fails (shared references)
- **Impact**: High - branches could interfere with each other
- **Mitigation**: Write dedicated test (TC-006), use deep copy if needed

### Risk: Concurrency limiter doesn't work correctly
- **Impact**: High - could overwhelm system resources
- **Mitigation**: Dedicated test (TC-008), consider p-limit library (battle-tested)

### Risk: Promise.allSettled not available (Node.js < 12.9)
- **Impact**: Medium - would need polyfill or alternative
- **Mitigation**: Document minimum Node.js version (14+), use Promise.all with catch

### Risk: Memory issues with many branches
- **Impact**: Medium - large pipelines could exhaust memory
- **Mitigation**: Test with 50+ branches, add memory limits if needed

### Risk: PARTIAL_SUCCESS breaks existing code
- **Impact**: Low - new status shouldn't affect existing handlers
- **Mitigation**: Run full test suite, verify engine handles new status

### Risk: Event emission impacts performance
- **Impact**: Low - event overhead should be minimal
- **Mitigation**: Make events optional, benchmark with/without

---

## Alternative Approaches Considered

### Worker Threads vs Async/Await
- **Worker Threads**: True parallelism, better for CPU-bound tasks
- **Async/Await**: Simpler, better for I/O-bound tasks (LLM calls)
- **Decision**: Start with async/await (most pipeline tasks are I/O)

### Custom Semaphore vs p-limit
- **Custom**: No external dependency, full control
- **p-limit**: Battle-tested, well-documented, maintained
- **Decision**: Recommend p-limit unless strong reason against dependencies

### Wait-for-all vs Wait-for-any
- **Wait-for-all**: Current design, all branches must complete
- **Wait-for-any**: Could succeed as soon as one branch succeeds
- **Decision**: Wait-for-all for MVP, add mode attribute later if needed
