# Requirements: LLM Response Capture Bug Fix

## Technical Specifications

### REQ-RESP-001: Debug Response Flow
**From Design**: FR-001  
**Description**: Add debug logging to trace where the response is being lost.

**Acceptance Criteria**:
- [ ] Add console.log in SessionBackend.run() to show what backend.run() returns
- [ ] Add console.log to show what responseText is before writing to response.md
- [ ] Run a test workflow and capture debug output
- [ ] Identify exactly where the response becomes empty

---

### REQ-RESP-002: Fix Response Capture in CodergenHandler
**From Design**: FR-001, FR-002, FR-003  
**Description**: Ensure response is captured and stored correctly.

**Acceptance Criteria**:
- [ ] After backend.run() returns, verify response is non-empty
- [ ] Write full response to response.md (no truncation)
- [ ] Store response (truncated to 200 chars) in context as last_response
- [ ] Verify response.md contains actual LLM output
- [ ] Verify status.json shows non-empty last_response

---

### REQ-RESP-003: Test with LM Studio
**From Design**: All  
**Description**: Verify fix works with LM Studio provider.

**Acceptance Criteria**:
- [ ] Run parallel-workflow.dot with LM Studio
- [ ] Check response.md for each node has content
- [ ] Check status.json last_response is populated
- [ ] Check that downstream nodes can access $last_response

---

### REQ-RESP-004: Test with Simulation Mode
**From Design**: All  
**Description**: Verify fix doesn't break simulation mode.

**Acceptance Criteria**:
- [ ] Run workflow with null backend (simulation)
- [ ] Verify response.md contains "[Simulated] Response..." text
- [ ] Verify last_response contains simulation text

---

## Interface Contracts

### Expected response.md Content
```
The LLM's complete text response goes here...
```

### Expected status.json
```json
{
  "status": "success",
  "notes": "Stage completed: node-id",
  "context_updates": {
    "last_stage": "node-id",
    "last_response": "First 200 chars of response..."
  }
}
```

### Expected context key
- Key: `last_response`
- Value: String (up to 200 characters)

---

## Test Cases

### TC-RESP-001: Basic LLM Response
1. Create simple workflow with single codergen node
2. Execute with LM Studio
3. **Expected**: response.md contains LLM response text
4. **Expected**: status.json last_response is populated

### TC-RESP-002: Sequential Nodes
1. Create workflow: start → node1 → node2 → exit
2. node2 prompt: "Based on: $last_response"
3. **Expected**: node2 can see node1's response via $last_response

### TC-RESP-003: Parallel + FanIn
1. Run fanin-workflow.dot
2. **Expected**: Each branch node writes response
3. **Expected**: FanIn node receives branch outputs

### TC-RESP-004: Empty Response Handling
1. Configure workflow that might return empty (edge case)
2. **Expected**: response.md shows placeholder
3. **Expected**: No crash

---

## Traceability Matrix

| Requirement | CodergenHandler | SessionBackend | Session | Adapter |
|-------------|-----------------|---------------|---------|---------|
| REQ-RESP-001 | Debug logging | Add return logging | - | - |
| REQ-RESP-002 | Fix storage | Fix return value | - | - |
| REQ-RESP-003 | Integration test | Integration test | - | - |
| REQ-RESP-004 | Verify simulation | Verify works | - | - |

---

## Definition of Done

- [ ] All test cases pass
- [ ] response.md contains actual LLM output
- [ ] status.json last_response is populated
- [ ] No regression in simulation mode
- [ ] Debug logging removed (or made optional)
