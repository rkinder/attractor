/**
 * Integration test for FanInHandler registration
 */

import { describe, it } from 'node:test';
import assert from 'assert';
import { Attractor } from '../src/index.js';

describe('FanInHandler Integration', () => {
  it('should register fanin handler correctly', async () => {
    // Test that fanin handler is registered
    const attractor = await Attractor.create();
    assert.ok(attractor.handlerRegistry.has('parallel.fan_in'));
    
    // Test that it resolves to the correct handler type
    const node = {
      id: 'test-fanin',
      shape: 'tripleoctagon',
      attributes: {}
    };
    
    const handler = attractor.handlerRegistry.resolve(node);
    assert.ok(handler instanceof attractor.FanInHandler);
  });

  it('should resolve fanin handler from tripleoctagon shape', async () => {
    // Test that tripleoctagon shape resolves to fanin handler
    const attractor = await Attractor.create();
    const node = {
      id: 'test-fanin',
      shape: 'tripleoctagon',
      attributes: {}
    };
    
    const handler = attractor.handlerRegistry.resolve(node);
    assert.ok(handler instanceof attractor.FanInHandler);
  });
});