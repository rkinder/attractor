# Requirements: Distributed Coordination Fix

## REQ-DC-001: Coordinator Wiring
**Description**: Wire the coordinator service into pipeline execution flow

**Acceptance Criteria**:
- [ ] PipelineManager calls coordinatorService.onPipelineComplete() on success
- [ ] PipelineManager calls coordinatorService.onPipelineError() on failure
- [ ] Coordinator decisions are recorded to filesystem
- [ ] WebSocket events are emitted for decisions

---

## REQ-DC-002: Distributed Event Broadcast
**Description**: All container instances receive pipeline completion events

**Acceptance Criteria**:
- [ ] When pipeline completes on any instance, all instances are notified
- [ ] Event includes: pipeline_id, status, outcome
- [ ] Event delivery is reliable (no drops)

---

## REQ-DC-003: Coordinator Election
**Description**: Only one instance processes a coordinator decision

**Acceptance Criteria**:
- [ ] Lock-based election prevents duplicate processing
- [ ] If processing instance dies, another instance takes over
- [ ] Election timeout prevents indefinite locks

---

## REQ-DC-004: Workflow Trigger Propagation
**Description**: Coordinated next-workflow triggers propagate to all instances

**Acceptance Criteria**:
- [ ] Next workflow can be triggered from any instance
- [ ] All instances see the triggered workflow
- [ ] Load balancer distributes next workflow execution

---

## REQ-DC-005: Human Intervention Coordination
**Description**: Human responses are visible across all instances

**Acceptance Criteria**:
- [ ] Clarification submitted to any instance is visible to all
- [ ] Approval submitted to any instance resumes pipeline on correct instance
- [ ] Questions are properly tracked across restarts

---

## Interface Contracts

### Event Format
```json
{
  "type": "pipeline_complete" | "pipeline_error",
  "pipelineId": "string",
  "status": "success" | "fail" | "partial_success",
  "outcome": { ... },
  "timestamp": "ISO8601"
}
```

### Lock Format
```json
{
  "resource": "pipeline:abc123",
  "owner": "container-2",
  "acquiredAt": "ISO8601",
  "expiresAt": "ISO8601"
}
```

---

## Traceability

| Requirement | Design | Priority |
|-------------|--------|----------|
| REQ-DC-001 | Gap fix | Critical |
| REQ-DC-002 | Distributed | Critical |
| REQ-DC-003 | Distributed | High |
| REQ-DC-004 | Coordinator | High |
| REQ-DC-005 | Human-in-loop | Medium |
