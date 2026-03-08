# Requirements: WebInterviewer Completion

## Technical Specifications

### REQ-WEB-001: WebInterviewer Implementation
**From Design**: FR-001  
**Description**: Implement functional WebInterviewer class.

**Acceptance Criteria**:
- [ ] Implement `ask(question)` method
- [ ] Serve question via HTTP endpoint
- [ ] Wait for response (with timeout)
- [ ] Return Answer object
- [ ] Implement `close()` for cleanup

---

### REQ-WEB-002: HTTP Server Integration
**From Design**: FR-002  
**Description**: Add approval endpoints to HTTP server.

**Acceptance Criteria**:
- [ ] Add `POST /approvals/:requestId` endpoint
- [ ] Add `GET /approvals/:requestId` status endpoint
- [ ] Store pending approvals in memory
- [ ] Connect WebInterviewer to server endpoints

---

### REQ-WEB-003: Approval Response Format
**From Design**: FR-003  
**Description**: Define approval response structure.

**Acceptance Criteria**:
- [ ] Accept approval/rejection via POST body
- [ ] Support optional comment
- [ ] Return success/failure response

---

## Interface Contracts

### WebInterviewer API

```javascript
class WebInterviewer extends Interviewer {
  constructor(options?: {
    baseUrl: string,    // Server URL
    timeout: number     // ms to wait for response
  });
  
  async ask(question: Question): Promise<Answer>;
  close(): void;
}
```

### Approval Endpoint

```
POST /approvals/:requestId
Body: {
  approved: boolean,
  comment?: string
}
Response: { success: boolean }
```

---

## Test Cases

### TC-WEB-001: Basic Approval
1. Start server with WebInterviewer
2. Execute workflow with human gate
3. POST approval to endpoint
4. **Expected**: Workflow continues

### TC-WEB-002: Timeout
1. Don't respond to approval request
2. Wait for timeout
3. **Expected**: Returns default or rejects

---

## Definition of Done

- [ ] WebInterviewer.ask() works
- [ ] Approval endpoint responds
- [ ] Integration tested end-to-end
