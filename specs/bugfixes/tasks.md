# Tasks: Critical Bug Fixes

## Implementation Checklist

### Task 1: Register FanInHandler (BUG-001)
- [ ] **1.1** Read `src/index.js` to understand current handler registration
- [ ] **1.2** Add `FanInHandler` to imports (line ~94-96 already has it exported)
- [ ] **1.3** Add registration in `_setupDefaultHandlers()` after line 214:
  ```javascript
  this.handlerRegistry.register('parallel.fan_in', new FanInHandler());
  ```
- [ ] **1.4** Test with a tripleoctagon workflow
- [ ] **Estimated Effort**: 15 minutes

### Task 2: Fix Example Entry Point Guards (BUG-002)
- [ ] **2.1** Fix `examples/run-parallel-example.js` line 35
- [ ] **2.2** Fix `examples/run-fanin-example.js` line 35  
- [ ] **2.3** Fix `examples/run-tool-example.js` line 35
- [ ] **2.4** Verify each runs directly with `node examples/run-*.js`
- [ ] **Estimated Effort**: 15 minutes

### Task 3: Fix run-with-kilo.js (BUG-003)
- [ ] **3.1** Read `run-with-kilo.js` to understand current implementation
- [ ] **3.2** Change from `new Attractor()` to `await Attractor.create()`
- [ ] **3.3** Test with a workflow containing non-codergen nodes
- [ ] **Estimated Effort**: 30 minutes

### Task 4: Fix run-workflow.js (BUG-004, BUG-005)
- [ ] **4.1** Read `run-workflow.js` 
- [ ] **4.2** Find and replace `outcome.message` with `outcome.notes`
- [ ] **4.3** Remove `human_input_required` event listener
- [ ] **4.4** Test workflow execution
- [ ] **Estimated Effort**: 15 minutes

### Task 5: Fix Parallel/FanIn Context Key Mismatch (BUG-006)
- [ ] **5.1** Read `src/handlers/parallel.js` to see current context storage
- [ ] **5.2** Read `src/handlers/fanin.js` to see what keys it looks for
- [ ] **5.3** Choose Option A or B (see requirements)
- [ ] **5.4** Implement the fix
- [ ] **5.5** Test with fanin-workflow.dot
- [ ] **Estimated Effort**: 1 hour

---

## Testing

Run the following commands to verify fixes:

```bash
# Test BUG-001
node -e "
import('./src/index.js').then(async m => {
  const a = await m.Attractor.create();
  console.log('parallel.fan_in registered:', a.handlerRegistry.has('parallel.fan_in'));
});
"

# Test BUG-002 (each should run without "must be run with import.meta.url" error)
node examples/run-parallel-example.js
node examples/run-fanin-example.js  
node examples/run-tool-example.js

# Test BUG-003
node run-with-kilo.js examples/human-approval-workflow.dot

# Test BUG-004/005
node run-workflow.js examples/simple-linear.dot

# Test BUG-006
node examples/run-fanin-example.js
```

---

## Dependencies

- None - all internal code changes

---

## Notes

- Task 5 (BUG-006) is the most complex and may require design discussion
- Consider if the context key design should be unified across all handlers
