/**
 * Pipeline Context - Thread-safe key-value store for pipeline state
 */

export class Context {
  constructor() {
    this.values = new Map();
    this.logs = [];
    this._lock = null; // In a real implementation, use proper async locks
  }

  set(key, value) {
    this.values.set(key, value);
  }

  get(key, defaultValue = null) {
    return this.values.has(key) ? this.values.get(key) : defaultValue;
  }

  getString(key, defaultValue = '') {
    const value = this.get(key);
    return value !== null ? String(value) : defaultValue;
  }

  getNumber(key, defaultValue = 0) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  getBoolean(key, defaultValue = false) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase();
    return str === 'true' || str === '1' || str === 'yes';
  }

  getObject(key, defaultValue = {}) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) return defaultValue;
      return value;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not valid JSON
      }
    }
    return defaultValue;
  }

  getArray(key, defaultValue = []) {
    const value = this.get(key);
    if (value === null) return defaultValue;
    if (Array.isArray(value)) return value;
    return defaultValue;
  }

  _getSecretPatterns() {
    const patterns = [];
    const secretSuffixes = ['_SECRET', '_KEY', '_TOKEN', '_PASSWORD'];
    
    for (const [key, value] of Object.entries(process.env)) {
      const upperKey = key.toUpperCase();
      const valueStr = String(value);
      
      for (const suffix of secretSuffixes) {
        if (upperKey.endsWith(suffix) && valueStr) {
          patterns.push({ pattern: valueStr, name: key });
        }
      }
    }
    
    return patterns;
  }

  _maskSecrets(message) {
    const patterns = this._getSecretPatterns();
    let masked = message;
    
    for (const { pattern } of patterns) {
      if (pattern && masked.includes(pattern)) {
        masked = masked.split(pattern).join('******');
      }
    }
    
    return masked;
  }

  appendLog(entry) {
    const maskedMessage = this._maskSecrets(String(entry));
    this.logs.push({
      timestamp: new Date(),
      message: maskedMessage
    });
  }

  snapshot() {
    const result = {};
    for (const [key, value] of this.values.entries()) {
      result[key] = value;
    }
    return result;
  }

  exportSession() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      values: this.snapshot(),
      logs: [...this.logs]
    };
  }

  importSession(sessionData) {
    if (!sessionData || typeof sessionData !== 'object') {
      throw new Error('Invalid session data: must be an object');
    }
    
    if (!sessionData.values || typeof sessionData.values !== 'object') {
      throw new Error('Invalid session data: missing or invalid values');
    }
    
    this.values = new Map(Object.entries(sessionData.values));
    
    if (Array.isArray(sessionData.logs)) {
      this.logs = [...sessionData.logs];
    }
    
    return this;
  }

  clone() {
    const newContext = new Context();
    for (const [key, value] of this.values.entries()) {
      // Shallow copy - for deep copy, would need to handle objects recursively
      newContext.set(key, value);
    }
    newContext.logs = [...this.logs];
    return newContext;
  }

  applyUpdates(updates) {
    if (updates && typeof updates === 'object') {
      for (const [key, value] of Object.entries(updates)) {
        this.set(key, value);
      }
    }
  }

  has(key) {
    return this.values.has(key);
  }

  delete(key) {
    return this.values.delete(key);
  }

  keys() {
    return Array.from(this.values.keys());
  }

  getEnv(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  getEnvString(key, defaultValue = '') {
    return process.env[key] || defaultValue;
  }

  hasEnv(key) {
    return key in process.env;
  }

  // Built-in context key constants
  static OUTCOME = 'outcome';
  static PREFERRED_LABEL = 'preferred_label';
  static GRAPH_GOAL = 'graph.goal';
  static CURRENT_NODE = 'current_node';
  static LAST_STAGE = 'last_stage';
  static LAST_RESPONSE = 'last_response';
  static ENV_PREFIX = 'env.';
}