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

  it('should execute Node.js code', async () => {
    const node = {
      id: 'test-node-js',
      attributes: {
        tool_command: 'node -e "console.log(2 + 2)"'
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'success');
    assert.ok(result.context_updates['tool.output'].includes('4'));
    
    // Verify log files
    const stageDir = path.join(tempLogsDir, node.id);
    const stdout = await fs.readFile(path.join(stageDir, 'stdout.txt'), 'utf-8');
    assert.strictEqual(stdout.trim(), '4');
  });

  it('should capture code execution output', async () => {
    const node = {
      id: 'test-node-output',
      attributes: {
        tool_command: 'node -e "const x = [1,2,3]; console.log(x.map(n => n * 2));"'
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'success');
    assert.ok(result.context_updates['tool.output'].includes('2'));
    assert.ok(result.context_updates['tool.output'].includes('4'));
    assert.ok(result.context_updates['tool.output'].includes('6'));
  });

  it('should handle code execution with errors', async () => {
    const node = {
      id: 'test-node-error',
      attributes: {
        tool_command: 'node -e "throw new Error(\"test error\")"'
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'fail');
    assert.ok(result.failure_reason.includes('Error') || result.failure_reason.includes('test error'));
  });

  it('should update context with tool output', async () => {
    const node = {
      id: 'test-node-context',
      attributes: {
        tool_command: 'echo "output_value"'
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.ok(result.context_updates);
    assert.strictEqual(result.context_updates['tool.output'], 'output_value');
    // Note: context updates are in the outcome, caller must apply them to context
  });

  it('should handle multiline code output', async () => {
    const node = {
      id: 'test-node-multiline',
      attributes: {
        tool_command: "printf 'line1\\nline2\\nline3'"
      },
      attrs: {}
    };
    
    const context = new Context();
    const graph = {};
    
    const result = await handler.execute(node, context, graph, tempLogsDir);
    
    assert.strictEqual(result.status, 'success');
    assert.ok(result.context_updates['tool.output'].includes('line1'));
    assert.ok(result.context_updates['tool.output'].includes('line2'));
    assert.ok(result.context_updates['tool.output'].includes('line3'));
  });
});