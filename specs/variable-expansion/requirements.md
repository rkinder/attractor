# Requirements: Variable Expansion Enhancement

## Technical Specifications

### REQ-VAR-001: Expand $goal
**From Design**: FR-001  
**Description**: Ensure `$goal` is expanded in CodergenHandler (already works).

**Acceptance Criteria**:
- [ ] Verify `$goal` expands to graph's goal attribute
- [ ] Works when goal is empty string

---

### REQ-VAR-002: Expand $last_response
**From Design**: FR-001  
**Description**: Add support for `$last_response` in CodergenHandler.

**Acceptance Criteria**:
- [ ] Expand `$last_response` to value from `context.get('last_response')`
- [ ] Replace with empty string if not set
- [ ] Test with workflow that has sequential codergen nodes

---

### REQ-VAR-003: Expand $current_node
**From Design**: FR-001  
**Description**: Add support for `$current_node` in CodergenHandler.

**Acceptance Criteria**:
- [ ] Expand `$current_node` to current node's ID
- [ ] Value comes from `context.get(Context.CURRENT_NODE)`
- [ ] Test: prompt="Process this in $current_node"

---

### REQ-VAR-004: Expand $context.<key>
**From Design**: FR-002  
**Description**: Add support for arbitrary context key expansion.

**Acceptance Criteria**:
- [ ] Expand `$context.<key>` to `context.get('<key>')`
- [ ] Support nested keys: `$context.parallel.success_count`
- [ ] Replace with empty string if key doesn't exist

---

### REQ-VAR-005: Expand $<nodeId>.output
**From Design**: FR-002  
**Description**: Support referencing output from specific nodes.

**Acceptance Criteria**:
- [ ] Expand `$<nodeId>.output` to that node's output in context
- [ ] Match pattern: `$` + node ID + `.output`
- [ ] Works for any previous node's output

---

### REQ-VAR-006: Safe Handling of Undefined Variables
**From Design**: FR-003  
**Description**: Gracefully handle missing variables.

**Acceptance Criteria**:
- [ ] Replace undefined variables with empty string (not crash)
- [ ] Optionally log warning for undefined variables
- [ ] No errors thrown during expansion

---

## Variable Syntax Reference

| Syntax | Expansion | Source |
|--------|-----------|--------|
| `$goal` | Graph goal | `graph.goal` |
| `$last_response` | Last response | `context.get('last_response')` |
| `$current_node` | Current node ID | `context.get(Context.CURRENT_NODE)` |
| `$context.<key>` | Context value | `context.get('<key>')` |
| `$<nodeId>.output` | Node output | `context.get('<nodeId>.output')` |

---

## Test Cases

### TC-VAR-001: Sequential Nodes
1. Create workflow: start → node1 → node2 → exit
2. node1 prompt: "First step"
3. node2 prompt: "After $last_response, do second step"
4. **Expected**: node2 sees node1's response

### TC-VAR-002: Context Key Reference
1. Add context key: `context.set('user_name', 'Alice')`
2. Prompt: "Hello $context.user_name"
3. **Expected**: "Hello Alice"

### TC-VAR-003: Node Output Reference
1. Create parallel workflow with output collection
2. FanIn prompt: "Combine $approach1.output and $approach2.output"
3. **Expected**: Both branch outputs included

### TC-VAR-004: Undefined Variable
1. Prompt: "Value is $undefined_key"
2. **Expected**: Replaced with empty string, no error

---

## Traceability Matrix

| Requirement | CodergenHandler | FanInHandler | Other Handlers |
|-------------|-----------------|--------------|----------------|
| REQ-VAR-001 | ✅ Exists | ✅ Exists | N/A |
| REQ-VAR-002 | ❌ Add | ✅ Exists | N/A |
| REQ-VAR-003 | ❌ Add | ❌ Add | N/A |
| REQ-VAR-004 | ❌ Add | ✅ Partial | N/A |
| REQ-VAR-005 | ❌ Add | ✅ Exists | N/A |
| REQ-VAR-006 | ❌ Add | ✅ Exists | N/A |

---

## Definition of Done

- [ ] All 6 requirements implemented in CodergenHandler
- [ ] All test cases pass
- [ ] Documentation updated
- [ ] No performance regression in LLM calls
