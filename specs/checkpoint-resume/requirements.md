# Requirements: Checkpoint Resume

## Technical Specifications

### REQ-CHK-001: Resume Method
**From Design**: FR-001  
**Description**: Add resume method to PipelineEngine.

**Acceptance Criteria**:
- [ ] Add `async resume(runId, options)` method to PipelineEngine
- [ ] Load checkpoint from `logsRoot/runId/checkpoint.json`
- [ ] Reconstruct context from checkpoint
- [ ] Continue execution from saved node
- [ ] Return final result

---

### REQ-CHK-002: Attractor Resume Wrapper
**From Design**: FR-001  
**Description**: Expose resume through Attractor class.

**Acceptance Criteria**:
- [ ] Add `attractor.resume(runId, options)` method
- [ ] Delegate to engine.resume()
- [ ] Support same options as run()

---

### REQ-CHK-003: Checkpoint Discovery
**From Design**: FR-002  
**Description**: List available checkpoints.

**Acceptance Criteria**:
- [ ] Add `listCheckpoints(logsRoot)` static method
- [ ] Return array of run IDs with checkpoints
- [ ] Include checkpoint timestamp and completed nodes

---

### REQ-CHK-004: Checkpoint Validation
**From Design**: FR-003  
**Description**: Validate checkpoint before resume.

**Acceptance Criteria**:
- [ ] Verify checkpoint JSON is valid
- [ ] Verify required fields: timestamp, current_node, completed_nodes, context_values
- [ ] Return false/incomplete if invalid
- [ ] Throw descriptive error on resume with invalid checkpoint

---

## Interface Contracts

### Resume Method Signature

```javascript
// PipelineEngine
async resume(runId: string, options?: {
  dotFilePath?: string,
  logsRoot?: string
}): Promise<{
  success: boolean,
  finalNode: string,
  completedNodes: string[],
  finalOutcome: Outcome,
  resumedFrom: string  // checkpoint timestamp
}>

// Attractor
async resume(runId: string, options?: {
  dotFilePath?: string
}): Promise<...>
```

### Checkpoint Structure (Existing)

```javascript
{
  timestamp: "2026-03-05T10:30:00.000Z",
  current_node: "analyze",
  completed_nodes: ["start", "analyze"],
  context_values: { ... },
  logs: [...]
}
```

---

## Test Cases

### TC-CHK-001: Resume After Failure
1. Run workflow that fails midway
2. Note the run ID from logs
3. Call attractor.resume(runId)
4. **Expected**: Execution continues from failed node

### TC-CHK-002: Resume Completed Workflow
1. Run workflow that completes successfully
2. Call resume on same run ID
3. **Expected**: Return "already completed" or re-run option

### TC-CHK-003: Invalid Checkpoint
1. Call resume with non-existent run ID
2. **Expected**: Descriptive error

---

## Definition of Done

- [ ] Resume method implemented on PipelineEngine
- [ ] Resume exposed on Attractor
- [ ] Checkpoint discovery works
- [ ] Validation prevents crashes
- [ ] Test cases pass
