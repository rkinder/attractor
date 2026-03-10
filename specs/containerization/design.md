# Design: Attractor Containerization

## Overview

This document specifies the containerization of the Attractor project for deployment in containerized environments. The design enables running Attractor as a single container with filesystem-based state storage.

## Architecture

### Container Structure
```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────────────────────────────────────────────┤
│  attractor  │  (optional) nginx/lb                     │
│  container  │                                          │
└─────────────────────────────────────────────────────────┘

# For distributed:
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────────────────────────────────────────────┼────────────────┐
│  attractor  │  artifacts volume  │  nginx/lb            │  (shared FS)   │
│  (scaled)   │  (NFS/EFS)       │                      │               │
└─────────────────────────────────────────────────────────┴────────────────┘
```

### Image Details

**attractor:latest**
- Base: node:20-alpine
- Port: 3000
- Volumes: ./logs, ./data, ./checkpoints, ./workflows
- Environment: Configured via .env

### Data Storage

| Data Type | Storage | Notes |
|-----------|---------|-------|
| Pipeline state | Filesystem | data/state/ |
| Artifact files | Filesystem | data/artifacts/ |
| Logs | Filesystem | logs/ |
| Checkpoints | Filesystem | checkpoints/ |
| Workflows | Filesystem | mounted read-only |

For distributed deployments, use a shared filesystem (NFS, EFS, etc.) mounted at the same path on all instances.

## Functional Requirements

### FR-001: Dockerfile Creation
**Type**: Ubiquitous
**Statement**: The system SHALL include a Dockerfile that builds a functional Attractor image.
**Rationale**: Enables containerized deployment

### FR-002: Docker Compose Stack
**Type**: Ubiquitous
**Statement**: The system SHALL include docker-compose.yml for easy deployment.
**Rationale**: Simplifies local development and testing

### FR-003: Health Checks
**Type**: Ubiquitous
**Statement**: The container SHALL expose a /health endpoint for container orchestration.
**Rationale**: Enables container orchestration health monitoring

### FR-004: Volume Persistence
**Type**: Ubiquitous
**Statement**: Pipeline data SHALL persist across container restarts via named volumes.
**Rationale**: Enables stateful workflows

### FR-005: Graceful Shutdown
**Type**: Ubiquitous
**Statement**: The container SHALL handle SIGTERM for graceful shutdown.
**Rationale**: Prevents data loss during deployments

## Non-Functional Requirements

### NFR-001: Image Size
**Statement**: The image SHALL be under 300MB.
**Rationale**: Fast deployment and startup

### NFR-002: Security
**Statement**: The container SHALL run as non-root user.
**Rationale**: Security best practice

### NFR-003: Simplicity
**Statement**: No external dependencies (Redis, etc.) required for basic operation.
**Rationale**: Simpler deployment and operation

## Dependencies

- Node.js 20 (Alpine)
- No external services required
