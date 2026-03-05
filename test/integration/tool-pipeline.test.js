/**
 * Integration test for ToolHandler with PipelineEngine
 */

import { describe, it } from 'node:test';
import assert from 'assert';
import { Attractor } from '../src/index.js';

describe('ToolHandler Integration', () => {
  it('should register tool handler correctly', async () => {
    // Test that tool handler is registered
    const attractor = await Attractor.create();
    assert.ok(attractor.handlerRegistry.has('tool'));
    
    // Test that it resolves to the correct handler type
    const node = {
      id: 'test-tool',
      shape: 'parallelogram',
      attributes: {
        tool_command: 'echo "test"'
      }
    };
    
    const handler = attractor.handlerRegistry.resolve(node);
    assert.ok(handler instanceof attractor.ToolHandler);
  });

  it('should resolve tool handler from shape', async () => {
    // Test that parallelogram shape resolves to tool handler
    const attractor = await Attractor.create();
    const node = {
      id: 'test-tool',
      shape: 'parallelogram',
      attributes: {
        tool_command: 'echo "test"'
      }
    };
    
    const handler = attractor.handlerRegistry.resolve(node);
    assert.ok(handler instanceof attractor.ToolHandler);
  });
});