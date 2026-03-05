/**
 * EnvironmentSecretsProvider - Reads secrets from process.env
 * 
 * Default provider for development and simple deployments.
 * No external dependencies.
 */

import { SecretsProvider } from './provider.js';

export class EnvironmentSecretsProvider extends SecretsProvider {
  /**
   * @param {Object} options - Provider options
   */
  constructor(options = {}) {
    super();
    this.options = options;
  }

  /**
   * Retrieve a secret from environment variables
   * @param {string} key - Environment variable name
   * @returns {Promise<string | null>} Environment variable value or null
   */
  async getSecret(key) {
    // Return directly from process.env (synchronous but wrapped in Promise)
    return process.env[key] || null;
  }

  /**
   * Check if provider is available (always true for env provider)
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return true;
  }
}

export default EnvironmentSecretsProvider;
