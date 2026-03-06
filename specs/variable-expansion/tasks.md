# Tasks: Variable Expansion Enhancement

## Implementation Checklist

### Task 1: Analyze Current Implementation
- [ ] **1.1** Read `src/handlers/codergen.js` - find `_expandVariables()` method
- [ ] **1.2** Read `src/handlers/fanin.js` - see how it handles expansion
- [ ] **1.3** Understand current variable replacement logic
- [ ] **Estimated**: 30 minutes

### Task 2: Implement $last_response Expansion
- [ ] **2.1** Add to `_expandVariables()` in codergen.js
- [ ] **2.2** Get value from `context.get(Context.LAST_RESPONSE)`
- [ ] **2.3** Replace all occurrences with actual value
- [ ] **2.4** Test with simple workflow
- [ ] **Estimated**: 1 hour

### Task 3: Implement $current_node Expansion
- [ ] **3.1** Add to `_expandVariables()` in codergen.js
- [ ] **3.2** Get value from `context.get(Context.CURRENT_NODE)`
- [ ] **3.3** Replace all occurrences
- [ ] **3.4** Test
- [ ] **Estimated**: 30 minutes

### Task 4: Implement $context.<key> Expansion
- [ ] **4.1** Add regex for `$context.([a-zA-Z0-9_.]+)`
- [ ] **4.2** Extract key from match
- [ ] **4.3** Get value from context
- [ ] **4.4** Replace with value or empty string
- [ ] **Estimated**: 1 hour

### Task 5: Implement $<nodeId>.output Expansion
- [ ] **5.1** Add regex for `$([a-zA-Z0-9_-]+).output`
- [ ] **5.2** Extract nodeId from match
- [ ] **5.3** Look up `${nodeId}.output` in context
- [ ] **5.4** Replace with value or empty string
- [ ] **Estimated**: 1 hour

### Task 6: Add Safe Handling
- [ ] **6.1** Add try-catch around expansion
- [ ] **6.2** Log warning for undefined variables (optional)
- [ ] **6.3** Ensure no crashes on missing values
- [ ] **Estimated**: 30 minutes

### Task 7: Documentation Update
- [ ] **7.1** Update docs/variable-expansion.md
- [ ] **7.2** Update docs/advanced-features.md
- [ ] **7.3** Add examples to docs
- [ ] **Estimated**: 1 hour

---

## Testing

```bash
# Test sequential workflow
node -e "
import { Attractor } from './src/index.js';
const a = await Attractor.create();
a.on('node_execution_success', (e) => console.log('Success:', e.nodeId));
await a.run('./examples/branching-workflow.dot');
"
```

---

## Total Estimated Effort

| Task | Hours |
|------|-------|
| Task 1 | 0.5 |
| Task 2 | 1.0 |
| Task 3 | 0.5 |
| Task 4 | 1.0 |
| Task 5 | 1.0 |
| Task 6 | 0.5 |
| Task 7 | 1.0 |
| **Total** | **~5.5 hours** |

---

## Dependencies

- None - internal changes to codergen.js only
