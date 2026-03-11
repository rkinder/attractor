# Requirements: Distributed Attractor Deployment

## Technical Specifications

### REQ-001: Shared Filesystem Integration
**From Design**: FR-007
**Description**: Configure shared filesystem for state and artifact storage

**Acceptance Criteria**:
- [x] All instances mount same volume at STATE_DIR
- [x] Pipeline writes to unique directories (by pipeline ID)
- [x] UUID-based filenames prevent collisions
- [x] Permissions allow read/write from any instance

### REQ-002: Instance Discovery
**From Design**: FR-004
**Description**: Instance heartbeat and discovery via filesystem

**Acceptance Criteria**:
- [x] Each instance writes heartbeat to filesystem
- [x] Instance list readable from shared storage
- [x] Stale instances detectable (old heartbeat)

### REQ-003: Pipeline State Distribution
**From Design**: FR-001
**Description**: Pipeline state accessible across instances

**Acceptance Criteria**:
- [x] State files in data/state/pipelines/{id}/
- [x] Multiple instances can read same pipeline state
- [x] File locking not required (unique pipeline IDs)

### REQ-004: Artifact Cross-Instance Access
**From Design**: FR-007
**Description**: Enable artifact access across instances

**Acceptance Criteria**:
- [x] Artifacts stored in data/artifacts/{pipelineId}/
- [x] Any instance can read artifacts by pipeline ID
- [x] Artifact metadata in state files

### REQ-005: Load Balancer Configuration
**From Design**: FR-003
**Description**: Configure nginx for load balancing

**Acceptance Criteria**:
- [x] Health check endpoint configured
- [x] Round-robin distribution
- [x] WebSocket support
- [x] Timeout configuration

### REQ-006: Health Checks
**From Design**: FR-006
**Description**: Health checks for container orchestration

**Acceptance Criteria**:
- [x] /health endpoint returns 200 when ready
- [x] Docker healthcheck configured

## Interface Contracts

### Shared Filesystem Structure
```
data/
├── state/
│   ├── pipelines/{pipelineId}/
│   │   ├── state.json
│   │   └── artifacts.json
│   ├── decisions/
│   │   └── all.json
│   └── instances/
│       └── {instanceId}.json
└── artifacts/{pipelineId}/
```

### Nginx Configuration
```nginx
upstream attractor_backend {
    least_conn;
    server attractor_1:3000 max_fails=3 fail_timeout=30s;
    server attractor_2:3000 max_fails=3 fail_timeout=30s;
    server attractor_3:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### Docker Compose Scale
```bash
# Scale to 3 instances with shared volume
docker-compose -f docker-compose.distributed.yml up -d --scale attractor=3

# Requires shared filesystem (NFS, EFS, etc.) mounted at data/
```

## Traceability Matrix

| Requirement | Design Source | Status |
|-------------|---------------|--------|
| REQ-001 | FR-007 | ✅ |
| REQ-002 | FR-004 | ✅ |
| REQ-003 | FR-001 | ✅ |
| REQ-004 | FR-007 | ✅ |
| REQ-005 | FR-003 | ✅ |
| REQ-006 | FR-006 | ✅ |
