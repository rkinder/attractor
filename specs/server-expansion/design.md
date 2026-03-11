# Design: Attractor Server Expansion

## Overview

This document outlines the expansion of the Attractor HTTP server to include a workflow coordinator service, persistent storage via filesystem, and containerization support. The expansion enables long-running, stateful workflows that can pause, resume, and trigger subsequent workflows based on execution results.

## Architecture

### Current Architecture
```
HTTP Request → Express → PipelineManager → Attractor → Filesystem
                              ↓
                        In-Memory Map
```

### Target Architecture
```
External APIs/Workers → HTTP Server → CoordinatorService
                                           ↓
                    ┌───────────────────────┼───────────────────────┐
                    ↓                       ↓                       ↓
                 Redis                  Filesystem               Filesystem
                    ↓                       ↓                       ↓
                    │         ┌─────────────┴─────────────┐        │
                    └─────────┤        Attractor          ├────────┘
                              └───────────────────────────┘
```

### Data Flow

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Pipeline state | Filesystem (JSON) | Persistence, simple |
| Artifact metadata | Filesystem (JSON) | Files on disk, metadata in JSON index |
| Workflow triggers | Filesystem queue | Async processing, simple file-based queue |
| Coordinator decisions | Filesystem (JSON) + Redis pub/sub | Persistence + cross-instance broadcast |
| Large log files | Filesystem | No size limits |
| Cross-instance events | Redis pub/sub | Real-time coordination |

## Functional Requirements

### FR-001: Workflow Coordinator Service
**Type**: Event-driven
**Statement**: WHEN a pipeline completes, the coordinator service SHALL analyze the output and determine the next action.
**Rationale**: Enables automated workflow chaining without human intervention

### FR-002: Filesystem State Persistence
**Type**: Ubiquitous
**Statement**: The system SHALL persist pipeline execution state to filesystem JSON files for persistence and recovery.
**Rationale**: Enables recovery from server restarts and distributed access via shared filesystem

### FR-003: Queue-Based Triggers
**Type**: Event-driven  
**Statement**: WHEN a message is received on the workflow trigger queue, the system SHALL create and execute the appropriate workflow.
**Rationale**: Enables external systems to initiate workflows asynchronously

### FR-004: Human Intervention API
**Type**: Ubiquitous
**Statement**: The system SHALL provide REST endpoints for humans to provide clarification, approval, or additional context during workflow execution.
**Rationale**: Enables human-in-the-loop workflows via API instead of blocking

### FR-005: Artifact Storage (Filesystem)
**Type**: Ubiquitous
**Statement**: The system SHALL store workflow artifacts (DOT files, logs, outputs) in filesystem with JSON metadata for retrieval.
**Rationale**: Enables debugging, auditing, and reuse; no external dependencies

### FR-006: WebSocket Events for Coordinator
**Type**: Event-driven
**Statement**: WHEN the coordinator takes an action, the system SHALL broadcast the action via WebSocket to interested clients.
**Rationale**: Enables real-time visibility into workflow orchestration decisions

### FR-007: Concurrent Pipeline Support
**Type**: Ubiquitous
**Statement**: The system SHALL handle multiple pipelines writing artifacts concurrently without lock contention.
**Rationale**: Enables high-throughput scenarios

### FR-008: Distributed Coordination via Redis
**Type**: Event-driven
**Statement**: WHEN a coordinator decision is made, the system SHALL publish the decision to Redis for cross-instance coordination.
**Rationale**: Enables multiple instances to be aware of coordinator decisions

## Non-Functional Requirements

### NFR-001: Startup Time
**Statement**: The server SHALL start within 5 seconds on standard hardware.
**Rationale**: Enables rapid deployment and scaling

### NFR-002: Queue Latency
**Statement**: The system SHALL process queue messages within 100ms of receipt.
**Rationale**: Enables responsive workflow chaining

### NFR-003: Persistence Durability
**Statement**: Pipeline state SHALL be persisted within 1 second of state change.
**Rationale**: Ensures minimal data loss on crash

### NFR-004: Horizontal Scalability
**Statement**: The coordinator service SHALL support running multiple instances with shared filesystem for coordination.
**Rationale**: Enables high-throughput scenarios

### NFR-005: Write Concurrency
**Statement**: The system SHALL handle at least 10 concurrent pipelines writing artifacts.
**Rationale**: Enables parallel execution

## Dependencies

- Redis (for pub/sub, distributed coordination)
- Filesystem (for state, metadata, artifacts, queues)
- Docker/Docker Compose (for deployment)
- Shared filesystem (NFS/EFS) for distributed deployments
- Existing Attractor core

## Open Questions

1. Should the coordinator use rules-based or LLM-based decision making?
2. How to handle circular workflow dependencies?
3. What is the retention policy for artifacts?
4. How to secure the human intervention API?
