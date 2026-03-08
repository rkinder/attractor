/**
 * Redis Storage Module
 * Provides Redis-backed state persistence with fallback to in-memory
 * Includes pub/sub, pipeline ownership, and distributed coordination
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';

class RedisStorage {
  constructor() {
    this.redis = null;
    this.subscriber = null;
    this.inMemoryFallback = new Map();
    this.connected = false;
    this.usingFallback = false;
    this.instanceId = `instance_${uuidv4().substring(0, 8)}`;
  }

  getInstanceId() {
    return this.instanceId;
  }

  async connect() {
    const redisConfig = config.getRedis();
    
    try {
      this.redis = new Redis({
        ...redisConfig,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[RedisStorage] Max retries reached, using in-memory fallback');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 1
      });

      this.redis.on('error', (err) => {
        console.warn('[RedisStorage] Redis error:', err.message);
      });

      this.redis.on('connect', () => {
        this.connected = true;
        this.usingFallback = false;
        console.log('[RedisStorage] Connected to Redis');
      });

      this.redis.on('close', () => {
        this.connected = false;
        console.warn('[RedisStorage] Redis connection closed');
      });

      await this.redis.connect();
    } catch (error) {
      console.warn('[RedisStorage] Failed to connect to Redis, using in-memory fallback:', error.message);
      this.usingFallback = true;
      this.connected = false;
    }
  }

  async disconnect() {
    if (this.redis && this.connected) {
      try {
        await this.redis.quit();
      } catch (error) {
        console.warn('[RedisStorage] Error disconnecting:', error.message);
      }
    }
    this.redis = null;
    this.connected = false;
  }

  isConnected() {
    return this.connected && !this.usingFallback;
  }

  _isFallback() {
    return this.usingFallback || !this.redis;
  }

  async _execute(operation, fallbackValue) {
    if (this._isFallback()) {
      return fallbackValue;
    }
    
    try {
      return await operation();
    } catch (error) {
      console.warn('[RedisStorage] Operation failed, using fallback:', error.message);
      return fallbackValue;
    }
  }

  async set(key, value, ttlSeconds = null) {
    return this._execute(async () => {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    }, () => {
      this.inMemoryFallback.set(key, value);
      return true;
    });
  }

  async get(key) {
    return this._execute(async () => {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    }, () => {
      return this.inMemoryFallback.get(key) ?? null;
    });
  }

  async del(key) {
    return this._execute(async () => {
      await this.redis.del(key);
      return true;
    }, () => {
      this.inMemoryFallback.delete(key);
      return true;
    });
  }

  async exists(key) {
    return this._execute(async () => {
      return await this.redis.exists(key);
    }, () => {
      return this.inMemoryFallback.has(key) ? 1 : 0;
    });
  }

  async hset(hashKey, field, value) {
    return this._execute(async () => {
      await this.redis.hset(hashKey, field, JSON.stringify(value));
      return true;
    }, () => {
      const hash = this.inMemoryFallback.get(hashKey) || {};
      hash[field] = value;
      this.inMemoryFallback.set(hashKey, hash);
      return true;
    });
  }

  async hget(hashKey, field) {
    return this._execute(async () => {
      const value = await this.redis.hget(hashKey, field);
      return value ? JSON.parse(value) : null;
    }, () => {
      const hash = this.inMemoryFallback.get(hashKey) || {};
      return hash[field] ?? null;
    });
  }

  async hgetall(hashKey) {
    return this._execute(async () => {
      const result = await this.redis.hgetall(hashKey);
      if (!result) return {};
      
      const parsed = {};
      for (const [key, value] of Object.entries(result)) {
        try {
          parsed[key] = JSON.parse(value);
        } catch {
          parsed[key] = value;
        }
      }
      return parsed;
    }, () => {
      return this.inMemoryFallback.get(hashKey) || {};
    });
  }

  async hdel(hashKey, ...fields) {
    return this._execute(async () => {
      await this.redis.hdel(hashKey, ...fields);
      return true;
    }, () => {
      const hash = this.inMemoryFallback.get(hashKey) || {};
      for (const field of fields) {
        delete hash[field];
      }
      this.inMemoryFallback.set(hashKey, hash);
      return true;
    });
  }

  async sadd(setKey, ...members) {
    return this._execute(async () => {
      const serialized = members.map(m => JSON.stringify(m));
      await this.redis.sadd(setKey, ...serialized);
      return true;
    }, () => {
      const set = this.inMemoryFallback.get(setKey) || new Set();
      for (const member of members) {
        set.add(JSON.stringify(member));
      }
      this.inMemoryFallback.set(setKey, set);
      return true;
    });
  }

  async smembers(setKey) {
    return this._execute(async () => {
      const members = await this.redis.smembers(setKey);
      return members.map(m => JSON.parse(m));
    }, () => {
      const set = this.inMemoryFallback.get(setKey) || new Set();
      return Array.from(set).map(m => JSON.parse(m));
    });
  }

  async rpush(listKey, ...values) {
    return this._execute(async () => {
      const serialized = values.map(v => JSON.stringify(v));
      await this.redis.rpush(listKey, ...serialized);
      return true;
    }, () => {
      const list = this.inMemoryFallback.get(listKey) || [];
      list.push(...values);
      this.inMemoryFallback.set(listKey, list);
      return true;
    });
  }

  async lrange(listKey, start, stop) {
    return this._execute(async () => {
      const items = await this.redis.lrange(listKey, start, stop);
      return items.map(item => JSON.parse(item));
    }, () => {
      const list = this.inMemoryFallback.get(listKey) || [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    });
  }

  async lpop(listKey) {
    return this._execute(async () => {
      const item = await this.redis.lpop(listKey);
      return item ? JSON.parse(item) : null;
    }, () => {
      const list = this.inMemoryFallback.get(listKey) || [];
      return list.shift() ?? null;
    });
  }

  async publish(channel, message) {
    return this._execute(async () => {
      await this.redis.publish(channel, JSON.stringify(message));
      return true;
    }, () => {
      return true;
    });
  }

  async subscribe(channel, callback) {
    if (this._isFallback()) {
      console.warn('[RedisStorage] Cannot subscribe in fallback mode');
      return;
    }

    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          console.error('[RedisStorage] Failed to parse message:', error);
        }
      }
    });

    return () => subscriber.unsubscribe(channel);
  }

  async setPipelineState(pipelineId, state, ttlSeconds = null) {
    const key = `pipeline:${pipelineId}`;
    return this.set(key, state, ttlSeconds);
  }

  async getPipelineState(pipelineId) {
    const key = `pipeline:${pipelineId}`;
    return this.get(key);
  }

  async deletePipelineState(pipelineId) {
    const key = `pipeline:${pipelineId}`;
    return this.del(key);
  }

  async addArtifactMetadata(pipelineId, artifactId, metadata) {
    const key = `artifact:${pipelineId}:meta`;
    return this.hset(key, artifactId, metadata);
  }

  async getArtifactMetadata(pipelineId, artifactId) {
    const key = `artifact:${pipelineId}:meta`;
    return this.hget(key, artifactId);
  }

  async getAllArtifactMetadata(pipelineId) {
    const key = `artifact:${pipelineId}:meta`;
    return this.hgetall(key);
  }

  async addDecision(decision) {
    const key = 'coordinator:decisions';
    const ttl = config.getCoordinator().decisionHistoryTTL;
    return this.rpush(key, decision);
  }

  async getDecisions(limit = 100) {
    const key = 'coordinator:decisions';
    const items = await this.lrange(key, -limit, -1);
    return items.reverse();
  }

  // ==================== Pub/Sub ====================

  async publish(channel, message) {
    const messageWithInstance = {
      ...message,
      _sourceInstance: this.instanceId,
      _timestamp: new Date().toISOString()
    };
    
    return super.publish(channel, messageWithInstance);
  }

  async subscribe(channel, callback) {
    if (this._isFallback()) {
      console.warn('[RedisStorage] Cannot subscribe in fallback mode');
      return () => {};
    }

    if (!this.subscriber) {
      this.subscriber = this.redis.duplicate();
      await this.subscriber.connect();
    }

    await this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          console.error('[RedisStorage] Failed to parse message:', error);
        }
      }
    });

    return () => this.subscriber.unsubscribe(channel);
  }

  async publishEvent(eventType, data) {
    const messageWithInstance = {
      type: eventType,
      data,
      _sourceInstance: this.instanceId,
      _timestamp: new Date().toISOString()
    };
    return this.publish('attractor:events', messageWithInstance);
  }

  async subscribeToEvents(callback) {
    return this.subscribe('attractor:events', callback);
  }

  // ==================== Pipeline Ownership ====================

  async acquirePipelineOwnership(pipelineId, instanceId = null) {
    const owner = instanceId || this.instanceId;
    const key = `pipeline:${pipelineId}:owner`;
    const ttl = 300; // 5 minutes timeout

    return this._execute(async () => {
      // Use SET NX EX for atomic acquire
      const result = await this.redis.set(key, owner, 'EX', ttl, 'NX');
      if (result === 'OK') {
        return { success: true, owner };
      }
      
      // Check if current owner
      const currentOwner = await this.redis.get(key);
      if (currentOwner === owner) {
        // Extend ownership
        await this.redis.expire(key, ttl);
        return { success: true, owner };
      }
      
      return { success: false, owner: currentOwner };
    }, () => {
      // In fallback mode, always succeed
      this.inMemoryFallback.set(key, owner);
      return { success: true, owner };
    });
  }

  async releasePipelineOwnership(pipelineId, instanceId = null) {
    const owner = instanceId || this.instanceId;
    const key = `pipeline:${pipelineId}:owner`;

    return this._execute(async () => {
      const currentOwner = await this.redis.get(key);
      if (currentOwner === owner) {
        await this.redis.del(key);
        return { success: true };
      }
      return { success: false, error: 'Not the owner' };
    }, () => {
      this.inMemoryFallback.delete(key);
      return { success: true };
    });
  }

  async getPipelineOwner(pipelineId) {
    const key = `pipeline:${pipelineId}:owner`;
    return this.get(key);
  }

  async renewPipelineOwnership(pipelineId, instanceId = null) {
    const owner = instanceId || this.instanceId;
    const key = `pipeline:${pipelineId}:owner`;
    const ttl = 300;

    return this._execute(async () => {
      const currentOwner = await this.redis.get(key);
      if (currentOwner === owner) {
        await this.redis.expire(key, ttl);
        return { success: true };
      }
      return { success: false, error: 'Not the owner' };
    }, () => {
      return { success: true };
    });
  }

  // ==================== Instance Heartbeat ====================

  async startHeartbeat(intervalMs = 30000) {
    const key = `instance:${this.instanceId}:heartbeat`;
    
    const beat = async () => {
      if (!this._isFallback()) {
        try {
          await this.redis.set(key, Date.now(), 'EX', 60);
        } catch (error) {
          console.warn('[RedisStorage] Heartbeat failed:', error.message);
        }
      }
    };

    beat(); // Initial beat
    this._heartbeatInterval = setInterval(beat, intervalMs);
  }

  async stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
    
    const key = `instance:${this.instanceId}:heartbeat`;
    await this.del(key);
  }

  async getActiveInstances() {
    const pattern = 'instance:*:heartbeat';
    
    return this._execute(async () => {
      const keys = await this.redis.keys(pattern);
      const instances = [];
      
      for (const key of keys) {
        const instanceId = key.replace('instance:', '').replace(':heartbeat', '');
        const lastBeat = await this.redis.get(key);
        instances.push({
          instanceId,
          lastBeat: parseInt(lastBeat, 10)
        });
      }
      
      return instances;
    }, () => {
      return [{ instanceId: this.instanceId, lastBeat: Date.now() }];
    });
  }

  // ==================== Coordinator Election ====================

  async acquireCoordinatorLock(lockName = 'coordinator', ttlSeconds = 30) {
    const key = `lock:${lockName}`;
    
    return this._execute(async () => {
      const result = await this.redis.set(key, this.instanceId, 'EX', ttlSeconds, 'NX');
      
      if (result === 'OK') {
        // Schedule renewal
        const renewInterval = setInterval(async () => {
          await this.redis.expire(key, ttlSeconds);
        }, (ttlSeconds * 1000) / 2);
        
        this._coordinatorLockRenew = renewInterval;
        return { success: true, lockHolder: this.instanceId };
      }
      
      const currentHolder = await this.redis.get(key);
      return { success: false, lockHolder: currentHolder };
    }, () => {
      this._coordinatorLockHeld = lockName;
      return { success: true, lockHolder: this.instanceId };
    });
  }

  async releaseCoordinatorLock(lockName = 'coordinator') {
    const key = `lock:${lockName}`;
    
    if (this._coordinatorLockRenew) {
      clearInterval(this._coordinatorLockRenew);
      this._coordinatorLockRenew = null;
    }
    
    return this._execute(async () => {
      const currentHolder = await this.redis.get(key);
      if (currentHolder === this.instanceId) {
        await this.redis.del(key);
      }
      return { success: true };
    }, () => {
      this._coordinatorLockHeld = null;
      return { success: true };
    });
  }

  async isCoordinator() {
    const key = 'lock:coordinator';
    const holder = await this.get(key);
    return holder === this.instanceId;
  }
}

export const redisStorage = new RedisStorage();
export default redisStorage;
