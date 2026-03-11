# Tasks: Attractor Server Expansion

## Implementation Tasks

### Phase 1: Foundation

- [x] **TASK-001**: Create `src/server/coordinator.js` with CoordinatorService class
  - Depends on: None
  - Files: `src/server/coordinator.js`
  - Estimated: 4 hours

- [x] **TASK-002**: Add filesystem storage to server/index.js
  - Depends on: TASK-001
  - Files: `src/server/index.js`
  - Estimated: 1 hour

- [x] **TASK-003**: Create `src/server/storage/filesystem.js` for filesystem operations
  - Depends on: None
  - Files: `src/server/storage/filesystem.js`
  - Estimated: 2 hours

### Phase 2: Coordinator Integration

- [x] **TASK-004**: Integrate CoordinatorService with PipelineManager
  - Depends on: TASK-001, TASK-003
  - Files: `src/server/pipeline-manager.js`
  - Estimated: 3 hours

- [x] **TASK-005**: Implement queue consumer for workflow triggers
  - Depends on: TASK-003
  - Files: `src/server/queue-consumer.js`
  - Estimated: 2 hours

- [x] **TASK-006**: Add WebSocket events for coordinator decisions
  - Depends on: TASK-004
  - Files: `src/server/index.js`
  - Estimated: 1 hour

### Phase 3: Human Intervention API

- [x] **TASK-007**: Add clarify/approve endpoints
  - Depends on: TASK-004
  - Files: `src/server/index.js`
  - Estimated: 2 hours

- [x] **TASK-008**: Add questions endpoint for pending clarifications
  - Depends on: TASK-007
  - Files: `src/server/index.js`
  - Estimated: 1 hour

### Phase 4: Artifact Management (Filesystem)

- [x] **TASK-009**: Implement artifact storage service with filesystem metadata
  - Depends on: TASK-003
  - Files: `src/server/storage/artifacts.js`
  - Estimated: 2 hours

- [x] **TASK-010**: Add artifact upload/download endpoints
  - Depends on: TASK-009
  - Files: `src/server/index.js`
  - Estimated: 1 hour

- [x] **TASK-011**: Add concurrent write support for artifacts
  - Depends on: TASK-009
  - Files: `src/server/storage/artifacts.js`
  - Estimated: 1 hour

### Phase 5: Configuration

- [x] **TASK-012**: Create config module with defaults
  - Depends on: None
  - Files: `src/server/config.js`
  - Estimated: 1 hour

- [x] **TASK-013**: Add environment variable support
  - Depends on: TASK-012
  - Files: `src/server/config.js`
  - Estimated: 30 minutes

## Test Cases

### TC-001: Coordinator Success Path
**Requirement**: REQ-001
**Type**: Integration
**Steps**:
1. Create pipeline that completes successfully
2. Verify coordinator receives event
3. Verify next workflow is triggered
**Expected**: Coordinator triggers next workflow

### TC-002: Coordinator Failure Path
**Requirement**: REQ-001
**Type**: Integration  
**Steps**:
1. Create pipeline that fails
2. Verify coordinator receives event
3. Verify failure is logged and no next workflow
**Expected**: Coordinator handles failure appropriately

### TC-003: Filesystem State Persistence
**Requirement**: REQ-002
**Type**: Integration
**Steps**:
1. Start pipeline
2. Verify state file in state/pipelines/
3. Restart server
4. Verify state recovered
**Expected**: State persists across restarts

### TC-004: Filesystem Unavailable Fallback
**Requirement**: REQ-002
**Type**: Integration
**Steps**:
1. Make state directory read-only
2. Execute pipeline
3. Verify in-memory fallback works
4. Restore permissions
5. Verify state syncs to disk
**Expected**: Graceful degradation

### TC-005: Filesystem Artifact Metadata
**Requirement**: REQ-003
**Type**: Integration
**Steps**:
1. Store artifact
2. Verify metadata in state/artifacts/{pipeline_id}/index.json
3. Query by pipeline ID
**Expected**: Metadata indexed in filesystem

### TC-006: Decision History in Filesystem
**Requirement**: REQ-003
**Type**: Integration
**Steps**:
1. Execute workflow with coordinator
2. Query decisions from state/decisions/
3. Verify all decisions recorded
**Expected**: Full decision history available

### TC-007: Queue Trigger
**Requirement**: REQ-004
**Type**: Integration
**Steps**:
1. Create file in queues/workflow-triggers/pending/
2. Verify pipeline created
3. Verify execution starts
**Expected**: Queue file triggers workflow

### TC-008: Queue Ordering
**Requirement**: REQ-004
**Type**: Integration
**Steps**:
1. Create multiple trigger files
2. Verify FIFO processing
3. Verify all processed
**Expected**: Messages processed in order

### TC-009: Clarify Endpoint
**Requirement**: REQ-005
**Type**: Integration
**Steps**:
1. Create pipeline that needs clarification
2. Call clarify endpoint
3. Verify pipeline resumes
**Expected**: Clarification advances workflow

### TC-010: Approve Endpoint
**Requirement**: REQ-005
**Type**: Integration
**Steps**:
1. Create pipeline with approval gate
2. Call approve endpoint
3. Verify workflow proceeds or stops
**Expected**: Approval decision respected

### TC-011: Filesystem Artifact Storage
**Requirement**: REQ-006
**Type**: Integration
**Steps**:
1. Upload artifact via API
2. Verify stored in data/artifacts/{pipeline_id}/
3. Verify unique filename (UUID)
**Expected**: Artifact stored correctly

### TC-012: Artifact Retrieval
**Requirement**: REQ-006
**Type**: Integration
**Steps**:
1. Store artifact
2. Retrieve via API
3. Verify content matches
**Expected**: Artifact retrieved correctly

### TC-013: Concurrent Artifact Writes
**Requirement**: REQ-008
**Type**: Integration
**Steps**:
1. Run 10 pipelines simultaneously
2. Each writes multiple artifacts
3. Verify no file collisions
4. Verify metadata indexed correctly
**Expected**: Concurrent writes work

### TC-014: WebSocket Events
**Requirement**: REQ-007
**Type**: Integration
**Steps**:
1. Connect WebSocket client
2. Trigger coordinator action
3. Verify event received
**Expected**: Real-time events delivered

### TC-015: Configuration Loading
**Requirement**: REQ-009
**Type**: Unit
**Steps**:
1. Set environment variables
2. Start server
3. Verify config applied
**Expected**: Environment overrides defaults

## Definition of Done
- [x] All implementation tasks completed
- [x] All test cases pass
- [x] Code reviewed
- [x] Documentation updated
- [x] No regressions in existing tests
- [x] Docker integration tested
