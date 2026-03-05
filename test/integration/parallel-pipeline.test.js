/**
 * Integration test for ParallelHandler registration
 */

import { describe, it } from 'node:test';
import assert from 'assert';
import { Attractor } from '../src/index.js';

describe('ParallelHandler Integration', () => {
  it('should register parallel handler correctly', async () => {
    // Test that parallel handler is registered
    const attractor = await Attractor.create();
    assert.ok(attractor.handlerRegistry.has('parallel'));
    
    // Test that it resolves to the correct handler type
    const node = {
      id: 'test-parallel',
      shape: 'component',
      attributes: {
        max_parallel: 4
      }
    };
    
    const handler = attractor.handlerRegistry.resolve(node);
    assert.ok(handler instanceof attractor.ParallelHandler);
  });

  it('should resolve parallel handler from component shape', async () => {
    // Test that component shape resolves to parallel handler
    const attractor = await Attractor.create();
    const node = {
      id: 'test-parallel',
      shape: 'component',
      attributes: {}
    };
    
    const handler = attractor.handlerRegistry.resolve(node);
    assert.ok(handler instanceof attractor.ParallelHandler);
  });
});