# Requirements: Attractor Containerization

## Technical Specifications

### REQ-001: Dockerfile Implementation
**From Design**: FR-001
**Description**: Create Dockerfile for Attractor service

**Acceptance Criteria**:
- [x] Based on node:20-alpine
- [x] Working directory set to /app
- [x] Dependencies installed via npm
- [x] Non-root user created and used
- [x] Exposes port 3000
- [x] CMD starts the server

### REQ-002: Docker Compose Configuration
**From Design**: FR-002
**Description**: Create docker-compose.yml with full stack

**Acceptance Criteria**:
- [x] Attractor service defined
- [x] Volumes configured for persistence
- [x] Health checks defined
- [x] Environment variables configurable

### REQ-003: Health Check Implementation
**From Design**: FR-003
**Description**: Add health check endpoint and compose configuration

**Acceptance Criteria**:
- [x] /health endpoint returns 200 when ready
- [x] Docker healthcheck configured
- [x] Startup probe configured

### REQ-004: Volume Configuration
**From Design**: FR-004
**Description**: Configure persistent volumes

**Acceptance Criteria**:
- [x] Logs directory mounted
- [x] Data directory mounted (state, artifacts)
- [x] Checkpoints directory mounted
- [x] Workflows directory mounted
- [x] Named volumes for persistence

### REQ-005: Environment Configuration
**From Design**: FR-005
**Description**: Support environment-based configuration

**Acceptance Criteria**:
- [x] All config via environment variables
- [x] .env.example provided
- [x] Default values for optional vars
- [x] Secrets not in image

### REQ-006: Graceful Shutdown Handler
**From Design**: FR-006
**Description**: Handle SIGTERM for clean shutdown

**Acceptance Criteria**:
- [x] SIGTERM handler registered
- [x] Running pipelines allowed to complete
- [x] Timeout (10s) after which force exit

### REQ-007: Build Optimization
**From Design**: NFR-001
**Description**: Optimize Docker build

**Acceptance Criteria**:
- [x] Multi-stage build used
- [x] Dependencies cached
- [x] Production build only
- [x] Image under 300MB

### REQ-008: Shared Volume Support
**From Design**: FR-007
**Description**: Configure shared volume for artifacts in distributed setup

**Acceptance Criteria**:
- [x] Named volume for data
- [x] Volume mount configurable
- [x] Support for NFS/external storage
- [x] Permissions allow read/write

## Interface Contracts

### Docker Compose Structure
```yaml
services:
  attractor:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
      - ./checkpoints:/app/checkpoints
      - ./workflows:/app/workflows:ro
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Environment Variables
```
PORT=3000
STATE_DIR=./data/state
ARTIFACTS_DIR=./data/artifacts
LOGS_DIR=./logs
CHECKPOINTS_DIR=./checkpoints
NODE_ENV=production
```

## Traceability Matrix

| Requirement | Design Source | Test Case(s) |
|-------------|---------------|--------------|
| REQ-001 | FR-001 | TC-001 |
| REQ-002 | FR-002 | TC-002 |
| REQ-003 | FR-003 | TC-003 |
| REQ-004 | FR-004 | TC-004 |
| REQ-005 | FR-005 | TC-005 |
| REQ-006 | FR-006 | TC-006 |
| REQ-007 | NFR-001 | TC-007 |
| REQ-008 | FR-007 | TC-008 |
