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

  appendLog(entry) {
    this.logs.push({
      timestamp: new Date(),
      message: entry
    });
  }

  snapshot() {
    const result = {};
    for (const [key, value] of this.values.entries()) {
      result[key] = value;
    }
    return result;
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