# Tasks: Error Class Hierarchy

## Implementation Checklist

### Task 1: Create Error Directory
- [ ] **1.1** Create `src/errors/` directory
- [ ] **1.2** Create `src/errors/index.js` barrel export
- [ ] **Estimated**: 15 minutes

### Task 2: Implement AttractorError
- [ ] **2.1** Create `src/errors/attractor-error.js`
- [ ] **2.2** Implement constructor with message, code, details
- [ ] **2.3** Set prototype correctly for Error inheritance
- [ ] **Estimated**: 30 minutes

### Task 3: Implement Specific Errors
- [ ] **3.1** Create `src/errors/validation-error.js` (extends AttractorError)
- [ ] **3.2** Create `src/errors/execution-error.js` (extends AttractorError)
- [ ] **3.3** Create `src/errors/provider-error.js` (extends AttractorError)
- [ ] **3.4** Create `src/errors/timeout-error.js` (extends AttractorError)
- [ ] **3.5** Create `src/errors/checkpoint-error.js` (extends AttractorError)
- [ ] **Estimated**: 1 hour

### Task 4: Export from Index
- [ ] **4.1** Add exports to `src/index.js`
- [ ] **4.2** Verify imports work
- [ ] **Estimated**: 15 minutes

### Task 5: Update Source to Use Errors (Optional/Future)
- [ ] **5.1** Consider where to use new error types
- [ ] **5.2** Don't break existing code
- [ ] **Estimated**: Future task

---

## Total Estimated Effort

| Task | Hours |
|------|-------|
| Task 1 | 0.25 |
| Task 2 | 0.5 |
| Task 3 | 1.0 |
| Task 4 | 0.25 |
| Task 5 | Future |
| **Total** | **~2 hours** |
