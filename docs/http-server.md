# HTTP Server

The HTTP Server provides a REST API for remote pipeline execution, enabling Attractor to run as a service. Clients can submit DOT pipelines via HTTP, receive pipeline IDs, poll for status, and retrieve results.

## Overview

The HTTP server provides:

- **REST API**: Submit pipelines, check status, cancel executions
- **WebSocket Support**: Real-time status updates
- **Async Execution**: Non-blocking pipeline execution
- **CORS Enabled**: Browser-accessible API

## Quick Start

### Start the server

```bash
node src/server/index.js
```

The server runs on `http://localhost:3000` by default. Set `PORT` environment variable to change:

```bash
PORT=8080 node src/server/index.js
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server status:

```json
{
  "status": "healthy",
  "service": "attractor-server",
  "version": "0.1.0"
}
```

### List Pipelines

```
GET /pipelines
```

Returns all pipeline executions:

```json
[
  {
    "pipeline_id": "pipeline-abc123",
    "status": "completed",
    "created_at": "2024-01-15T10:30:00.000Z",
    "started_at": "2024-01-15T10:30:01.000Z",
    "completed_at": "2024-01-15T10:30:05.000Z",
    "outcome_status": "success"
  }
]
```

### Submit Pipeline

```
POST /pipelines
```

Submit a new pipeline for execution:

**Request:**

```json
{
  "dot_source": "digraph Test { start [shape=Mdiamond] exit [shape=Msquare] start -> exit }",
  "auto_approve": false,
  "gateway": "balanced"
}
```

**Response (202 Accepted):**

```json
{
  "pipeline_id": "pipeline-abc123",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### Get Pipeline Status

```
GET /pipelines/:id
```

Get detailed status of a specific pipeline:

```json
{
  "pipeline_id": "pipeline-abc123",
  "status": "completed",
  "created_at": "2024-01-15T10:30:00.000Z",
  "started_at": "2024-01-15T10:30:01.000Z",
  "completed_at": "2024-01-15T10:30:05.000Z",
  "outcome_status": "success",
  "outcome_notes": "Pipeline completed successfully",
  "error": null
}
```

### Cancel Pipeline

```
POST /pipelines/:id/cancel
```

Cancel a running pipeline:

```json
{
  "message": "Pipeline cancelled"
}
```

### Submit Clarification

```
POST /pipelines/:id/clarify
```

Submit an answer to a clarification question:

**Request:**
```json
{
  "question_id": "q_123_abc",
  "answer": "The user wants to proceed with option A"
}
```

**Response:**
```json
{
  "success": true,
  "nextAction": "resume"
}
```

### Submit Approval

```
POST /pipelines/:id/approve
```

Submit an approval decision:

**Request:**
```json
{
  "decision": "proceed",  // "proceed", "revise", or "abort"
  "notes": "Looks good, proceed with deployment"
}
```

**Response:**
```json
{
  "success": true,
  "nextAction": "trigger_next"
}
```

### Add Context

```
POST /pipelines/:id/context
```

Add additional context to a running pipeline:

**Request:**
```json
{
  "user_preference": "dark_mode",
  "feature_flag_enabled": true
}
```

**Response:**
```json
{
  "success": true
}
```

### Get Pending Questions

```
GET /pipelines/:id/questions
```

Get pending clarification questions for a pipeline:

**Response:**
```json
{
  "questions": [
    {
      "id": "q_123_abc",
      "text": "Which option would you prefer?",
      "stage": "analysis",
      "timeout": 300000,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Decision History

```
GET /pipelines/:id/decisions
```

Get coordinator decision history for a pipeline:

**Response:**
```json
{
  "decisions": [
    {
      "pipelineId": "pipeline-abc123",
      "type": "complete",
      "reason": "success",
      "timestamp": "2024-01-15T10:30:05.000Z"
    }
  ]
}
```

### WebSocket Events

```
WS /pipelines/:id/events
```

Connect via WebSocket for real-time status updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/pipelines/pipeline-abc123/events');

ws.on('message', (data) => {
  const status = JSON.parse(data);
  console.log('Status:', status.status);
});
```

The server sends status updates whenever the pipeline status changes.

#### Event Types

**Pipeline Status:**
```json
{
  "pipeline_id": "pipeline-abc123",
  "status": "running",
  "outcome_status": null
}
```

**Coordinator Decision:**
```json
{
  "type": "coordinator_decision",
  "data": {
    "pipelineId": "pipeline-abc123",
    "type": "complete",
    "reason": "success",
    "timestamp": "2024-01-15T10:30:05.000Z"
  }
}
```

**Human Request:**
```json
{
  "type": "human_request",
  "data": {
    "pipelineId": "pipeline-abc123",
    "question": {
      "id": "q_123",
      "text": "Which option?"
    },
    "reason": "awaiting_clarification"
  }
}
```

**Workflow Triggered:**
```json
{
  "type": "workflow_triggered",
  "data": {
    "pipelineId": "pipeline-abc123",
    "nextWorkflow": "workflows/next-step.dot"
  }
}
```

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Pipeline created, not started |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Execution error |
| `cancelled` | User cancelled |

## Redis Integration

The HTTP server can use Redis for state management and coordination:

### Without Redis (Default)
The server uses in-memory storage when Redis is unavailable.

### With Redis
Set environment variables to enable Redis:

```bash
REDIS_HOST=localhost REDIS_PORT=6379 node src/server/index.js
```

Redis enables:
- Pipeline state persistence across restarts
- Coordinator decision history
- Cross-instance artifact metadata
- Distributed deployment support

## Examples

### Using curl

```bash
# Submit a pipeline
curl -X POST http://localhost:3000/pipelines \
  -H "Content-Type: application/json" \
  -d '{"dot_source": "digraph Test { start -> exit }"}'

# Check status
curl http://localhost:3000/pipelines/pipeline-abc123

# List all pipelines
curl http://localhost:3000/pipelines

# Cancel a pipeline
curl -X POST http://localhost:3000/pipelines/pipeline-abc123/cancel
```

### Using JavaScript

```javascript
const response = await fetch('http://localhost:3000/pipelines', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dot_source: 'digraph Test { start -> exit }'
  })
});

const { pipeline_id } = await response.json();

// Poll for status
const statusResponse = await fetch(`http://localhost:3000/pipelines/${pipeline_id}`);
const status = await statusResponse.json();

console.log(status.status); // 'pending', 'running', 'completed', 'failed'
```

### Using WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000/pipelines/pipeline-abc123/events');

ws.on('message', (data) => {
  const status = JSON.parse(data);
  console.log(`Pipeline ${status.pipeline_id}: ${status.status}`);
});
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `REDIS_HOST` | localhost | Redis host for state management |
| `REDIS_PORT` | 6379 | Redis port |
| `COORDINATOR_ENABLED` | false | Enable workflow coordinator |
| `ARTIFACTS_DIR` | ./data/artifacts | Artifact storage path |

## Error Handling

### Invalid DOT Source

```json
{
  "error": "dot_source is required"
}
```

### Pipeline Not Found

```json
{
  "error": "Pipeline not found"
}
```

### Invalid Pipeline State

```json
{
  "error": "Pipeline is already in terminal state: completed"
}
```

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` signals:

1. Cancels all running pipelines
2. Closes WebSocket connections
3. Closes HTTP server
4. Exits cleanly

## Browser Access

CORS is enabled for all origins, so you can access the API from browser applications:

```javascript
// From any origin
fetch('http://localhost:3000/health')
  .then(res => res.json())
  .then(console.log);
```
