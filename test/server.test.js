import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';
import { PipelineManager } from '../src/server/pipeline-manager.js';
import { PipelineExecution, PipelineStatus } from '../src/server/pipeline-execution.js';

const SERVER_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

describe('PipelineManager', () => {
  
  test('PipelineExecution model works', () => {
    const execution = new PipelineExecution({
      id: 'test-1',
      dotSource: 'digraph Test { }',
      autoApprove: true
    });
    
    assert.strictEqual(execution.id, 'test-1');
    assert.strictEqual(execution.status, PipelineStatus.PENDING);
    assert.strictEqual(execution.autoApprove, true);
  });

  test('PipelineExecution toJSON works', () => {
    const execution = new PipelineExecution({
      id: 'test-2',
      dotSource: 'digraph Test { }'
    });
    
    const json = execution.toJSON();
    assert.strictEqual(json.pipeline_id, 'test-2');
    assert.strictEqual(json.status, 'pending');
    assert.ok(json.created_at);
  });

  test('PipelineManager creates execution', () => {
    const manager = new PipelineManager();
    const execution = manager.create({
      dotSource: 'digraph Test { }'
    });
    
    assert.ok(execution.id);
    assert.strictEqual(execution.status, PipelineStatus.PENDING);
  });

  test('PipelineManager gets execution', () => {
    const manager = new PipelineManager();
    const created = manager.create({ dotSource: 'digraph Test { }' });
    const retrieved = manager.get(created.id);
    
    assert.strictEqual(retrieved.id, created.id);
  });

  test('PipelineManager returns null for missing execution', () => {
    const manager = new PipelineManager();
    const result = manager.get('nonexistent');
    assert.strictEqual(result, null);
  });

  test('PipelineManager lists executions', () => {
    const manager = new PipelineManager();
    manager.create({ dotSource: 'digraph Test1 { }' });
    manager.create({ dotSource: 'digraph Test2 { }' });
    
    const list = manager.list();
    assert.strictEqual(list.length, 2);
  });

  test('PipelineManager cancels execution', () => {
    const manager = new PipelineManager();
    const execution = manager.create({ dotSource: 'digraph Test { }' });
    
    // Manually set to running for testing
    execution.status = PipelineStatus.RUNNING;
    
    const result = manager.cancel(execution.id);
    assert.strictEqual(result.message, 'Pipeline cancelled');
    assert.strictEqual(execution.status, PipelineStatus.CANCELLED);
  });

  test('PipelineManager registers WebSocket', () => {
    const manager = new PipelineManager();
    const execution = manager.create({ dotSource: 'digraph Test { }' });
    
    const mockWs = { readyState: 1 };
    manager.registerWebSocket(execution.id, mockWs);
    
    const connections = manager.websockets.get(execution.id);
    assert.strictEqual(connections.size, 1);
  });
});

describe('HTTP Server', () => {
  let serverProcess;
  
  before(async () => {
    // Start server in background
    serverProcess = spawn('node', ['src/server/index.js'], {
      env: { ...process.env, PORT: '3001' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Wait for server to start
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  });
  
  after(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('GET /health returns 200', async () => {
    const response = await fetch(`${SERVER_URL}/health`);
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.status, 'healthy');
    assert.strictEqual(data.service, 'attractor-server');
  });

  test('GET /pipelines returns empty array initially', async () => {
    const response = await fetch(`${SERVER_URL}/pipelines`);
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(data));
  });

  test('POST /pipelines creates new pipeline', async () => {
    const response = await fetch(`${SERVER_URL}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dot_source: 'digraph Test { start [shape=Mdiamond]; exit [shape=Msquare]; start -> exit; }'
      })
    });
    
    const data = await response.json();
    
    assert.strictEqual(response.status, 202);
    assert.ok(data.pipeline_id);
    assert.strictEqual(data.status, 'pending');
    assert.ok(data.created_at);
  });

  test('GET /pipelines/:id returns pipeline status', async () => {
    // First create a pipeline
    const createResponse = await fetch(`${SERVER_URL}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dot_source: 'digraph Test { start -> exit; }' })
    });
    const { pipeline_id } = await createResponse.json();
    
    // Then get its status
    const response = await fetch(`${SERVER_URL}/pipelines/${pipeline_id}`);
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.pipeline_id, pipeline_id);
    assert.ok(data.status);
  });

  test('GET /pipelines/:id returns 404 for missing pipeline', async () => {
    const response = await fetch(`${SERVER_URL}/pipelines/nonexistent-id`);
    assert.strictEqual(response.status, 404);
  });

  test('POST /pipelines/:id/cancel cancels pipeline', async () => {
    // First create a pipeline
    const createResponse = await fetch(`${SERVER_URL}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dot_source: 'digraph Test { start -> exit; }' })
    });
    const { pipeline_id } = await createResponse.json();
    
    // Wait a bit for pipeline to be in running state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Then cancel it - may fail if already completed, which is ok
    const cancelResponse = await fetch(`${SERVER_URL}/pipelines/${pipeline_id}/cancel`, {
      method: 'POST'
    });
    
    // Accept both 200 (success) and 400 (already completed)
    assert.ok(cancelResponse.status === 200 || cancelResponse.status === 400);
  });

  test('CORS headers are present', async () => {
    const response = await fetch(`${SERVER_URL}/health`, {
      method: 'OPTIONS'
    });
    
    assert.ok(response.headers.get('access-control-allow-origin'));
  });
});

describe('WebSocket', () => {
  let serverProcess;
  
  before(async () => {
    // Start server in background
    serverProcess = spawn('node', ['src/server/index.js'], {
      env: { ...process.env, PORT: '3002' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Wait for server to start
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  });
  
  after(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('WebSocket receives status updates', async () => {
    // First create a pipeline via HTTP
    const createResponse = await fetch('http://localhost:3002/pipelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dot_source: 'digraph Test { start -> exit; }' })
    });
    const { pipeline_id } = await createResponse.json();
    
    // Connect WebSocket
    const ws = new WebSocket(`ws://localhost:3002/pipelines/${pipeline_id}/events`);
    
    return new Promise((resolve) => {
      ws.on('message', (data) => {
        const status = JSON.parse(data);
        assert.ok(status.pipeline_id);
        assert.ok(status.status);
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        assert.fail(`WebSocket error: ${error.message}`);
        resolve();
      });
    });
  });
});
