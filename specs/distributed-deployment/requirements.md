# Requirements: Distributed Attractor Deployment

## Technical Specifications

### REQ-001: Redis Pub/Sub Integration
**From Design**: FR-005
**Description**: Add Redis pub/sub for event distribution

**Acceptance Criteria**:
- [ ] Events published to Redis channel
- [ ] All instances subscribe to channels
- [ ] Events handled by local handlers
- [ ] No duplicate event processing

### REQ-002: Pipeline Ownership
**From Design**: FR-004
**Description**: Implement distributed pipeline ownership

**Acceptance Criteria**:
- [ ] Ownership stored in Redis
- [ ] Ownership checked before execution
- [ ] Ownership released on completion
- [ ] Ownership timeout for orphaned pipelines

### REQ-003: Redis Connection Pool
**From Design**: NFR-004
**Description**: Implement Redis connection pooling

**Acceptance Criteria**:
- [ ] Pool size configurable
- [ ] Connections reused
- [ ] Automatic reconnection
- [ ] Error handling for pool exhaustion

### REQ-004: Load Balancer Configuration
**From Design**: FR-003
**Description**: Configure nginx for load balancing

**Acceptance Criteria**:
- [ ] Health check endpoint configured
- [ ] Round-robin distribution
- [ ] WebSocket support
- [ ] Timeout configuration

### REQ-005: Distributed Health Checks
**From Design**: FR-006
**Description**: Implement health checks that verify Redis connectivity

**Acceptance Criteria**:
- [ ] Basic health check (process alive)
- [ ] Redis connectivity check
- [ ] Filesystem access check
- [ ] Status aggregated and exposed

### REQ-006: Coordinator Election
**From Design**: FR-002
**Description**: Elect coordinator using Redis

**Acceptance Criteria**:
- [ ] Redis lock for coordinator
- [ ] Automatic failover
- [ ] Only one coordinator active
- [ ] Coordinator handles pipeline completions

### REQ-007: Shared Filesystem Integration
**From Design**: FR-007
**Description**: Configure shared filesystem for artifact storage

**Acceptance Criteria**:
- [ ] All instances mount same volume
- [ ] Pipeline writes to unique directories
- [ ] UUID-based filenames prevent collisions
- [ ] Permissions allow read/write from any instance

### REQ-008: Cross-Instance Artifact Access
**From Design**: FR-007
**Description**: Enable artifact access across instances

**Acceptance Criteria**:
- [ ] Instance can read artifacts created by other instances
- [ ] Artifact metadata in Redis allows discovery
- [ ] Filesystem paths are consistent across instances

## Interface Contracts

### Redis Channels
```
attractor:events        - All pipeline events
attractor:decisions    - Coordinator decisions
attractor:locks        - Distributed locks
```

### Redis Keys for Distributed State
```
pipeline:{id}:owner    - String: instance ID
pipeline:{id}:state    - Hash: pipeline state
pipeline:{id}:artifacts - Set: artifact IDs
artifact:{pipeline_id}:meta - Hash: artifact metadata
instance:{id}:heartbeat - String: last heartbeat
coordinator:lock       - String: current coordinator
```

### Shared Filesystem Structure
```
/data/
└── artifacts/
    └── {pipeline_id}/
        ├── {uuid}_output.log
        ├── {uuid}_result.json
        └── {uuid}_source.dot
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

server {
    location / {
        proxy_pass http://attractor_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 30s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    location /health {
        proxy_pass http://attractor_backend/health;
    }
}
```

### Docker Compose Scale
```bash
# Scale to 3 instances
docker-compose up -d --scale attractor=3

# With shared volume
volumes:
  - artifact_volume:/app/data
```

## Traceability Matrix

| Requirement | Design Source | Test Case(s) |
|-------------|---------------|--------------|
| REQ-001 | FR-005 | TC-001, TC-002 |
| REQ-002 | FR-004 | TC-003, TC-004 |
| REQ-003 | NFR-004 | TC-005 |
| REQ-004 | FR-003 | TC-006 |
| REQ-005 | FR-006 | TC-007 |
| REQ-006 | FR-002 | TC-008 |
| REQ-007 | FR-007 | TC-009, TC-010 |
| REQ-008 | FR-007 | TC-011 |
