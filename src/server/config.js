/**
 * Server Configuration Module
 * Centralized configuration for Attractor server with environment variable support
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const defaults = {
  server: {
    host: '0.0.0.0',
    port: 3000,
    env: process.env.NODE_ENV || 'development'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: true
  },
  storage: {
    artifactsDir: process.env.ARTIFACTS_DIR || path.join(process.cwd(), 'data', 'artifacts'),
    logsDir: process.env.LOGS_DIR || path.join(process.cwd(), 'logs'),
    checkpointsDir: process.env.CHECKPOINTS_DIR || path.join(process.cwd(), 'checkpoints')
  },
  queue: {
    triggerQueue: 'workflow:triggers',
    processingDelay: 100,
    maxRetries: 3
  },
  coordinator: {
    enabled: process.env.COORDINATOR_ENABLED === 'true',
    decisionHistoryTTL: 86400 * 7,
    pipelineStateTTL: 86400
  },
  artifacts: {
    maxSize: parseInt(process.env.MAX_ARTIFACT_SIZE || '10485760', 10),
    retentionDays: parseInt(process.env.ARTIFACT_RETENTION_DAYS || '30', 10)
  },
  http: {
    cors: process.env.CORS_ORIGIN || '*',
    bodyLimit: '10mb'
  }
};

class Config {
  constructor() {
    this._config = this._deepClone(defaults);
    this._applyEnvOverrides();
  }

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _applyEnvOverrides() {
    if (process.env.SERVER_HOST) this._config.server.host = process.env.SERVER_HOST;
    if (process.env.SERVER_PORT) this._config.server.port = parseInt(process.env.SERVER_PORT, 10);
    if (process.env.ARTIFACTS_DIR) this._config.storage.artifactsDir = process.env.ARTIFACTS_DIR;
  }

  get(key) {
    const keys = key.split('.');
    let value = this._config;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    return value;
  }

  set(key, value) {
    const keys = key.split('.');
    let target = this._config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }

  getServer() {
    return { ...this._config.server };
  }

  getRedis() {
    return { ...this._config.redis };
  }

  getStorage() {
    return { ...this._config.storage };
  }

  getQueue() {
    return { ...this._config.queue };
  }

  getCoordinator() {
    return { ...this._config.coordinator };
  }

  getArtifacts() {
    return { ...this._config.artifacts };
  }

  getHttp() {
    return { ...this._config.http };
  }

  isProduction() {
    return this._config.server.env === 'production';
  }

  isDevelopment() {
    return this._config.server.env === 'development';
  }

  toJSON() {
    return this._deepClone(this._config);
  }
}

export const config = new Config();
export default config;
