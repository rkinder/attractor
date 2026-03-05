# Requirements: HTTP Server

## Technical Specifications

### REQ-001: Server Application Setup
Create Fastify application in `src/server/index.js` with CORS, logging, and error handling middleware.

### REQ-002: PipelineManager Class
Create `PipelineManager` in `src/server/pipeline-manager.js` with Map storage for executions, methods: `create()`, `start()`, `cancel()`, `getStatus()`, `list()`.

### REQ-003: PipelineExecution Model
Define class with fields: id, dotSource, autoApprove, gateway, status, createdAt, startedAt, completedAt, outcomeStatus, outcomeNotes, error.

### REQ-004: POST /pipelines Endpoint
Accept JSON body `{ dot_source, auto_approve, gateway }`, create execution, start async, return `{ pipeline_id, status, created_at }`.

### REQ-005: GET /pipelines/:id Endpoint
Return full execution status including all timestamps and outcome details. Return 404 if not found.

### REQ-006: GET /pipelines Endpoint
Return array of all pipeline statuses. Empty array if none.

### REQ-007: POST /pipelines/:id/cancel Endpoint
Cancel execution by setting cancelled flag and calling `task.cancel()` (if using tasks). Return 200 with message.

### REQ-008: WebSocket /pipelines/:id/events Endpoint
Accept WebSocket connections, send initial status, broadcast status changes to all connected clients.

### REQ-009: Async Pipeline Execution
Execute pipeline in background using `async/await`, not blocking request handler. Use `setImmediate()` or separate async context.

### REQ-010: Error Propagation
Catch pipeline execution errors, store in execution.error, set status to FAILED, don't crash server.

### REQ-011: Health Check Endpoint
Implement GET `/health` returning `{ status: "healthy", service: "attractor-server", version: "0.1.0" }`.

### REQ-012: Graceful Shutdown
Listen for SIGTERM, cancel all running pipelines, close server, exit cleanly.

### REQ-013: Logs Root Configuration
Create logs directory per pipeline at `logs/<pipeline_id>`, pass to engine.

### REQ-014: Status Broadcasting
On status change, iterate WebSocket clients for that pipeline, send JSON status update.

### REQ-015: CORS Configuration
Enable CORS for all origins (`allow_origins: ["*"]`) for development. Document production config.

## Interface Contracts

### API Endpoints

```
POST /pipelines
Body: { dot_source: string, auto_approve?: boolean, gateway?: string }
Response: { pipeline_id: string, status: string, created_at: string }

GET /pipelines/:id
Response: { pipeline_id, status, created_at, started_at, completed_at, outcome_status, outcome_notes, error }

GET /pipelines
Response: [ { pipeline_id, status, ... }, ... ]

POST /pipelines/:id/cancel
Response: { message: "Pipeline cancelled" }

WS /pipelines/:id/events
Sends: { pipeline_id, status, ... } on status changes

GET /health
Response: { status: "healthy", service: "attractor-server", version: "0.1.0" }
```

### Status Values
- `pending`: Created, not started
- `running`: Currently executing
- `completed`: Finished successfully
- `failed`: Execution error
- `cancelled`: User cancelled

## Test Cases
- TC-001: POST /pipelines creates execution
- TC-002: GET /pipelines/:id returns status
- TC-003: GET /pipelines lists all
- TC-004: POST /pipelines/:id/cancel stops execution
- TC-005: WebSocket receives status updates
- TC-006: Pipeline executes asynchronously
- TC-007: Errors don't crash server
- TC-008: Health check returns 200
- TC-009: CORS headers present
- TC-010: Graceful shutdown works
