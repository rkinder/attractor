/**
 * Unit tests for ToolHandler
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'assert';
import { ToolHandler } from '../src/handlers/tool.js';
import { Outcome } from '../src/pipeline/outcome.js';
import fs from 'fs/promises';
import path from 'path';
import { Context } from '../src/pipeline/context.js';

describe('ToolHandler', () => {
  let handler;
  let tempLogsDir;

  beforeEach(async () => {
    handler = new ToolHandler();
    tempLogsDir = path.join('./test-logs', `tool-test-${Date.now()}`);
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

  it('should fail when tool_command is missing', async () => {
    const node = {
      id: 'test-node',
      attributes: {},
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'fail');
    assert.ok(result.failure_reason.includes('No tool_command specified'));
    
    // Check that log files were created in the node's stage directory
    const stageDir = path.join(tempLogsDir, 'test-node');
    const logFiles = await fs.readdir(stageDir);
    assert.ok(logFiles.includes('command.txt'));
    assert.ok(logFiles.includes('outcome.json'));
  });

  it('should execute successful command', async () => {
    const node = {
      id: 'test-node',
      attributes: {
        tool_command: 'echo "Hello World"'
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'success');
    assert.ok(result.notes.includes('Tool completed'));
    assert.ok(result.context_updates['tool.output'].includes('Hello World'));
  });

  it('should handle command timeout', async () => {
    const node = {
      id: 'test-node',
      attributes: {
        tool_command: 'sleep 5',
        timeout: 100
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'fail');
    assert.ok(result.failure_reason.includes('timed out'));
  });

  it('should handle non-zero exit code', async () => {
    const node = {
      id: 'test-node',
      attributes: {
        tool_command: 'exit 1'
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'fail');
    assert.ok(result.failure_reason.includes('Exit code') || result.failure_reason.includes('Execution error'));
  });

  it('should create all required log files', async () => {
    const node = {
      id: 'test-node',
      attributes: {
        tool_command: 'echo "test"'
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    await handler.execute(node, context, graph, tempLogsDir);
    
    // Check that all required log files exist in the node's stage directory
    const stageDir = path.join(tempLogsDir, node.id);
    const expectedFiles = ['command.txt', 'stdout.txt', 'exit-code.txt', 'outcome.json'];
    for (const file of expectedFiles) {
      const filePath = path.join(stageDir, file);
      await fs.access(filePath);
    }
  });
});