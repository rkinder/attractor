# Design: Distributed Attractor Deployment

## Overview

This document specifies the deployment of multiple Attractor instances in a distributed configuration. This enables horizontal scaling using a shared filesystem for state, Redis for pub/sub coordination, and nginx for load balancing.

## Architecture

### System Architecture
```
                               ┌─────────────┐
                               │   nginx     │
                               │  (LB/Proxy) │
                               └──────┬──────┘
                                      │
      ┌───────────────────────────────┼───────────────────────────────┐
      │                               │                               │
      ▼                               ▼                               ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│  attractor:1  │          │  attractor:2  │          │  attractor:3  │
│  (container)   │          │  (container)   │          │  (container)   │
└────────┬────────┘          └────────┬────────┘          └────────┬────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │
                       ┌────────────────┼────────────────┐
                       ▼                ▼                ▼
               ┌──────────┐   ┌──────────┐   ┌──────────┐
               │   Redis  │   │   data/   │   │   LLM    │
               │ (pub/sub)│   │  (shared) │   │ Provider │
               └──────────┘   └───────────┘   └──────────┘
```

### Data Flow by Type

| Data Type | Storage | Access Pattern |
|-----------|---------|----------------|
| Pipeline state | Filesystem | Any instance reads/writes |
| Artifact files | Filesystem | Write by owner, read by any |
| Logs | Filesystem | Any instance reads |
| Workflow triggers | HTTP | Any instance accepts |
| Coordinator events | Redis pub/sub | All instances subscribe |

### Coordination Flow
1. External system sends request to nginx load balancer
2. nginx distributes to available Attractor instance
3. Instance creates pipeline, stores state in filesystem
4. Pipeline executes, writes artifacts to shared filesystem
5. Instance updates state files as pipeline progresses

## Functional Requirements

### FR-001: Distributed Pipeline Creation
**Type**: Ubiquitous
**Statement**: Any Attractor instance SHALL be able to create and execute pipelines.
**Rationale**: Enables horizontal scaling

### FR-002: Filesystem State Access
**Type**: Ubiquitous
**Statement**: All instances SHALL access pipeline state via shared filesystem.
**Rationale**: Enables any instance to query status

### FR-003: Load Balancing
**Type**: Ubiquitous
**Statement**: The system SHALL distribute requests across available instances.
**Rationale**: Enables horizontal scaling

### FR-004: Instance Discovery
**Type**: Event-driven
**Statement**: Instances SHALL write heartbeats to shared filesystem for discovery.
**Rationale**: Enables instance monitoring

### FR-005: Health-Based Routing
**Type**: Event-driven
**Statement**: WHEN an instance fails health check, the load balancer SHALL stop routing traffic to it.
**Rationale**: Ensures availability

### FR-007: Shared Filesystem for State
**Type**: Ubiquitous
**Statement**: All instances SHALL read/write state and artifacts to a shared filesystem.
**Rationale**: Enables state sharing across instances

## Non-Functional Requirements

### NFR-001: Horizontal Scaling
**Statement**: The system SHALL scale linearly with added instances up to 10 instances.
**Rationale**: Enables high throughput

### NFR-002: Failure Isolation
**Statement**: A single instance failure SHALL NOT affect pipelines on other instances.
**Rationale**: Ensures reliability

### NFR-003: Filesystem Performance
**Statement**: The filesystem SHALL handle concurrent reads/writes from multiple instances.
**Rationale**: Enables parallel execution

### NFR-004: Redis Coordination
**Statement**: The system SHALL use Redis pub/sub for cross-instance event coordination.
**Rationale**: Enables real-time event broadcasting across instances

## Dependencies

- Shared filesystem (NFS, EFS, Docker volume)
- Redis (for pub/sub coordination)
- nginx (load balancing)
- LLM Provider (external)

## Shared Filesystem Structure

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
├── artifacts/{pipelineId}/
logs/
checkpoints/
```
