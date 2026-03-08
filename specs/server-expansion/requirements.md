# Requirements: Attractor Server Expansion

## Technical Specifications

### REQ-001: Coordinator Service Implementation
**From Design**: FR-001
**Description**: Implement CoordinatorService class that listens to pipeline events and determines next actions

**Acceptance Criteria**:
- [ ] CoordinatorService listens to pipeline_complete events
- [ ] Decision engine classifies outcomes (success/fail/blocked)
- [ ] Actions include: trigger_next, request_human, fail, archive
- [ ] Decisions are logged and traceable

### REQ-002: Redis State Persistence
**From Design**: FR-002
**Description**: Store pipeline execution state in Redis for fast access

**Acceptance Criteria**:
- [ ] Pipeline state stored in Redis hash `pipeline:{id}`
- [ ] State includes: status, outcome, artifacts, timestamps
- [ ] TTL set for automatic cleanup (configurable)
- [ ] Fallback to in-memory if Redis unavailable

### REQ-003: Redis Artifact Metadata Storage
**From Design**: FR-005
**Description**: Store artifact metadata in Redis with filesystem for actual files

**Acceptance Criteria**:
- [ ] Artifact metadata in Redis hash `artifact:{pipeline_id}:meta`
- [ ] Includes: type, path, size, checksum, timestamps
- [ ] Files stored on filesystem under data/artifacts/
- [ ] Query API for listing and searching via Redis

### REQ-004: Queue Consumer
**From Design**: FR-003
**Description**: Consume workflow trigger messages from Redis queue

**Acceptance Criteria**:
- [ ] Subscribe to `workflow:triggers` queue
- [ ] Parse message format: { workflow_path, context, trigger_type }
- [ ] Create pipeline from triggered workflow
- [ ] Acknowledge message after processing

### REQ-005: Human Intervention Endpoints
**From Design**: FR-004
**Description**: REST API for external human input

**Acceptance Criteria**:
- [ ] POST /pipelines/:id/clarify - Submit clarification
- [ ] POST /pipelines/:id/approve - Submit approval
- [ ] POST /pipelines/:id/context - Add context
- [ ] GET /pipelines/:id/questions - Get pending questions

### REQ-006: Filesystem Artifact Storage
**From Design**: FR-005
**Description**: Store and retrieve workflow artifacts on filesystem

**Acceptance Criteria**:
- [ ] Files stored under data/artifacts/{pipeline_id}/
- [ ] Unique filenames (UUID) to prevent collisions
- [ ] Download endpoint for outputs/logs
- [ ] List endpoint for pipeline artifacts
- [ ] Delete endpoint with retention policy

### REQ-007: Coordinator WebSocket Events
**From Design**: FR-006
**Description**: Broadcast coordinator decisions in real-time

**Acceptance Criteria**:
- [ ] Event types: coordinator_decision, human_request, workflow_triggered
- [ ] Broadcast to /events channel
- [ ] Include full context in event payload

### REQ-008: Concurrent Artifact Writes
**From Design**: FR-007
**Description**: Handle multiple pipelines writing artifacts concurrently

**Acceptance Criteria**:
- [ ] Each pipeline writes to unique directory
- [ ] No file name collisions (use UUIDs)
- [ ] Redis metadata writes use pipeline ID prefix
- [ ] No lock contention between pipelines

### REQ-009: Configuration Management
**From Design**: FR-002
**Description**: Externalized configuration for all new services

**Acceptance Criteria**:
- [ ] Config file or environment variables
- [ ] Redis connection settings
- [ ] Artifact storage path configuration
- [ ] Queue settings

## Interface Contracts

### API Endpoints

```
POST /pipelines/:id/clarify
Body: { question_id: string, answer: string }
Response: { success: boolean, next_action: string }

POST /pipelines/:id/approve
Body: { decision: "proceed" | "revise" | "abort", notes?: string }
Response: { success: boolean, next_action: string }

GET /pipelines/:id/questions
Response: { questions: [{ id, text, stage, timeout }] }

POST /artifacts
Body: { pipeline_id, type, content }
Response: { artifact_id, path: string }

GET /artifacts/:pipelineId
Response: { artifacts: [...] }

GET /artifacts/:pipelineId/:artifactId
Response: File stream

DELETE /artifacts/:pipelineId/:artifactId
Response: { success: boolean }
```

### Queue Message Format
```json
{
  "workflow_path": "workflows/project-framework/workflow.dot",
  "context": {
    "user_request": "Build a CLI tool",
    "previous_output": "..."
  },
  "trigger_type": "manual" | "scheduled" | "webhook",
  "callback_url": "https://...",
  "correlation_id": "uuid"
}
```

### Redis Keys
```
pipeline:{id}           - Hash: state, outcome, timestamps
pipeline:{id}:artifacts - Set: artifact IDs
artifact:{pipeline_id}:meta - Hash: artifact metadata by ID
artifact:{pipeline_id}:index - List: artifact IDs for pipeline
workflow:triggers       - List: incoming trigger messages
coordinator:decisions   - List: decision history
```

### Filesystem Structure
```
data/
└── artifacts/
    └── {pipeline_id}/
        ├── {uuid}_output.log
        ├── {uuid}_result.json
        └── {uuid}_source.dot
```

## Traceability Matrix

| Requirement | Design Source | Test Case(s) |
|-------------|---------------|--------------|
| REQ-001 | FR-001 | TC-001, TC-002 |
| REQ-002 | FR-002 | TC-003, TC-004 |
| REQ-003 | FR-005 | TC-005, TC-006 |
| REQ-004 | FR-003 | TC-007, TC-008 |
| REQ-005 | FR-004 | TC-009, TC-010 |
| REQ-006 | FR-005 | TC-011, TC-012 |
| REQ-007 | FR-006 | TC-013 |
| REQ-008 | FR-007 | TC-014 |
| REQ-009 | FR-002 | TC-015 |
