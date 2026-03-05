# Tasks: FanIn Handler

## Implementation Tasks

### Phase 1: Foundation & Code Reuse

#### TASK-001: Decide on variable expansion approach
- **Depends on**: None
- **Files**: None (decision/research)
- **Estimated**: 20 minutes
- **Description**: Determine how to reuse or extract `_expandVariables()` from CodergenHandler
- **Acceptance**: Decision documented with rationale, approach chosen

#### TASK-002: Extract or prepare variable expansion utility
- **Depends on**: TASK-001
- **Files**: `src/handlers/codergen.js`, possibly `src/utils/variables.js`
- **Estimated**: 30 minutes
- **Description**: Make variable expansion accessible to FanInHandler (extract to utility or copy method)
- **Acceptance**: FanInHandler can expand variables using same logic as CodergenHandler

#### TASK-003: Create FanInHandler class file
- **Depends on**: None
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 15 minutes
- **Description**: Create file with FanInHandler class skeleton extending Handler
- **Acceptance**: File exists, class exports, imports Handler and Outcome

---

### Phase 2: Edge Discovery & Data Collection

#### TASK-004: Implement incoming edge discovery
- **Depends on**: TASK-003
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 20 minutes
- **Description**: Get incoming edges from graph, extract source node IDs
- **Acceptance**: Returns array of source node IDs in edge order

#### TASK-005: Implement empty edge handling
- **Depends on**: TASK-004
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 10 minutes
- **Description**: Return immediate success if no incoming edges
- **Acceptance**: Returns `Outcome.success()` with appropriate note when no edges

#### TASK-006: Implement branch output collection
- **Depends on**: TASK-004
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 30 minutes
- **Description**: Read branch outputs from context using `<node_id>.output` keys
- **Acceptance**: Collects available outputs, skips missing with warning, preserves order

---

### Phase 3: Prompt Construction

#### TASK-007: Implement base prompt extraction and expansion
- **Depends on**: TASK-002, TASK-006
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 25 minutes
- **Description**: Extract node prompt (or use default), expand variables
- **Acceptance**: Prompt extracted, variables expanded, defaults to consolidation prompt

#### TASK-008: Implement branch results formatting
- **Depends on**: TASK-006, TASK-007
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 30 minutes
- **Description**: Format all branch results with "## Result N (from nodeId)" headers
- **Acceptance**: All results formatted correctly with headers, preserved order

#### TASK-009: Implement default consolidation instruction
- **Depends on**: TASK-007, TASK-008
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 15 minutes
- **Description**: Check for "consolidate" keyword, append default instruction if missing
- **Acceptance**: Adds default instruction when needed, skips when present

---

### Phase 4: Logging

#### TASK-010: Implement stage directory creation
- **Depends on**: TASK-003
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 10 minutes
- **Description**: Create stage log directory with recursive option
- **Acceptance**: Directory created at `<logsRoot>/<node.id>` with error handling

#### TASK-011: Implement prompt logging
- **Depends on**: TASK-009, TASK-010
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 10 minutes
- **Description**: Write constructed prompt to `prompt.md`
- **Acceptance**: Full prompt written before LLM invocation

---

### Phase 5: LLM Integration

#### TASK-012: Implement backend invocation logic
- **Depends on**: TASK-009, TASK-011
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 30 minutes
- **Description**: Call backend.run() with prompt, handle both string and Outcome returns
- **Acceptance**: Backend invoked correctly, response extracted regardless of return type

#### TASK-013: Implement success handling
- **Depends on**: TASK-012
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 25 minutes
- **Description**: Write response to log, store in context, return success outcome
- **Acceptance**: Response logged, context updated with `<node_id>.output`, success returned

#### TASK-014: Implement backend error handling
- **Depends on**: TASK-012
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 20 minutes
- **Description**: Catch backend exceptions, write error log, return failure outcome
- **Acceptance**: Errors caught, logged to error.txt, failure outcome returned

#### TASK-015: Implement simulation mode
- **Depends on**: TASK-010
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 15 minutes
- **Description**: Generate simulated response when backend is null
- **Acceptance**: Simulated message generated, logged, success returned

---

### Phase 6: Metadata & Context

#### TASK-016: Implement branch count tracking
- **Depends on**: TASK-006, TASK-013
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 15 minutes
- **Description**: Track and store branch count in outcome notes and context
- **Acceptance**: Count included in notes, stored in `fanin.branch_count` context key

#### TASK-017: Implement outcome logging
- **Depends on**: TASK-013, TASK-014, TASK-015
- **Files**: `src/handlers/fanin.js`
- **Estimated**: 15 minutes
- **Description**: Write outcome status to `outcome.json` with metadata
- **Acceptance**: Outcome file created with status, notes, timestamp, branch count

---

### Phase 7: Integration

#### TASK-018: Register FanInHandler in engine
- **Depends on**: TASK-003
- **Files**: `src/pipeline/engine.js` or `src/index.js`
- **Estimated**: 20 minutes
- **Description**: Instantiate FanInHandler with backend, register with key `parallel.fan_in`
- **Acceptance**: Handler registered, `registry.has('parallel.fan_in')` returns true

#### TASK-019: Update engine initialization in entry points
- **Depends on**: TASK-018
- **Files**: `run-workflow.js`, `run-with-kilo.js`, `run-with-gateway.js`
- **Estimated**: 15 minutes
- **Description**: Ensure FanInHandler registered in all CLI runners
- **Acceptance**: FanIn handler available when running from any entry point

---

### Phase 8: Examples and Documentation

#### TASK-020: Create fanin handler example pipeline
- **Depends on**: TASK-018
- **Files**: `examples/fanin-workflow.dot`
- **Estimated**: 40 minutes
- **Description**: Create DOT file with parallel → branches → fanin → next step pattern
- **Acceptance**: Pipeline executes successfully with fanin consolidation

#### TASK-021: Create fanin handler runner script
- **Depends on**: TASK-020
- **Files**: `examples/run-fanin-example.js`
- **Estimated**: 15 minutes
- **Description**: Create Node.js script to run fanin workflow example
- **Acceptance**: Script successfully executes fanin-workflow.dot

#### TASK-022: Add fanin handler documentation
- **Depends on**: TASK-020
- **Files**: `docs/fanin-handler.md`
- **Estimated**: 45 minutes
- **Description**: Document fanin handler attributes, usage with parallel handler, examples
- **Acceptance**: Documentation includes prompt construction, consolidation patterns, examples

#### TASK-023: Update main README with fanin handler
- **Depends on**: TASK-022
- **Files**: `README.md`
- **Estimated**: 10 minutes
- **Description**: Add fanin handler to feature list and node types table
- **Acceptance**: README mentions tripleoctagon shape maps to branch consolidation

---

### Phase 9: Testing

#### TASK-024: Create unit tests for FanInHandler
- **Depends on**: TASK-017
- **Files**: `test/fanin-handler.test.js`
- **Estimated**: 90 minutes
- **Description**: Write unit tests for all requirements (see test cases below)
- **Acceptance**: All 14 test cases pass

#### TASK-025: Create integration test with parallel → fanin pipeline
- **Depends on**: TASK-019, TASK-024
- **Files**: `test/integration/parallel-fanin-pipeline.test.js`
- **Estimated**: 45 minutes
- **Description**: End-to-end test with parallel branches feeding into fanin consolidation
- **Acceptance**: Pipeline executes, branches run in parallel, fanin consolidates correctly

#### TASK-026: Run existing test suite
- **Depends on**: TASK-019
- **Files**: None (validation only)
- **Estimated**: 10 minutes
- **Description**: Execute existing tests to ensure no regressions
- **Acceptance**: All existing tests pass

---

## Test Cases

### TC-001: FanInHandler class exists
**Requirement**: REQ-001  
**Type**: Unit  
**Steps**:
1. Import FanInHandler from `src/handlers/fanin.js`
2. Assert class is exported
3. Assert extends Handler base class
4. Assert constructor accepts backend parameter
**Expected**: Class imported successfully, inheritance correct

---

### TC-002: Incoming edge discovery
**Requirement**: REQ-002  
**Type**: Unit  
**Steps**:
1. Create graph with 3 nodes pointing to fanin node
2. Create fanin node
3. Call `handler.execute()`
4. Assert handler identifies all 3 source nodes
**Expected**: All incoming edges discovered in correct order

---

### TC-003: Empty incoming edges handling
**Requirement**: REQ-003  
**Type**: Unit  
**Steps**:
1. Create fanin node with no incoming edges
2. Call `handler.execute()`
3. Assert outcome.status === 'SUCCESS'
4. Assert notes includes "No branches to consolidate"
5. Assert no LLM invocation occurred
**Expected**: Immediate success without processing

---

### TC-004: Branch output collection
**Requirement**: REQ-004  
**Type**: Unit  
**Steps**:
1. Create fanin node with 3 incoming edges
2. Set context values: `branch1.output="A"`, `branch2.output="B"`, `branch3.output="C"`
3. Call `handler.execute()`
4. Assert all 3 outputs collected
5. Assert outputs appear in prompt
**Expected**: All outputs collected and included in consolidation

---

### TC-005: Missing branch output handling
**Requirement**: REQ-004  
**Type**: Unit  
**Steps**:
1. Create fanin node with 3 incoming edges
2. Set only 2 context values: `branch1.output="A"`, `branch3.output="C"`
3. Spy on console.warn or event emission
4. Call `handler.execute()`
5. Assert warning logged for missing branch2
6. Assert execution continues with 2 results
**Expected**: Warning logged, continues with available data

---

### TC-006: Base prompt extraction and variable expansion
**Requirement**: REQ-005  
**Type**: Unit  
**Steps**:
1. Set graph.goal = "Test Goal"
2. Create fanin node with prompt = "Consolidate: $goal"
3. Call `handler.execute()`
4. Assert prompt includes "Consolidate: Test Goal"
**Expected**: Variables expanded correctly

---

### TC-007: Branch results formatting
**Requirement**: REQ-006  
**Type**: Unit  
**Steps**:
1. Create fanin node with 2 branches
2. Set `branch1.output="Result A"`, `branch2.output="Result B"`
3. Call `handler.execute()`
4. Read written prompt from `prompt.md`
5. Assert contains "## Result 1 (from branch1)"
6. Assert contains "Result A"
7. Assert contains "## Result 2 (from branch2)"
8. Assert contains "Result B"
**Expected**: All results formatted with headers

---

### TC-008: Default consolidation instruction
**Requirement**: REQ-007  
**Type**: Unit  
**Steps**:
1. Create fanin node with prompt = "Analyze these results"
2. Call `handler.execute()`
3. Assert prompt ends with "Consolidate these results into a unified summary."
**Expected**: Default instruction appended

**Steps (no append needed)**:
1. Create fanin node with prompt = "Consolidate and analyze"
2. Call `handler.execute()`
3. Assert prompt does NOT contain duplicate consolidation instruction
**Expected**: No duplication when "consolidate" present

---

### TC-009: Log file creation
**Requirement**: REQ-008, REQ-009, REQ-017  
**Type**: Unit  
**Steps**:
1. Call `handler.execute()` with mock backend
2. Assert stage directory created at `<logsRoot>/<node.id>`
3. Assert `prompt.md` file exists
4. Assert `response.md` file exists
5. Assert `outcome.json` file exists
6. Assert all files contain valid content
**Expected**: All log files created correctly

---

### TC-010: LLM backend invocation and success
**Requirement**: REQ-010, REQ-011, REQ-014  
**Type**: Unit  
**Steps**:
1. Mock backend to return "Consolidated summary"
2. Create fanin node with 3 branches
3. Call `handler.execute()`
4. Assert backend invoked with correct prompt
5. Assert outcome.status === 'SUCCESS'
6. Assert context has `<node_id>.output` = "Consolidated summary"
7. Assert notes includes "Consolidated 3 branch results"
**Expected**: Backend called, success returned, context updated

---

### TC-011: Backend error handling
**Requirement**: REQ-012  
**Type**: Unit  
**Steps**:
1. Mock backend to throw Error("LLM timeout")
2. Call `handler.execute()`
3. Assert outcome.status === 'FAIL'
4. Assert failureReason includes "LLM timeout"
5. Assert error.txt file created with stack trace
**Expected**: Error caught, failure outcome returned

---

### TC-012: Simulation mode
**Requirement**: REQ-013, REQ-014  
**Type**: Unit  
**Steps**:
1. Create FanInHandler with backend=null
2. Create fanin node with 2 branches
3. Call `handler.execute()`
4. Assert outcome.status === 'SUCCESS'
5. Assert response includes "[Simulated consolidation of 2 results]"
6. Assert context has `<node_id>.output` with simulated response
7. Assert notes includes "Simulated consolidation"
**Expected**: Simulation response generated, success returned

---

### TC-013: Handler registration
**Requirement**: REQ-015  
**Type**: Integration  
**Steps**:
1. Import and initialize engine with handler registry
2. Assert `registry.has('parallel.fan_in')` returns true
3. Create node with `shape='tripleoctagon'`
4. Assert `registry.resolve(node)` returns FanInHandler instance
**Expected**: Handler registered and resolvable

---

### TC-014: Variable expansion compatibility
**Requirement**: REQ-016  
**Type**: Unit  
**Steps**:
1. Set context values: `last_response="previous"`, `branch1.output="data"`
2. Create fanin node with prompt = "Use $last_response and $branch1.output"
3. Call `handler.execute()`
4. Assert prompt includes "Use previous and data"
**Expected**: Same variable patterns as CodergenHandler work

---

## Definition of Done

### Code Quality
- [ ] All implementation tasks completed
- [ ] Code follows project style conventions (consistent with CodergenHandler)
- [ ] No ESLint errors or warnings
- [ ] All exports use ES6 module syntax
- [ ] Error handling covers all edge cases
- [ ] Variable expansion reuses existing logic (no duplication)

### Testing
- [ ] All 14 test cases implemented and passing
- [ ] Integration test with parallel → fanin pipeline passes
- [ ] No regressions in existing test suite
- [ ] Code coverage > 85% for FanInHandler class
- [ ] Missing output handling verified

### Documentation
- [ ] FanIn handler documented in `docs/fanin-handler.md`
- [ ] README.md updated with fanin handler reference
- [ ] Example pipeline created and tested
- [ ] JSDoc comments on all public methods
- [ ] Consolidation patterns documented
- [ ] Integration with parallel handler explained

### Integration
- [ ] FanInHandler registered in all entry points
- [ ] Works with existing pipeline engine
- [ ] Compatible with CodergenHandler backend interface
- [ ] Log files follow existing conventions
- [ ] Variable expansion consistent with CodergenHandler

### User Acceptance
- [ ] Can consolidate 3 parallel branch results
- [ ] Missing branch outputs handled gracefully
- [ ] LLM generates meaningful consolidations
- [ ] Simulation mode works for testing
- [ ] Example pipeline runs successfully
- [ ] Log output is clear and organized

---

## Estimated Total Effort

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Foundation | 3 tasks | 1 hour |
| Phase 2: Data Collection | 3 tasks | 1 hour |
| Phase 3: Prompt Construction | 3 tasks | 1.25 hours |
| Phase 4: Logging | 2 tasks | 20 minutes |
| Phase 5: LLM Integration | 4 tasks | 1.5 hours |
| Phase 6: Metadata | 2 tasks | 30 minutes |
| Phase 7: Integration | 2 tasks | 35 minutes |
| Phase 8: Examples & Docs | 4 tasks | 1.75 hours |
| Phase 9: Testing | 3 tasks | 2.5 hours |
| **Total** | **26 tasks** | **~10.5 hours** |

---

## Implementation Order

1. ✅ **Foundation**: Decide on variable expansion, prepare utilities (TASK-001, TASK-002)
2. ✅ **Setup**: Create FanInHandler file (TASK-003)
3. ✅ **Data Collection**: Edge discovery, output collection (TASK-004 to TASK-006)
4. ✅ **Prompt Building**: Extract prompt, format branches, add defaults (TASK-007 to TASK-009)
5. ✅ **Logging**: Create directories, write logs (TASK-010, TASK-011)
6. ✅ **LLM Integration**: Backend invocation, error handling, simulation (TASK-012 to TASK-015)
7. ✅ **Metadata**: Branch counting, outcome logging (TASK-016, TASK-017)
8. ✅ **Integration**: Register handler (TASK-018, TASK-019)
9. ✅ **Testing**: Write tests and verify (TASK-024 to TASK-026)
10. ✅ **Examples**: Create examples and docs (TASK-020 to TASK-023)

---

## Risk Mitigation

### Risk: Variable expansion logic diverges from CodergenHandler
- **Impact**: High - inconsistent behavior confuses users
- **Mitigation**: Extract to shared utility (TASK-001, TASK-002), write test (TC-014)

### Risk: Missing branch outputs cause failures
- **Impact**: Medium - could break valid use cases
- **Mitigation**: Graceful degradation (REQ-004), dedicated test (TC-005)

### Risk: Large prompts exceed LLM context window
- **Impact**: Medium - consolidation fails silently
- **Mitigation**: Document limits (NFR-002), add prompt size warnings

### Risk: Backend interface incompatibility
- **Impact**: High - handler doesn't work with existing backends
- **Mitigation**: Use same interface as CodergenHandler, integration test (TC-013)

### Risk: Consolidation quality depends on LLM
- **Impact**: Low - not a code issue but user expectation management
- **Mitigation**: Document best practices for consolidation prompts

### Risk: Breaking changes to handler registry
- **Impact**: Low - registry already has mapping
- **Mitigation**: Verify registration in tests (TC-013)

---

## Code Reuse Strategy

### Variable Expansion Options

**Option A: Extract to Shared Utility** (Recommended)
```javascript
// src/utils/variables.js
export function expandVariables(text, graph, context) {
  // Extracted from CodergenHandler._expandVariables()
}

// src/handlers/fanin.js
import { expandVariables } from '../utils/variables.js';
```

**Pros**: Single source of truth, DRY principle
**Cons**: Refactoring existing code

---

**Option B: Copy Method**
```javascript
// src/handlers/fanin.js
class FanInHandler extends Handler {
  _expandVariables(text, graph, context) {
    // Copied from CodergenHandler
  }
}
```

**Pros**: No refactoring, quick implementation
**Cons**: Code duplication, maintenance burden

---

**Option C: Composition**
```javascript
// src/handlers/fanin.js
import { CodergenHandler } from './codergen.js';

class FanInHandler extends Handler {
  constructor(backend) {
    super();
    this.backend = backend;
    this.codergenHelper = new CodergenHandler(backend);
  }
  
  async execute(node, context, graph, logsRoot) {
    const prompt = this.codergenHelper._expandVariables(basePrompt, graph, context);
  }
}
```

**Pros**: Reuses existing code without duplication
**Cons**: Dependency on CodergenHandler, accessing private method

---

## Alternative Approaches Considered

### Consolidation Without LLM
- **Option**: Simple string concatenation or JSON merge
- **Pros**: Faster, deterministic, no LLM costs
- **Cons**: No intelligent synthesis, loses key benefit
- **Decision**: Always use LLM for MVP (matches Python)

### Template-Based Consolidation
- **Option**: User-provided templates for formatting
- **Pros**: More control over consolidation style
- **Cons**: Complexity, harder to use
- **Decision**: Fixed format for MVP, consider later

### Streaming Consolidation
- **Option**: Stream LLM response as it generates
- **Pros**: Faster perceived latency, better UX
- **Cons**: Complex implementation, backend support needed
- **Decision**: Buffer full response for MVP
