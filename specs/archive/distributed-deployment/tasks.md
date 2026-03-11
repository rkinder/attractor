# Tasks: Distributed Attractor Deployment

## Implementation Tasks

### Phase 1: Filesystem Integration

- [x] **TASK-001**: Filesystem storage module
  - Files: `src/server/storage/filesystem.js`
  - Note: JSON file-based storage for pipelines, artifacts, decisions
  - Status: Implemented

- [x] **TASK-002**: Instance heartbeat via filesystem
  - Files: `src/server/storage/filesystem.js`
  - Note: Instance info written to data/state/instances/
  - Status: Implemented

### Phase 2: Docker Compose Scaling

- [x] **TASK-010**: docker-compose.distributed.yml
  - Files: `docker-compose.distributed.yml`
  - Note: 3 replicas with shared volumes
  - Status: Implemented

- [x] **TASK-011**: Instance ID generation
  - Files: `src/server/storage/filesystem.js`
  - Note: getInstanceId() method
  - Status: Implemented

### Phase 3: Load Balancer

- [x] **TASK-006**: nginx configuration
  - Files: `nginx/nginx.conf`
  - Note: Health checks, WebSocket support
  - Status: Implemented

## Test Cases

### TC-001: Shared Filesystem Mount
**Requirement**: REQ-001
**Type**: Integration
**Steps**:
1. Start multiple containers with shared volume
2. Write file from one container
3. Read from another
**Expected**: File accessible across instances

### TC-002: Pipeline State Distribution
**Requirement**: REQ-003
**Type**: Integration
**Steps**:
1. Create pipeline on instance 1
2. Query state from instance 2
**Expected**: State accessible

### TC-003: Artifact Access
**Requirement**: REQ-004
**Type**: Integration
**Steps**:
1. Create artifact on instance 1
2. Retrieve from instance 2
**Expected**: Artifact accessible

### TC-004: Load Balancer Distribution
**Requirement**: REQ-005
**Type**: Integration
**Steps**:
1. Send 10 requests
2. Verify distribution
3. Kill one instance
4. Verify distribution to remaining
**Expected**: Load balanced correctly

### TC-005: Health Check Failover
**Requirement**: REQ-006
**Type**: Integration
**Steps**:
1. Start stack with 3 instances
2. Verify all healthy
3. Kill instance 2
4. Verify LB removes it
5. Restart instance 2
6. Verify LB adds it back
**Expected**: Health-based routing works

## Definition of Done
- [x] All implementation tasks completed
- [x] All test cases verified
- [x] Documentation updated
