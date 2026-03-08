# Tasks: Attractor Containerization

## Implementation Tasks

### Phase 1: Dockerfile

- [ ] **TASK-001**: Create Dockerfile with multi-stage build
  - Depends on: None
  - Files: `Dockerfile`
  - Estimated: 1 hour

- [ ] **TASK-002**: Add .dockerignore file
  - Depends on: TASK-001
  - Files: `.dockerignore`
  - Estimated: 15 minutes

- [ ] **TASK-003**: Create .env.example for container deployment
  - Depends on: None
  - Files: `.env.example`
  - Estimated: 15 minutes

### Phase 2: Docker Compose

- [ ] **TASK-004**: Create docker-compose.yml
  - Depends on: TASK-001
  - Files: `docker-compose.yml`
  - Estimated: 1 hour

- [ ] **TASK-005**: Add docker-compose.override.yml for local dev
  - Depends on: TASK-004
  - Files: `docker-compose.override.yml`
  - Estimated: 30 minutes

### Phase 3: Container Integration

- [ ] **TASK-006**: Update server to support environment config
  - Depends on: None
  - Files: `src/server/config.js`
  - Estimated: 30 minutes

- [ ] **TASK-007**: Implement graceful shutdown
  - Depends on: None
  - Files: `src/server/index.js`
  - Estimated: 30 minutes

### Phase 4: Testing

- [ ] **TASK-008**: Create health check test
  - Depends on: TASK-004
  - Files: Test in container
  - Estimated: 30 minutes

- [ ] **TASK-009**: Test persistence across restarts
  - Depends on: TASK-004
  - Files: Test in container
  - Estimated: 30 minutes

- [ ] **TASK-010**: Test scaling with multiple instances
  - Depends on: TASK-004
  - Files: Test in container
  - Estimated: 1 hour

- [ ] **TASK-011**: Test shared artifact volume
  - Depends on: TASK-004
  - Files: Test in container
  - Estimated: 30 minutes

## Test Cases

### TC-001: Image Build
**Requirement**: REQ-001
**Type**: Integration
**Steps**:
1. Run docker build
2. Verify image created
3. Verify size under 300MB
**Expected**: Image builds successfully

### TC-002: Compose Stack
**Requirement**: REQ-002
**Type**: Integration
**Steps**:
1. Run docker-compose up
2. Verify all services start
3. Verify health checks pass
**Expected**: Full stack runs

### TC-003: Health Check
**Requirement**: REQ-003
**Type**: Integration
**Steps**:
1. Start stack
2. Check docker ps shows healthy
3. Verify /health returns 200
**Expected**: Health checks work

### TC-004: Data Persistence
**Requirement**: REQ-004
**Type**: Integration
**Steps**:
1. Create pipeline
2. Stop container
3. Start container
4. Verify pipeline history in Redis
5. Verify artifacts on volume
**Expected**: Data persists

### TC-005: Environment Config
**Requirement**: REQ-005
**Type**: Integration
**Steps**:
1. Set custom PORT in .env
2. Start container
3. Verify custom port used
**Expected**: Config from env

### TC-006: Graceful Shutdown
**Requirement**: REQ-006
**Type**: Integration
**Steps**:
1. Start long-running pipeline
2. Send SIGTERM
3. Verify pipeline completes
4. Verify container exits
**Expected**: Clean shutdown

### TC-007: Image Size
**Requirement**: REQ-007
**Type**: Integration
**Steps**:
1. Build image
2. Check image size
3. Verify under limit
**Expected**: Optimized size

### TC-008: Shared Artifact Volume
**Requirement**: REQ-008
**Type**: Integration
**Steps**:
1. Start 2 attractor containers
2. Container 1 creates pipeline and artifact
3. Container 2 queries for pipeline
4. Container 2 retrieves artifact
**Expected**: Shared volume works

## Definition of Done
- [ ] All implementation tasks completed
- [ ] All test cases pass
- [ ] Dockerfile reviewed for security
- [ ] Documentation updated
- [ ] README updated with deployment instructions
