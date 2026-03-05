import { test } from 'node:test';
import assert from 'node:assert';
import { StackManagerLoopHandler } from '../src/handlers/stack-manager-loop.js';
import { Context } from '../src/pipeline/context.js';
import { Outcome } from '../src/pipeline/outcome.js';
import fs from 'fs/promises';
import path from 'path';

test('StackManagerLoopHandler can be instantiated', () => {
  const handler = new StackManagerLoopHandler();
  assert.ok(handler);
  assert.ok(handler instanceof StackManagerLoopHandler);
});

test('StackManagerLoopHandler handles basic execution', async () => {
  const handler = new StackManagerLoopHandler();
  const context = new Context();
  const logsRoot = './test-logs';
  
  // Create a mock node
  const node = {
    id: 'test-loop',
    attributes: {}
  };
  
  // Create a mock graph
  const graph = {
    getIncomingEdges: () => [],
    getOutgoingEdges: () => []
  };
  
  try {
    // Execute the handler
    const result = await handler.execute(node, context, graph, logsRoot);
    
    // Should return a successful outcome
    assert.ok(result);
    assert.strictEqual(result.status, 'success');
    
    // Check that log files were created
    const logFiles = await fs.readdir(logsRoot);
    assert(logFiles.includes('test-loop'));
    
  } finally {
    // Cleanup
    try {
      await fs.rm(logsRoot, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});

test('StackManagerLoopHandler handles loop iteration limits', async () => {
  const handler = new StackManagerLoopHandler();
  const context = new Context();
  const logsRoot = './test-logs-2';
  
  // Set up a loop counter that exceeds the limit
  context.set('loop.test-loop', 101); // Exceeds default limit of 100
  
  // Create a mock node
  const node = {
    id: 'test-loop',
    attributes: {}
  };
  
  // Create a mock graph
  const graph = {
    getIncomingEdges: () => [],
    getOutgoingEdges: () => []
  };
  
  try {
    // Execute the handler
    const result = await handler.execute(node, context, graph, logsRoot);
    
    // Should return a failed outcome due to iteration limit
    assert.ok(result);
    assert.strictEqual(result.status, 'fail');
    
  } finally {
    // Cleanup
    try {
      await fs.rm(logsRoot, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});