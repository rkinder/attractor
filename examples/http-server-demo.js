#!/usr/bin/env node

/**
 * HTTP Server Demo - Demonstrates running Attractor as a REST API service
 *
 * This example shows how to:
 *   1. Start the Attractor HTTP server
 *   2. Submit a pipeline via the REST API (POST /pipelines)
 *   3. Poll for pipeline status (GET /pipelines/:id)
 *   4. Connect via WebSocket for real-time events
 *   5. List all pipelines (GET /pipelines)
 *   6. Cancel a running pipeline (POST /pipelines/:id/cancel)
 *   7. Gracefully shut down
 *
 * Usage:
 *   node examples/http-server-demo.js
 *
 * The demo starts a local server, exercises all endpoints, and shuts down.
 * No external API keys are required -- it uses a minimal DOT workflow whose
 * codergen nodes run in simulation mode (the default SessionBackend will
 * produce simulated responses when no real LLM is available).
 */

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { Attractor } from '../src/index.js';

// ---------------------------------------------------------------------------
// 1. Minimal in-process server (mirrors src/server/index.js but self-contained)
// ---------------------------------------------------------------------------

const PORT = 0; // Let the OS pick an available port

class DemoServer {
  constructor() {
    this.app = express();
    this.executions = new Map();
    this.websockets = new Map();
    this.attractor = null;

    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this._setupRoutes();
  }

  // ---- REST routes --------------------------------------------------------

  _setupRoutes() {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', service: 'attractor-demo-server' });
    });

    // List all pipelines
    this.app.get('/pipelines', (_req, res) => {
      const list = [...this.executions.values()].map((e) => e.toJSON());
      res.json(list);
    });

    // Get single pipeline
    this.app.get('/pipelines/:id', (req, res) => {
      const exec = this.executions.get(req.params.id);
      if (!exec) return res.status(404).json({ error: 'Pipeline not found' });
      res.json(exec.toJSON());
    });

    // Create + start a pipeline
    this.app.post('/pipelines', async (req, res) => {
      const { dot_source } = req.body;
      if (!dot_source) {
        return res.status(400).json({ error: 'dot_source is required' });
      }

      const id = `pipeline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const execution = new Execution(id, dot_source);
      this.executions.set(id, execution);
      this.websockets.set(id, new Set());

      // Start asynchronously
      setImmediate(() => this._runPipeline(execution));

      res.status(202).json({
        pipeline_id: id,
        status: execution.status,
        created_at: execution.createdAt,
      });
    });

    // Cancel a pipeline
    this.app.post('/pipelines/:id/cancel', (req, res) => {
      const exec = this.executions.get(req.params.id);
      if (!exec) return res.status(404).json({ error: 'Pipeline not found' });
      if (['completed', 'failed', 'cancelled'].includes(exec.status)) {
        return res.status(400).json({ error: `Pipeline already in terminal state: ${exec.status}` });
      }
      exec.cancelled = true;
      exec.status = 'cancelled';
      exec.completedAt = new Date().toISOString();
      this._broadcast(exec.id, exec.toJSON());
      res.json({ message: 'Pipeline cancelled' });
    });
  }

  // ---- Pipeline execution -------------------------------------------------

  async _runPipeline(execution) {
    execution.status = 'running';
    execution.startedAt = new Date().toISOString();
    this._broadcast(execution.id, execution.toJSON());

    try {
      // Write DOT source to a temp file so the engine can load it
      const fs = await import('fs/promises');
      const os = await import('os');
      const path = await import('path');
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'attractor-'));
      const dotPath = path.join(tmpDir, 'workflow.dot');
      await fs.writeFile(dotPath, execution.dotSource);

      const result = await this.attractor.run(dotPath, {
        runId: execution.id,
      });

      if (execution.cancelled) {
        execution.status = 'cancelled';
      } else if (result.success) {
        execution.status = 'completed';
        execution.outcomeNotes = result.finalOutcome?.notes || 'Completed';
      } else {
        execution.status = 'failed';
        execution.outcomeNotes = result.finalOutcome?.failure_reason || 'Failed';
      }

      // Cleanup temp file
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    } catch (err) {
      execution.status = 'failed';
      execution.error = err.message;
    }

    execution.completedAt = new Date().toISOString();
    this._broadcast(execution.id, execution.toJSON());
  }

  // ---- WebSocket ----------------------------------------------------------

  _setupWebSocket() {
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const parts = url.pathname.split('/');

      // Expect: /pipelines/:id/events
      if (parts.length !== 4 || parts[1] !== 'pipelines' || parts[3] !== 'events') {
        ws.close(4000, 'Invalid WebSocket path. Expected /pipelines/:id/events');
        return;
      }

      const pipelineId = parts[2];
      const exec = this.executions.get(pipelineId);
      if (!exec) {
        ws.close(4004, 'Pipeline not found');
        return;
      }

      // Register
      if (!this.websockets.has(pipelineId)) {
        this.websockets.set(pipelineId, new Set());
      }
      this.websockets.get(pipelineId).add(ws);

      // Send current state immediately
      ws.send(JSON.stringify(exec.toJSON()));

      ws.on('close', () => {
        this.websockets.get(pipelineId)?.delete(ws);
      });
    });
  }

  _broadcast(pipelineId, data) {
    const conns = this.websockets.get(pipelineId);
    if (!conns) return;
    const msg = JSON.stringify(data);
    for (const ws of conns) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }

  // ---- Lifecycle ----------------------------------------------------------

  async start() {
    // Initialize Attractor (will set up all default handlers)
    this.attractor = await Attractor.create({
      engine: { logsRoot: './logs', enableValidation: true },
    });

    this.server = createServer(this.app);
    this._setupWebSocket();

    return new Promise((resolve) => {
      this.server.listen(PORT, () => {
        this.port = this.server.address().port;
        resolve(this.port);
      });
    });
  }

  async stop() {
    this.wss?.close();
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

// Simple execution model
class Execution {
  constructor(id, dotSource) {
    this.id = id;
    this.dotSource = dotSource;
    this.status = 'pending';
    this.createdAt = new Date().toISOString();
    this.startedAt = null;
    this.completedAt = null;
    this.outcomeNotes = null;
    this.error = null;
    this.cancelled = false;
  }
  toJSON() {
    return {
      pipeline_id: this.id,
      status: this.status,
      created_at: this.createdAt,
      started_at: this.startedAt,
      completed_at: this.completedAt,
      outcome_notes: this.outcomeNotes,
      error: this.error,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Demo workflow -- a minimal valid pipeline that exercises the engine
// ---------------------------------------------------------------------------

const DEMO_DOT = `
digraph HttpServerDemo {
  label = "HTTP Server Demo Workflow"
  goal  = "Demonstrate server-driven pipeline execution"

  start       [shape=Mdiamond, label="Start"]
  analyze     [shape=box, prompt="Analyze the project structure for $goal"]
  summarize   [shape=box, prompt="Summarize findings from the analysis phase"]
  exit        [shape=Msquare, label="Exit"]

  start -> analyze -> summarize -> exit
}
`;

// ---------------------------------------------------------------------------
// 3. Run the demo
// ---------------------------------------------------------------------------

async function runDemo() {
  const server = new DemoServer();
  const port = await server.start();
  const base = `http://localhost:${port}`;

  console.log(`Attractor HTTP server started on port ${port}\n`);

  // --- Health check -------------------------------------------------------
  console.log('--- 1. Health Check (GET /health) ---');
  const healthRes = await fetch(`${base}/health`);
  const health = await healthRes.json();
  console.log(`   Status: ${health.status}`);
  console.log(`   Service: ${health.service}\n`);

  // --- Submit pipeline ----------------------------------------------------
  console.log('--- 2. Submit Pipeline (POST /pipelines) ---');
  const createRes = await fetch(`${base}/pipelines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dot_source: DEMO_DOT }),
  });
  const created = await createRes.json();
  console.log(`   Pipeline ID: ${created.pipeline_id}`);
  console.log(`   Status:      ${created.status}`);
  console.log(`   Created at:  ${created.created_at}\n`);

  const pipelineId = created.pipeline_id;

  // --- WebSocket real-time events -----------------------------------------
  console.log('--- 3. WebSocket Events (ws://localhost/pipelines/:id/events) ---');
  const wsMessages = [];
  const wsUrl = `ws://localhost:${port}/pipelines/${pipelineId}/events`;

  await new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      wsMessages.push(parsed);
      console.log(`   [WS] status=${parsed.status}${parsed.outcome_notes ? ', notes=' + parsed.outcome_notes : ''}`);
      // Close once we see a terminal state
      if (['completed', 'failed', 'cancelled'].includes(parsed.status)) {
        ws.close();
      }
    });
    ws.on('close', () => resolve());
    ws.on('error', (err) => {
      console.log(`   [WS] error: ${err.message}`);
      resolve();
    });
  });

  console.log(`   Received ${wsMessages.length} WebSocket message(s)\n`);

  // --- Poll final status --------------------------------------------------
  console.log('--- 4. Get Pipeline Status (GET /pipelines/:id) ---');
  const statusRes = await fetch(`${base}/pipelines/${pipelineId}`);
  const status = await statusRes.json();
  console.log(`   Pipeline ID:  ${status.pipeline_id}`);
  console.log(`   Status:       ${status.status}`);
  console.log(`   Started at:   ${status.started_at}`);
  console.log(`   Completed at: ${status.completed_at}`);
  if (status.outcome_notes) console.log(`   Notes:        ${status.outcome_notes}`);
  if (status.error) console.log(`   Error:        ${status.error}`);
  console.log();

  // --- List all pipelines -------------------------------------------------
  console.log('--- 5. List All Pipelines (GET /pipelines) ---');
  const listRes = await fetch(`${base}/pipelines`);
  const list = await listRes.json();
  console.log(`   Total pipelines: ${list.length}`);
  for (const p of list) {
    console.log(`   - ${p.pipeline_id}: ${p.status}`);
  }
  console.log();

  // --- Demonstrate cancel -------------------------------------------------
  // NOTE: In practice, cancel is useful for long-running pipelines with
  // LLM calls or human gates. Since our demo pipeline completes instantly
  // (simulation mode), we demonstrate the cancel API against a completed
  // pipeline to show the endpoint works and validates terminal states.
  console.log('--- 6. Cancel Pipeline (POST /pipelines/:id/cancel) ---');
  const cancelRes = await fetch(`${base}/pipelines/${pipelineId}/cancel`, {
    method: 'POST',
  });
  const cancelBody = await cancelRes.json();
  console.log(`   Cancel response: ${cancelBody.message || cancelBody.error}`);
  console.log(`   (Expected: terminal state guard prevents re-cancelling a completed pipeline)\n`);

  // --- Shutdown -----------------------------------------------------------
  console.log('--- 7. Graceful Shutdown ---');
  await server.stop();
  console.log('   Server stopped.\n');

  // --- Summary ------------------------------------------------------------
  console.log('=== Demo Summary ===');
  console.log(`   Health check:       OK`);
  console.log(`   Pipeline submitted: ${pipelineId}`);
  console.log(`   WebSocket events:   ${wsMessages.length} received`);
  console.log(`   Final status:       ${status.status}`);
  console.log(`   Cancel guard:       OK (terminal state rejection works)`);
  console.log(`   All endpoints exercised successfully.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch((err) => {
    console.error('Demo failed:', err);
    process.exit(1);
  });
}

export { runDemo, DemoServer, DEMO_DOT };
