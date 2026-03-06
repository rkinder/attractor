# Tasks: Checkpoint Resume

## Implementation Checklist

### Task 1: Analyze Checkpoint Structure
- [ ] **1.1** Read `src/pipeline/engine.js` - find `_saveCheckpoint()` and `_createCheckpoint()`
- [ ] **1.2** Read checkpoint files in `logs/` to understand structure
- [ ] **Estimated**: 30 minutes

### Task 2: Implement Resume Method on PipelineEngine
- [ ] **2.1** Add `async resume(runId, options)` method
- [ ] **2.2** Load checkpoint JSON from file
- [ ] **2.3** Reconstruct context from `context_values`
- [ ] **2.4** Find current node from checkpoint
- [ ] **2.5** Continue execution from that point
- [ ] **Estimated**: 2 hours

### Task 3: Expose Resume on Attractor
- [ ] **3.1** Add `attractor.resume(runId, options)` method
- [ ] **3.2** Delegate to engine.resume()
- [ ] **Estimated**: 30 minutes

### Task 4: Implement Checkpoint Discovery
- [ ] **4.1** Add `PipelineEngine.listCheckpoints(logsRoot)` static method
- [ ] **4.2** Scan logs directory for run-* folders
- [ ] **4.3** Check for checkpoint.json in each
- [ ] **4.4** Return metadata
- [ ] **Estimated**: 1 hour

### Task 5: Add Validation
- [ ] **5.1** Validate checkpoint JSON structure
- [ ] **5.2** Check required fields exist
- [ ] **5.3** Throw descriptive errors
- [ ] **Estimated**: 30 minutes

### Task 6: Testing
- [ ] **6.1** Create test that fails midway, then resumes
- [ ] **6.2** Test with invalid run ID
- [ ] **6.3** Test listCheckpoints
- [ ] **Estimated**: 1 hour

---

## Total Estimated Effort

| Task | Hours |
|------|-------|
| Task 1 | 0.5 |
| Task 2 | 2.0 |
| Task 3 | 0.5 |
| Task 4 | 1.0 |
| Task 5 | 0.5 |
| Task 6 | 1.0 |
| **Total** | **~5.5 hours** |
