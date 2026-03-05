/**
 * Unit tests for FanInHandler
 */

import { describe, it } from 'node:test';
import assert from 'assert';
import { FanInHandler } from '../src/handlers/fanin.js';

describe('FanInHandler', () => {
  it('should create FanInHandler instance', () => {
    const handler = new FanInHandler();
    assert.ok(handler instanceof FanInHandler);
  });

  it('should accept backend parameter', () => {
    const backend = {};
    const handler = new FanInHandler(backend);
    assert.strictEqual(handler.backend, backend);
  });

  it('should handle null backend', () => {
    const handler = new FanInHandler(null);
    assert.strictEqual(handler.backend, null);
  });
});