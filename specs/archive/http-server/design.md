# Design: HTTP Server

## Overview

HTTP Server provides a REST API for remote pipeline execution, enabling Attractor to run as a service. Clients submit DOT pipelines via HTTP, receive pipeline IDs, poll for status, and retrieve results.

**Problem Statement**: Attractor currently runs as CLI tool requiring direct file system access. Production systems need remote execution via HTTP API with status monitoring and result retrieval.

**Solution**: Implement FastAPI-style REST API using Express.js or Fastify with endpoints for pipeline submission, status checking, cancellation, and WebSocket events for real-time updates.

## Architecture

### Components

1. **HTTP Server** (`src/server/index.js`) - Express/Fastify application
2. **Pipeline Manager** (`src/server/pipeline-manager.js`) - Tracks executing pipelines
3. **API Routes** - POST /pipelines, GET /pipelines/:id, DELETE /pipelines/:id
4. **WebSocket Server** (`src/server/websocket.js`) - Real-time status updates

### Framework Choice
**Recommended**: Fastify (faster, better TypeScript support, similar to Python FastAPI)
**Alternative**: Express (more familiar, larger ecosystem)

## Functional Requirements

### FR-001: Pipeline Submission Endpoint
**Type**: Event-driven  
**Statement**: WHEN a client POSTs DOT source to `/pipelines`, the system shall create pipeline ID, start execution asynchronously, and return 202 Accepted with ID.

### FR-002: Status Endpoint
**Type**: Ubiquitous  
**Statement**: The system shall provide GET `/pipelines/:id` returning status (pending/running/completed/failed), timestamps, and outcome.

### FR-003: List Pipelines Endpoint
**Type**: Ubiquitous  
**Statement**: The system shall provide GET `/pipelines` returning all pipeline IDs and statuses.

### FR-004: Cancellation Endpoint
**Type**: Event-driven  
**Statement**: WHEN a client POSTs to `/pipelines/:id/cancel`, the system shall terminate execution and mark status as cancelled.

### FR-005: WebSocket Events
**Type**: Event-driven  
**Statement**: WHEN pipeline status changes, the system shall broadcast update to WebSocket clients subscribed to `/pipelines/:id/events`.

### FR-006: Auto-Approve Option
**Type**: Optional Feature  
**Statement**: WHERE `auto_approve: true` in request body, the system shall automatically approve human gates.

### FR-007: Error Handling
**Type**: Unwanted Behavior  
**Statement**: IF pipeline execution fails, THEN the system shall return error details in status response without crashing server.

### FR-008: Async Execution
**Type**: Ubiquitous  
**Statement**: The system shall execute pipelines asynchronously using async/await, not blocking HTTP request threads.

### FR-009: Pipeline Logs Access
**Type**: Optional Feature  
**Statement**: WHERE logs are requested, the system shall provide GET `/pipelines/:id/logs` returning log directory contents.

### FR-010: Health Check
**Type**: Ubiquitous  
**Statement**: The system shall provide GET `/health` returning service status and version.

## Non-Functional Requirements

- **NFR-001**: Handle 10 concurrent pipeline executions
- **NFR-002**: Response time <100ms for status endpoints
- **NFR-003**: CORS enabled for browser clients
- **NFR-004**: Graceful shutdown on SIGTERM

## Dependencies

- **Fastify** (^4.0.0) or **Express** (^4.18.0)
- **@fastify/websocket** or **ws** for WebSocket
- **@fastify/cors** or **cors** middleware

## Open Questions

1. Authentication? **Decision**: No auth for MVP (add middleware later)
2. Rate limiting? **Decision**: No limits for MVP
3. Persistent storage? **Decision**: In-memory only for MVP
