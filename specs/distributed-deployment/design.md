# Design: Distributed Attractor Deployment

## Overview

This document specifies the deployment of multiple Attractor instances in a distributed configuration. This enables horizontal scaling, high availability, and distributed workflow execution with Redis as the coordination backbone and filesystem for artifact storage.

## Architecture

### System Architecture
```
                               ┌─────────────┐
                               │   nginx     │
                               │  (LB/Proxy) │
                               └──────┬──────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
 ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
 │  attractor:1    │      │  attractor:2    │      │  attractor:3    │
 │  (container)    │      │  (container)    │      │  (container)    │
 └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                     ┌─────────────┼─────────────┐
                     ▼             ▼             ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │  Redis   │  │FS (shared)│  │   LLM    │
              │ Cluster  │  │ artifacts │  │ Provider │
              └──────────┘  └──────────┘  └──────────┘
```

### Data Flow by Type

| Data Type | Storage | Access Pattern |
|-----------|---------|----------------|
| Pipeline state | Redis | Any instance reads/writes |
| Artifact metadata | Redis | Write by owner, read by any |
| Artifact files | Shared Filesystem | Write by owner, read by any |
| Events | Redis pub/sub | Broadcast to all |
| Workflow triggers | Redis queue | Any instance consumes |

### Coordination Flow
1. External system sends request to load balancer
2. nginx distributes to available Attractor instance
3. Instance creates pipeline, stores state in Redis, claims ownership
4. Pipeline executes, writes artifacts to shared filesystem
5. Pipeline emits events via Redis pub/sub
6. Coordinator instance picks up completion events
7. Coordinator triggers next action

## Functional Requirements

### FR-001: Distributed Pipeline Creation
**Type**: Ubiquitous
**Statement**: Any Attractor instance SHALL be able to create and execute pipelines.
**Rationale**: Enables horizontal scaling

### FR-002: Redis State Access
**Type**: Ubiquitous
**Statement**: All instances SHALL access pipeline state via Redis.
**Rationale**: Enables any instance to query status

### FR-003: Load Balancing
**Type**: Ubiquitous
**Statement**: The system SHALL distribute requests across available instances.
**Rationale**: Enables horizontal scaling

### FR-004: Pipeline Ownership
**Type**: Event-driven
**Statement**: WHEN a pipeline starts, the system SHALL assign ownership to one instance and persist it to Redis.
**Rationale**: Prevents duplicate execution

### FR-005: Event Distribution
**Type**: Event-driven
**Statement**: WHEN a pipeline event occurs, the system SHALL publish to Redis pub/sub for all instances.
**Rationale**: Enables coordinated actions

### FR-006: Health-Based Routing
**Type**: Event-driven
**Statement**: WHEN an instance fails health check, the load balancer SHALL stop routing traffic to it.
**Rationale**: Ensures availability

### FR-007: Shared Filesystem for Artifacts
**Type**: Ubiquitous
**Statement**: All instances SHALL read/write artifacts to a shared filesystem.
**Rationale**: Enables artifact access across instances

## Non-Functional Requirements

### NFR-001: Horizontal Scaling
**Statement**: The system SHALL scale linearly with added instances up to 10 instances.
**Rationale**: Enables high throughput

### NFR-002: Failure Isolation
**Statement**: A single instance failure SHALL NOT affect pipelines on other instances.
**Rationale**: Ensures reliability

### NFR-003: Consistent State
**Statement**: All instances SHALL see the same pipeline state within 100ms.
**Rationale**: Enables coordination

### NFR-004: Connection Pooling
**Statement**: Each instance SHALL maintain a Redis connection pool.
**Rationale**: Enables high throughput

### NFR-005: Filesystem Concurrency
**Statement**: The shared filesystem SHALL handle concurrent artifact writes from multiple instances.
**Rationale**: Enables parallel execution

## Dependencies

- Redis (pub/sub + state + queues)
- Shared filesystem (NFS, EFS, or Docker volume)
- nginx (load balancing)
- LLM Provider (external)

## Open Questions

1. What shared filesystem solution? (NFS, EFS, GlusterFS, etc.)
2. How to coordinate which instance runs the coordinator?
3. Should we use Redis Streams instead of pub/sub for durability?
4. How to handle sticky sessions for WebSocket connections?
5. How to ensure filesystem permissions across containers?
