# Tasks: Tool Handler

## Implementation Tasks

### Phase 1: Core Handler Implementation

#### TASK-001: Create ToolHandler class file
- **Depends on**: None
- **Files**: `src/handlers/tool.js`
- **Estimated**: 30 minutes
- **Description**: Create new file with ToolHandler class skeleton extending Handler base class
- **Acceptance**: File exists, class exports, imports Handler and Outcome

#### TASK-002: Implement attribute extraction and validation
- **Depends on**: TASK-001
- **Files**: `src/handlers/tool.js`
- **Estimated**: 15 minutes
- **Description**: Extract `tool_command` and `timeout` from node attributes, validate command presence
- **Acceptance**: Returns Outcome.fail() if tool_command missing, defaults timeout to 30000ms

#### TASK-003: Implement command execution logic
- **Depends on**: TASK-002
- **Files**: `src/handlers/tool.js`
- **Estimated**: 45 minutes
- **Description**: Use `util.promisify(child_process.exec)` to execute command with timeout
- **Acceptance**: Command executes, timeout enforced, stdout/stderr captured

#### TASK-004: Implement success path (exit code 0)
- **Depends on**: TASK-003
- **Files**: `src/handlers/tool.js`
- **Estimated**: 20 minutes
- **Description**: Handle successful command execution, return Outcome.success with tool.output context
- **Acceptance**: Returns success outcome with stdout in context

#### TASK-005: Implement failure path (non-zero exit)
- **Depends on**: TASK-003
- **Files**: `src/handlers/tool.js`
- **Estimated**: 20 minutes
- **Description**: Handle command failures, extract exit code and stderr, return Outcome.fail
- **Acceptance**: Returns fail outcome with exit code and stderr in failure reason

#### TASK-006: Implement timeout handling
- **Depends on**: TASK-003
- **Files**: `src/handlers/tool.js`
- **Estimated**: 15 minutes
- **Description**: Detect timeout errors (error.killed or error.code === 'ETIMEDOUT'), return specific message
- **Acceptance**: Timeout errors return "Command timed out after Xms" message

#### TASK-007: Implement logging to stage directory
- **Depends on**: TASK-003, TASK-004, TASK-005
- **Files**: `src/handlers/tool.js`
- **Estimated**: 30 minutes
- **Description**: Create stage directory, write command.txt, stdout.txt, stderr.txt, exit-code.txt, outcome.json
- **Acceptance**: All log files created with correct content

---

### Phase 2: Integration

#### TASK-008: Register ToolHandler in engine
- **Depends on**: TASK-001
- **Files**: `src/pipeline/engine.js` or `src/index.js`
- **Estimated**: 10 minutes
- **Description**: Import ToolHandler and register with handler registry using key 'tool'
- **Acceptance**: registry.has('tool') returns true after initialization

#### TASK-009: Update engine initialization in main entry points
- **Depends on**: TASK-008
- **Files**: `run-workflow.js`, `run-with-kilo.js`, `run-with-gateway.js`
- **Estimated**: 15 minutes
- **Description**: Ensure ToolHandler is registered in all CLI runners
- **Acceptance**: Tool handler available when running pipelines from any entry point

---

### Phase 3: Examples and Documentation

#### TASK-010: Create tool handler example pipeline
- **Depends on**: TASK-008
- **Files**: `examples/tool-workflow.dot`
- **Estimated**: 20 minutes
- **Description**: Create DOT file with tool nodes demonstrating basic usage (ls, echo, npm commands)
- **Acceptance**: Pipeline executes successfully with tool nodes

#### TASK-011: Create tool handler runner script
- **Depends on**: TASK-010
- **Files**: `examples/run-tool-example.js`
- **Estimated**: 15 minutes
- **Description**: Create Node.js script to run tool workflow example
- **Acceptance**: Script successfully executes tool-workflow.dot

#### TASK-012: Add tool handler documentation
- **Depends on**: TASK-010
- **Files**: `docs/tool-handler.md`
- **Estimated**: 30 minutes
- **Description**: Document tool handler attributes, usage, security considerations, examples
- **Acceptance**: Documentation includes all node attributes, error scenarios, platform differences

#### TASK-013: Update main README with tool handler
- **Depends on**: TASK-012
- **Files**: `README.md`
- **Estimated**: 10 minutes
- **Description**: Add tool handler to feature list and node types table
- **Acceptance**: README mentions parallelogram shape maps to tool execution

---

### Phase 4: Testing

#### TASK-014: Create unit tests for ToolHandler
- **Depends on**: TASK-007
- **Files**: `test/tool-handler.test.js`
- **Estimated**: 60 minutes
- **Description**: Write unit tests for all requirements (see test cases below)
- **Acceptance**: All 11 test cases pass

#### TASK-015: Create integration test with pipeline
- **Depends on**: TASK-009, TASK-014
- **Files**: `test/integration/tool-pipeline.test.js`
- **Estimated**: 30 minutes
- **Description**: End-to-end test running a DOT pipeline with tool nodes
- **Acceptance**: Pipeline with tool nodes executes successfully in test

#### TASK-016: Run existing test suite
- **Depends on**: TASK-009
- **Files**: None (validation only)
- **Estimated**: 10 minutes
- **Description**: Execute existing tests to ensure no regressions
- **Acceptance**: All existing tests pass

---

## Test Cases

### TC-001: Execute successful command (echo)
**Requirement**: REQ-001, REQ-005  
**Type**: Unit  
**Steps**:
1. Create node with `tool_command="echo 'Hello World'"`
2. Call `handler.execute(node, context, graph, logsRoot)`
3. Assert outcome.status === 'SUCCESS'
4. Assert context contains `tool.output` with "Hello World"
**Expected**: Success outcome with correct output

---

### TC-002: Execute successful command (ls)
**Requirement**: REQ-005  
**Type**: Unit  
**Steps**:
1. Create node with `tool_command="ls"`
2. Call `handler.execute()`
3. Assert outcome.status === 'SUCCESS'
4. Assert `tool.output` contains file listings
**Expected**: Success outcome with directory listing

---

### TC-003: Missing tool_command validation
**Requirement**: REQ-002  
**Type**: Unit  
**Steps**:
1. Create node without `tool_command` attribute
2. Call `handler.execute()`
3. Assert outcome.status === 'FAIL'
4. Assert outcome.failureReason === "No tool_command specified"
**Expected**: Immediate failure without execution

---

### TC-004: Timeout default value
**Requirement**: REQ-003  
**Type**: Unit  
**Steps**:
1. Create node with `tool_command` but no `timeout` attribute
2. Mock exec to verify options
3. Assert timeout option is 30000ms
**Expected**: Default timeout applied

---

### TC-005: Command timeout enforcement
**Requirement**: REQ-004, REQ-008  
**Type**: Unit  
**Steps**:
1. Create node with `tool_command="sleep 5"` and `timeout=1000`
2. Call `handler.execute()`
3. Assert outcome.status === 'FAIL'
4. Assert outcome.failureReason includes "timed out after 1000ms"
**Expected**: Timeout failure with specific message

---

### TC-006: Timeout error detection
**Requirement**: REQ-008  
**Type**: Unit  
**Steps**:
1. Mock exec to throw error with `killed=true` or `code='ETIMEDOUT'`
2. Call `handler.execute()`
3. Assert failure reason mentions timeout
**Expected**: Timeout-specific error message

---

### TC-007: Non-zero exit code handling
**Requirement**: REQ-006  
**Type**: Unit  
**Steps**:
1. Create node with `tool_command="exit 1"`
2. Call `handler.execute()`
3. Assert outcome.status === 'FAIL'
4. Assert outcome.failureReason includes "Exit code 1"
**Expected**: Failure outcome with exit code

---

### TC-008: Stderr capture on failure
**Requirement**: REQ-006  
**Type**: Unit  
**Steps**:
1. Create node with command that writes to stderr and exits non-zero
2. Call `handler.execute()`
3. Assert outcome.failureReason includes stderr content
4. Assert stderr.txt file exists in stage directory
**Expected**: Stderr captured in outcome and log file

---

### TC-009: Log file creation
**Requirement**: REQ-007  
**Type**: Unit  
**Steps**:
1. Create node with `tool_command="echo test"`
2. Call `handler.execute()`
3. Assert stage directory created at `<logsRoot>/<node.id>`
4. Assert files exist: command.txt, stdout.txt, exit-code.txt, outcome.json
**Expected**: All log files created with correct content

---

### TC-010: Handler registration
**Requirement**: REQ-009  
**Type**: Integration  
**Steps**:
1. Import and initialize engine/registry
2. Check `registry.has('tool')` returns true
3. Create node with `shape='parallelogram'`
4. Assert `registry.resolve(node)` returns ToolHandler instance
**Expected**: Tool handler properly registered and resolvable

---

### TC-011: Variable expansion (optional)
**Requirement**: REQ-010  
**Type**: Unit (if implemented)  
**Steps**:
1. Set context variable `last_response="world"`
2. Create node with `tool_command="echo $last_response"`
3. Call `handler.execute()`
4. Assert output includes "world"
**Expected**: Variables expanded in command

---

## Definition of Done

### Code Quality
- [ ] All implementation tasks completed
- [ ] Code follows project style conventions (consistent with CodergenHandler)
- [ ] No ESLint errors or warnings
- [ ] All exports use ES6 module syntax
- [ ] Error handling covers all edge cases

### Testing
- [ ] All 11 test cases implemented and passing
- [ ] Integration test with DOT pipeline passes
- [ ] No regressions in existing test suite
- [ ] Code coverage > 90% for ToolHandler class

### Documentation
- [ ] Tool handler documented in `docs/tool-handler.md`
- [ ] README.md updated with tool handler reference
- [ ] Example pipeline created and tested
- [ ] JSDoc comments on all public methods
- [ ] Security considerations documented

### Integration
- [ ] ToolHandler registered in all entry points
- [ ] Works with existing pipeline engine
- [ ] Compatible with checkpoint/resume (if implemented)
- [ ] Log files follow existing conventions

### User Acceptance
- [ ] Can execute simple commands (echo, ls, pwd)
- [ ] Can run build tools (npm, make, etc.)
- [ ] Timeout enforcement works correctly
- [ ] Error messages are clear and actionable
- [ ] Example pipeline runs successfully

### Platform Compatibility
- [ ] Tested on Linux
- [ ] Tested on macOS (if available)
- [ ] Tested on Windows (if available)
- [ ] Platform-specific behaviors documented

---

## Estimated Total Effort

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Core Implementation | 7 tasks | 2.5 hours |
| Phase 2: Integration | 2 tasks | 25 minutes |
| Phase 3: Examples & Docs | 4 tasks | 1.25 hours |
| Phase 4: Testing | 3 tasks | 1.75 hours |
| **Total** | **16 tasks** | **~6 hours** |

---

## Implementation Order

1. ✅ **Setup**: Create file structure (TASK-001)
2. ✅ **Core Logic**: Implement validation and execution (TASK-002 through TASK-007)
3. ✅ **Integration**: Register handler (TASK-008, TASK-009)
4. ✅ **Testing**: Write unit tests (TASK-014)
5. ✅ **Validation**: Run tests and fix issues (TASK-016)
6. ✅ **Examples**: Create example pipeline (TASK-010, TASK-011)
7. ✅ **Documentation**: Write docs and update README (TASK-012, TASK-013)
8. ✅ **Final Testing**: Integration test (TASK-015)

---

## Risk Mitigation

### Risk: Platform-specific command differences
- **Impact**: High
- **Mitigation**: Document platform differences, use cross-platform commands in examples (echo vs Write-Host)

### Risk: Security concerns with shell execution
- **Impact**: High
- **Mitigation**: Document security implications clearly, recommend input validation

### Risk: Output buffer overflow (maxBuffer)
- **Impact**: Medium
- **Mitigation**: Set reasonable limit (1MB), document in error message when exceeded

### Risk: Zombie processes on timeout
- **Impact**: Medium
- **Mitigation**: Verify child_process.exec properly kills child on timeout

### Risk: Breaking existing pipelines
- **Impact**: Low
- **Mitigation**: Run full test suite after integration, handler is new (no existing usage)
