# Requirements: Attractor Containerization

## Technical Specifications

### REQ-001: Dockerfile Implementation
**From Design**: FR-001
**Description**: Create Dockerfile for Attractor service

**Acceptance Criteria**:
- [ ] Based on node:20-alpine
- [ ] Working directory set to /app
- [ ] Dependencies installed via npm
- [ ] Non-root user created and used
- [ ] Exposes port 3000
- [ ] CMD starts the server

### REQ-002: Docker Compose Configuration
**From Design**: FR-002
**Description**: Create docker-compose.yml with full stack

**Acceptance Criteria**:
- [ ] Attractor service defined
- [ ] Redis service defined
- [ ] Volumes configured for persistence
- [ ] Health checks defined
- [ ] Environment variables configurable
- [ ] Networks defined for service communication

### REQ-003: Health Check Implementation
**From Design**: FR-003
**Description**: Add health check endpoint and compose configuration

**Acceptance Criteria**:
- [ ] /health endpoint returns 200 when ready
- [ ] Redis ping implemented
- [ ] Docker healthcheck configured
- [ ] Startup probe configured

### REQ-004: Volume Configuration
**From Design**: FR-004
**Description**: Configure persistent volumes

**Acceptance Criteria**:
- [ ] Logs directory mounted
- [ ] Artifacts directory mounted (data/artifacts)
- [ ] Workflows directory mounted
- [ ] Named volumes for persistence

### REQ-005: Environment Configuration
**From Design**: FR-005
**Description**: Support environment-based configuration

**Acceptance Criteria**:
- [ ] All config via environment variables
- [ ] .env.example provided
- [ ] Default values for optional vars
- [ ] Secrets not in image

### REQ-006: Graceful Shutdown Handler
**From Design**: FR-006
**Description**: Handle SIGTERM for clean shutdown

**Acceptance Criteria**:
- [ ] SIGTERM handler registered
- [ ] Running pipelines allowed to complete
- [ ] Timeout (30s) after which force exit
- [ ] Exit code reflects state

### REQ-007: Build Optimization
**From Design**: NFR-001
**Description**: Optimize Docker build

**Acceptance Criteria**:
- [ ] Multi-stage build used
- [ ] Dependencies cached
- [ ] Production build only
- [ ] Image under 300MB

### REQ-008: Shared Volume Support
**From Design**: FR-007
**Description**: Configure shared volume for artifacts in distributed setup

**Acceptance Criteria**:
- [ ] Named volume for artifacts
- [ ] Volume mount configurable
- [ ] Support for NFS/external storage
- [ ] Permissions allow read/write

## Interface Contracts

### Dockerfile Structure
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN addgroup -g 1001 -S attractor && \
    adduser -u 1001 -S attractor -G attractor
USER attractor

EXPOSE 3000
CMD ["node", "src/server/index.js"]
```

### Docker Compose Structure
```yaml
version: '3.8'
services:
  attractor:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
      - ./workflows:/app/workflows
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

### Distributed Compose (with shared artifacts)
```yaml
services:
  attractor:
    volumes:
      - artifacts_data:/app/data
    deploy:
      replicas: 3

volumes:
  artifacts_data:
```

### Environment Variables
```
PORT=3000
REDIS_HOST=redis
REDIS_PORT=6379
DATA_PATH=/app/data
ARTIFACTS_PATH=/app/data/artifacts
LOGS_PATH=/app/logs
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
