/**
 * Redis Storage Module
 * Provides pub/sub for distributed coordination
 */

import Redis from 'ioredis';
import config from '../config.js';

const CHANNELS = {
  PIPELINE_COMPLETE: 'attractor:pipeline:complete',
  PIPELINE_ERROR: 'attractor:pipeline:error',
  COORDINATOR_DECISION: 'attractor:coordinator:decision',
  WORKFLOW_TRIGGER: 'attractor:workflow:trigger'
};

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.subscribers = new Map();
    this.instanceId = `container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize() {
    const redisConfig = config.getRedis();
    
    if (!redisConfig.enabled) {
      console.log('[Redis] Disabled, using filesystem only');
      return false;
    }

    try {
      // Create separate connections for pub/sub
      this.publisher = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('[Redis] Max retries reached, giving up');
            return null;
          }
          return Math.min(times * 100, 3000);
        }
      });

      this.subscriber = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        }
      });

      this.client = this.publisher;

      // Set up subscriber message handler
      this.subscriber.on('message', (channel, message) => {
        const callbacks = this.subscribers.get(channel);
        if (callbacks) {
          try {
            const data = JSON.parse(message);
            callbacks.forEach(cb => cb(data, message));
          } catch (e) {
            console.error(`[Redis] Failed to parse message on ${channel}:`, e.message);
          }
        }
      });

      // Test connection
      await this.publisher.ping();
      console.log(`[Redis] Connected to ${redisConfig.host}:${redisConfig.port}`);
      console.log(`[Redis] Instance ID: ${this.instanceId}`);
      
      return true;
    } catch (error) {
      console.error('[Redis] Failed to connect:', error.message);
      return false;
    }
  }

  getInstanceId() {
    return this.instanceId;
  }

  isEnabled() {
    return this.client !== null;
  }

  async publish(channel, data) {
    if (!this.publisher) {
      return false;
    }
    try {
      await this.publisher.publish(channel, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`[Redis] Failed to publish to ${channel}:`, error.message);
      return false;
    }
  }

  async subscribe(channel, callback) {
    if (!this.subscriber) {
      return false;
    }
    
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      await this.subscriber.subscribe(channel);
    }
    
    this.subscribers.get(channel).add(callback);
    return true;
  }

  async unsubscribe(channel, callback) {
    if (!this.subscriber || !this.subscribers.has(channel)) {
      return;
    }

    const callbacks = this.subscribers.get(channel);
    callbacks.delete(callback);
    
    if (callbacks.size === 0) {
      this.subscribers.delete(channel);
      await this.subscriber.unsubscribe(channel);
    }
  }

  async publishPipelineComplete(pipelineId, data) {
    return this.publish(CHANNELS.PIPELINE_COMPLETE, {
      ...data,
      pipelineId,
      instanceId: this.instanceId,
      timestamp: new Date().toISOString()
    });
  }

  async publishPipelineError(pipelineId, error) {
    return this.publish(CHANNELS.PIPELINE_ERROR, {
      pipelineId,
      error: error.message || String(error),
      instanceId: this.instanceId,
      timestamp: new Date().toISOString()
    });
  }

  async publishCoordinatorDecision(decision) {
    return this.publish(CHANNELS.COORDINATOR_DECISION, {
      ...decision,
      instanceId: this.instanceId,
      timestamp: new Date().toISOString()
    });
  }

  async subscribePipelineComplete(callback) {
    return this.subscribe(CHANNELS.PIPELINE_COMPLETE, callback);
  }

  async subscribePipelineError(callback) {
    return this.subscribe(CHANNELS.PIPELINE_ERROR, callback);
  }

  async subscribeCoordinatorDecision(callback) {
    return this.subscribe(CHANNELS.COORDINATOR_DECISION, callback);
  }

  async close() {
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }
}

export const redisClient = new RedisClient();
export { CHANNELS };
export default redisClient;
