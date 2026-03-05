/**
 * Attractor HTTP Server
 * 
 * REST API for remote pipeline execution with WebSocket support
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PipelineManager } from './pipeline-manager.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

// Initialize pipeline manager
const pipelineManager = new PipelineManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'attractor-server',
    version: '0.1.0'
  });
});

// List all pipelines
app.get('/pipelines', (req, res) => {
  try {
    const pipelines = pipelineManager.list();
    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pipeline status
app.get('/pipelines/:id', (req, res) => {
  try {
    const execution = pipelineManager.get(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.json(execution.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new pipeline
app.post('/pipelines', async (req, res) => {
  try {
    const { dot_source, auto_approve, gateway } = req.body;

    if (!dot_source) {
      return res.status(400).json({ error: 'dot_source is required' });
    }

    const execution = pipelineManager.create({
      dotSource: dot_source,
      autoApprove: auto_approve || false,
      gateway
    });

    // Start execution asynchronously
    setImmediate(async () => {
      try {
        await pipelineManager.start(execution.id);
      } catch (error) {
        console.error(`Pipeline ${execution.id} error:`, error.message);
      }
    });

    res.status(202).json({
      pipeline_id: execution.id,
      status: execution.status,
      created_at: execution.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel pipeline
app.post('/pipelines/:id/cancel', (req, res) => {
  try {
    const result = pipelineManager.cancel(req.params.id);
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  // Extract pipeline ID from URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/');
  
  // Expect URL format: /pipelines/:id/events
  if (pathParts.length !== 4 || pathParts[1] !== 'pipelines' || pathParts[3] !== 'events') {
    ws.close(4000, 'Invalid WebSocket path');
    return;
  }

  const pipelineId = pathParts[2];

  // Check if pipeline exists
  const execution = pipelineManager.get(pipelineId);
  if (!execution) {
    ws.close(4004, 'Pipeline not found');
    return;
  }

  // Register WebSocket
  pipelineManager.registerWebSocket(pipelineId, ws);

  // Send initial status
  ws.send(JSON.stringify(execution.toJSON()));

  // Handle close
  ws.on('close', () => {
    pipelineManager.unregisterWebSocket(pipelineId, ws);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error: ${error.message}`);
    pipelineManager.unregisterWebSocket(pipelineId, ws);
  });
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down gracefully...');
  
  // Cancel all running pipelines
  await pipelineManager.cancelAll();
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start server
async function start() {
  try {
    // Initialize pipeline manager
    await pipelineManager.initialize();
    
    server.listen(PORT, () => {
      console.log(`Attractor server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export for testing
export { app, server, pipelineManager };

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default app;
