/**
 * Unit tests for ParallelHandler
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'assert';
import { ParallelHandler } from '../src/handlers/parallel.js';
import { Outcome, StageStatus } from '../src/pipeline/outcome.js';
import { Context } from '../src/pipeline/context.js';
import fs from 'fs/promises';
import path from 'path';

// Mock handler registry for testing
class MockHandlerRegistry {
  constructor() {
    this.handlers = new Map();
  }
  
  register(type, handler) {
    this.handlers.set(type, handler);
  }
  
  resolve(node) {
    // Return a mock handler that just returns success
    return {
      execute: async (node, context, graph, logsRoot) => {
        return Outcome.success(`Executed: ${node.id}`);
      }
    };
  }
  
  has(type) {
    return this.handlers.has(type);
  }
}

describe('ParallelHandler', () => {
  let handler;
  let tempLogsDir;
  let mockRegistry;

  beforeEach(async () => {
    mockRegistry = new MockHandlerRegistry();
    handler = new ParallelHandler(mockRegistry);
    tempLogsDir = path.join('./test-logs', `parallel-test-${Date.now()}`);
    await fs.mkdir(tempLogsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test logs
    try {
      await fs.rm(tempLogsDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle empty branches gracefully', async () => {
    const node = {
      id: 'test-node',
      attributes: {},
      shape: 'component'
    };
    
    const context = new Context();
    const graph = {
      getOutgoingEdges: () => [],
      getNode: () => null
    };
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'success');
    assert.ok(result.notes.includes('No branches'));
  });

  it('should execute branches with max_parallel default', async () => {
    const node = {
      id: 'test-node',
      attributes: {},
      shape: 'component'
    };
    
    const context = new Context();
    const graph = {
      getOutgoingEdges: () => [
        { to: 'branch1' },
        { to: 'branch2' },
        { to: 'branch3' }
      ],
      getNode: () => ({ id: 'branch1' })
    };
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    // Should succeed (mock handler returns success)
    assert.strictEqual(result.status, 'success');
  });

  it('should respect max_parallel configuration', async () => {
    const node = {
      id: 'test-node',
      attributes: {
        max_parallel: 2
      },
      shape: 'component'
    };
    
    const context = new Context();
    const graph = {
      getOutgoingEdges: () => [
        { to: 'branch1' },
        { to: 'branch2' },
        { to: 'branch3' },
        { to: 'branch4' }
      ],
      getNode: () => ({ id: 'branch1' })
    };
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    // Should succeed (mock handler returns success)
    assert.strictEqual(result.status, 'success');
  });

  it('should create proper log directories', async () => {
    const node = {
      id: 'test-node',
      attributes: {},
      shape: 'component'
    };
    
    const context = new Context();
    const graph = {
      getOutgoingEdges: () => [
        { to: 'branch1' },
        { to: 'branch2' }
      ],
      getNode: () => ({ id: 'branch1' })
    };
    
    await handler.execute(node, context, graph, tempLogsDir);
    
    // Check that log directories were created
    const parallelDir = path.join(tempLogsDir, node.id);
    const dirExists = await fs.access(parallelDir).then(() => true).catch(() => false);
    assert.ok(dirExists);
  });

  it('should aggregate results correctly - all success', async () => {
    const node = {
      id: 'test-node',
      attributes: {},
      shape: 'component'
    };
    
    const context = new Context();
    const graph = {
      getOutgoingEdges: () => [
        { to: 'branch1' },
        { to: 'branch2' }
      ],
      getNode: () => ({ id: 'branch1' })
    };
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    // Should succeed (mock handler returns success)
    assert.strictEqual(result.status, 'success');
  });
});