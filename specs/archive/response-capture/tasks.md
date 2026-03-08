# Tasks: LLM Response Capture Bug Fix

## Implementation Checklist

### Task 1: Debug the Response Flow
- [ ] **1.1** Add debug logging to SessionBackend.run() to show return value
- [ ] **1.2** Add debug logging in CodergenHandler before writing response.md
- [ ] **1.3** Run test and identify where response becomes empty
- [ ] **Estimated**: 30 minutes

### Task 2: Fix Response Capture
- [ ] **2.1** Based on debug output, fix the issue in SessionBackend or CodergenHandler
- [ ] **2.2** Ensure full response written to response.md
- [ ] **2.3** Ensure last_response stored in context
- [ ] **Estimated**: 1 hour

### Task 3: Test with LM Studio
- [ ] **3.1** Run parallel-workflow.dot
- [ ] **3.2** Check response.md files have content
- [ ] **3.3** Check status.json last_response populated
- [ ] **Estimated**: 30 minutes

### Task 4: Verify Simulation Mode
- [ ] **4.1** Run with simulation mode (no LLM)
- [ ] **4.2** Verify response.md shows simulation text
- [ ] **Estimated**: 15 minutes

### Task 5: Cleanup
- [ ] **5.1** Remove debug logging
- [ ] **5.2** Final verification
- [ ] **Estimated**: 15 minutes

---

## Total Estimated Effort

| Task | Hours |
|------|-------|
| Task 1 | 0.5 |
| Task 2 | 1.0 |
| Task 3 | 0.5 |
| Task 4 | 0.25 |
| Task 5 | 0.25 |
| **Total** | **~2.5 hours** |

---

## Dependencies

- None - all internal to existing files

---

## Notes

- Start with debug logging to understand exactly where the response is lost
- The fix might be in SessionBackend.run() return value, or in how CodergenHandler processes it
