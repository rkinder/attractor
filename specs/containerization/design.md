# Design: Attractor Containerization

## Overview

This document specifies the containerization of the Attractor project for deployment in containerized environments. The design enables running Attractor as part of a Docker Compose stack with Redis for state and shared filesystem for artifacts.

## Architecture

### Container Structure
```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────┬─────────────┬─────────────────────────────┤
│  attractor  │   redis     │  (optional) nginx/lb       │
│  container  │   container │                             │
└─────────────┴─────────────┴─────────────────────────────┘

# For distributed:
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  attractor  │   redis     │  artifacts  │  nginx       │
│  (scaled)   │   container │  volume     │  (lb)        │
└─────────────┴─────────────┴─────────────┴───────────────┘
```

### Image Details

**attractor:latest**
- Base: node:20-alpine
- Port: 3000
- Volumes: ./logs, ./data/artifacts, ./workflows
- Environment: Configured via .env

### Data Storage

| Data Type | Storage | Container |
|-----------|---------|-----------|
| Pipeline state | Redis | redis |
| Artifact files | Filesystem | attractor (shared volume) |
| Logs | Filesystem | attractor |
| Workflows | Filesystem | attractor |

## Functional Requirements

### FR-001: Dockerfile Creation
**Type**: Ubiquitous
**Statement**: The system SHALL include a Dockerfile that builds a functional Attractor image.
**Rationale**: Enables containerized deployment

### FR-002: Docker Compose Stack
**Type**: Ubiquitous
**Statement**: The system SHALL include docker-compose.yml that defines the full stack.
**Rationale**: Enables one-command deployment

### FR-003: Health Checks
**Type**: Event-driven
**Statement**: WHEN the container starts, the system SHALL verify Redis connectivity before accepting traffic.
**Rationale**: Ensures healthy startup

### FR-004: Persistent Data
**Type**: Ubiquitous
**Statement**: The system SHALL persist logs, artifacts, and workflow files across container restarts via named volumes.
**Rationale**: Enables stateful operation

### FR-005: Environment Configuration
**Type**: Ubiquitous
**Statement**: The container SHALL accept configuration via environment variables.
**Rationale**: Enables flexible deployment

### FR-006: Graceful Shutdown
**Type**: Event-driven
**Statement**: WHEN SIGTERM is received, the container SHALL complete running pipelines before exiting.
**Rationale**: Prevents data corruption

### FR-007: Shared Artifact Volume
**Type**: Ubiquitous
**Statement**: The system SHALL support shared filesystem volume for artifact storage across multiple instances.
**Rationale**: Enables distributed deployment

## Non-Functional Requirements

### NFR-001: Image Size
**Statement**: The container image SHALL be under 300MB.
**Rationale**: Enables fast deployment

### NFR-002: Startup Time
**Statement**: The container SHALL start and pass health check within 10 seconds.
**Rationale**: Enables rapid scaling

### NFR-003: Security
**Statement**: The container SHALL run as non-root user.
**Rationale**: Follows container security best practices

### NFR-004: Multi-platform
**Statement**: The Dockerfile SHOULD support amd64 and arm64 architectures.
**Rationale**: Enables deployment on various hardware

## Dependencies

- Node.js 20 (Alpine)
- Redis (container)
- Shared filesystem (Docker named volume or NFS)

## Open Questions

1. Should we use a multi-stage build for smaller image?
2. How to handle LLM API keys in containers?
3. Should we provide pre-built official images?
4. What shared filesystem solution for production? (NFS, EFS, etc.)
