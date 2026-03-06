# Requirements: Critical Bug Fixes

## Technical Specifications

### REQ-BUG-001: Register FanInHandler
**From Design**: FR-001  
**Description**: Register FanInHandler in `_setupDefaultHandlers()` to enable `tripleoctagon` shaped nodes.

**Acceptance Criteria**:
- [ ] Add `FanInHandler` import to `src/index.js`
- [ ] Register handler with key `'parallel.fan_in'` in `_setupDefaultHandlers()`
- [ ] Verify `registry.has('parallel.fan_in')` returns true after initialization
- [ ] Test: Run a workflow with `shape=tripleoctagon` node and verify it executes

---

### REQ-BUG-002: Fix Entry Point Guards
**From Design**: FR-002  
**Description**: Fix entry point guard pattern in example runner scripts.

**Acceptance Criteria**:
- [ ] Fix `examples/run-parallel-example.js` - change to `import.meta.url === \`file://${process.argv[1]}\``
- [ ] Fix `examples/run-fanin-example.js` - change to `import.meta.url === \`file://${process.argv[1]}\``
- [ ] Fix `examples/run-tool-example.js` - change to `import.meta.url === \`file://${process.argv[1]}\``
- [ ] Verify each script runs directly with `node examples/run-*.js`

---

### REQ-BUG-003: Fix run-with-kilo.js Handler Registration
**From Design**: FR-003  
**Description**: Fix run-with-kilo.js to properly register all handlers.

**Acceptance Criteria**:
- [ ] Option A: Change `new Attractor()` to `await Attractor.create()`
- [ ] Option B: Manually register all handlers (start, exit, conditional, wait.human, tool, parallel, stack.manager_loop, mcp)
- [ ] Verify: Run a workflow with human gate node and verify it works

---

### REQ-BUG-004: Fix run-workflow.js Property Reference
**From Design**: FR-004  
**Description**: Fix incorrect property reference from `outcome.message` to `outcome.notes`.

**Acceptance Criteria**:
- [ ] Find all references to `outcome.message` in `run-workflow.js`
- [ ] Change to `outcome.notes`
- [ ] Verify: Run a workflow and check outcome display works

---

### REQ-BUG-005: Remove Non-existent Event Listener
**From Design**: FR-005  
**Description**: Remove listener for `human_input_required` event.

**Acceptance Criteria**:
- [ ] Find `human_input_required` event listener in `run-workflow.js`
- [ ] Remove the listener registration
- [ ] Verify: No errors related to missing event

---

### REQ-BUG-006: Align Parallel/FanIn Context Keys
**From Design**: FR-006  
**Description**: Fix context key mismatch between ParallelHandler and FanInHandler.

**Acceptance Criteria**:
- [ ] Analyze what ParallelHandler stores in context (currently `parallel.branches.<id>.*`)
- [ ] Analyze what FanInHandler expects (currently `<nodeId>.output`)
- [ ] Option A: Modify ParallelHandler to also store `${nodeId}.output` keys
- [ ] Option B: Modify FanInHandler to look for `parallel.branches.<id>.last_response`
- [ ] Test: Run parallel+fanin workflow and verify consolidation works

---

## Interface Contracts

### Context Keys After Fix

| Key | Type | Description | Written By |
|-----|------|-------------|------------|
| `parallel.results` | string (JSON) | Aggregate branch results | ParallelHandler |
| `parallel.branches.<id>.output` | string | Branch output | ParallelHandler |
| `<nodeId>.output` | string | Individual branch output for FanIn | ParallelHandler |
| `parallel.success_count` | number | Successful branches | ParallelHandler |
| `parallel.fail_count` | number | Failed branches | ParallelHandler |
| `parallel.total_count` | number | Total branches | ParallelHandler |

---

## Test Cases

### TC-BUG-001: FanInHandler Registration
1. Create a workflow with `shape=tripleoctagon` node
2. Execute the workflow
3. **Expected**: Node executes without "No handler found" error
4. **Expected**: Consolidation prompt is sent to LLM (or simulated)

### TC-BUG-002: Example Entry Point
1. Run `node examples/run-parallel-example.js` directly
2. **Expected**: Script executes (may fail on LLM call, but entry point works)

### TC-BUG-003: run-with-kilo.js Human Gate
1. Run a workflow with human approval gate using run-with-kilo.js
2. **Expected**: Human handler is invoked (not "No handler found")

### TC-BUG-004: run-workflow.js Outcome Display
1. Run any workflow via run-workflow.js
2. **Expected**: Outcome notes display correctly (no undefined)

### TC-BUG-005: Parallel+FanIn Workflow
1. Run examples/fanin-workflow.dot
2. **Expected**: FanIn node receives branch outputs and consolidates them
3. **Expected**: Consolidation produces meaningful output

---

## Traceability Matrix

| Requirement | Bug ID | Test Case |
|-------------|--------|-----------|
| REQ-BUG-001 | BUG-001 | TC-BUG-001 |
| REQ-BUG-002 | BUG-002 | TC-BUG-002 |
| REQ-BUG-003 | BUG-003 | TC-BUG-003 |
| REQ-BUG-004 | BUG-004 | TC-BUG-004 |
| REQ-BUG-005 | BUG-005 | TC-BUG-004 |
| REQ-BUG-006 | BUG-006 | TC-BUG-005 |

---

## Definition of Done

- [ ] All 6 bugs are fixed in source code
- [ ] All 5 test cases pass
- [ ] No regressions in existing tests
- [ ] Code changes follow project style conventions
