# Tasks: Safe Condition Evaluator

## Implementation Checklist

### Task 1: Analyze Current Implementation
- [ ] **1.1** Read `src/pipeline/engine.js` - find `_evaluateCondition()` at line ~331
- [ ] **1.2** Understand current replacement logic and eval() usage
- [ ] **Estimated**: 30 minutes

### Task 2: Implement Expression Parser
- [ ] **2.1** Create new method `_parseExpression()` (non-eval)
- [ ] **2.2** Implement tokenization (numbers, strings, operators, identifiers)
- [ ] **2.3** Implement recursive descent parser for expressions
- [ ] **2.4** Implement evaluator
- [ ] **Estimated**: 3 hours

### Task 3: Implement Context Variable Replacement
- [ ] **3.1** Pre-process condition string
- [ ] **3.2** Replace `outcome` with quoted value
- [ ] **3.3** Replace `context.<key>` with value
- [ ] **3.4** Replace bare `<key>` with value
- [ ] **Estimated**: 1 hour

### Task 4: Add Error Handling
- [ ] **4.1** Wrap evaluation in try-catch
- [ ] **4.2** Return false on any error
- [ ] **4.3** Emit warning event on error
- [ ] **Estimated**: 30 minutes

### Task 5: Testing
- [ ] **5.1** Run all test cases from requirements
- [ ] **5.2** Test with existing workflows
- [ ] **5.3** Verify backward compatibility
- [ ] **Estimated**: 1 hour

---

## Total Estimated Effort

| Task | Hours |
|------|-------|
| Task 1 | 0.5 |
| Task 2 | 3.0 |
| Task 3 | 1.0 |
| Task 4 | 0.5 |
| Task 5 | 1.0 |
| **Total** | **~6 hours** |
