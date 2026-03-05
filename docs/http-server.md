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

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Pipeline created, not started |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Execution error |
| `cancelled` | User cancelled |

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
