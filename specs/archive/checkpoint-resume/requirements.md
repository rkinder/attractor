# Requirements: Checkpoint Resume

## Technical Specifications

### REQ-CHK-001: Resume Method
**From Design**: FR-001  
**Description**: Add resume method to PipelineEngine.

**Acceptance Criteria**:
- [x] Add `async resume(runId, options)` method to PipelineEngine
- [x] Load checkpoint from `logsRoot/runId/checkpoint.json`
- [x] Reconstruct context from checkpoint
- [x] Continue execution from saved node
- [x] Return final result

---

### REQ-CHK-002: Attractor Resume Wrapper
**From Design**: FR-001  
**Description**: Expose resume through Attractor class.

**Acceptance Criteria**:
- [x] Add `attractor.resume(runId, options)` method
- [x] Delegate to engine.resume()
- [x] Support same options as run()

---

### REQ-CHK-003: Checkpoint Discovery
**From Design**: FR-002  
**Description**: List available checkpoints.

**Acceptance Criteria**:
- [x] Add `listCheckpoints(logsRoot)` static method
- [x] Return array of run IDs with checkpoints
- [x] Include checkpoint timestamp and completed nodes

---

### REQ-CHK-004: Checkpoint Validation
**From Design**: FR-003  
**Description**: Validate checkpoint before resume.

**Acceptance Criteria**:
- [x] Verify checkpoint JSON is valid
- [x] Verify required fields: timestamp, current_node, completed_nodes, context_values
- [x] Return false/incomplete if invalid
- [x] Throw descriptive error on resume with invalid checkpoint

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

- [x] Resume method implemented on PipelineEngine
- [x] Resume exposed on Attractor
- [x] Checkpoint discovery works
- [x] Validation prevents crashes
- [x] Test cases pass
