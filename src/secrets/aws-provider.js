/**
 * AWSSecretsManagerProvider - AWS Secrets Manager integration
 * 
 * Retrieves secrets from AWS Secrets Manager.
 * Supports:
 * - Plain secret values
 * - JSON secrets with key extraction (format: secret-name:key)
 * - Lazy initialization
 * - Caching within provider instance
 * - Fallback to environment variables
 */

import { SecretsProvider } from './provider.js';

let SecretsManagerClient = null;
let GetSecretValueCommand = null;

export class AWSSecretsManagerProvider extends SecretsProvider {
  /**
   * @param {Object} options - Provider options
   * @param {string} options.region - AWS region (default: us-east-1)
   * @param {number} options.timeout - Request timeout in ms (default: 5000)
   */
  constructor(options = {}) {
    super();
    this.region = options.region || 'us-east-1';
    this.timeout = options.timeout || 5000;
    this._client = null;
    this._cache = new Map();
    this._sdkAvailable = null;
  }

  /**
   * Check if AWS SDK is available
   * @returns {Promise<boolean>}
   */
  async _checkSDK() {
    if (this._sdkAvailable !== null) {
      return this._sdkAvailable;
    }

    try {
      const aws = await import('@aws-sdk/client-secrets-manager');
      SecretsManagerClient = aws.SecretsManagerClient;
      GetSecretValueCommand = aws.GetSecretValueCommand;
      this._sdkAvailable = true;
    } catch (error) {
      console.warn('[Secrets] AWS SDK not installed, AWS Secrets Manager unavailable');
      this._sdkAvailable = false;
    }
    
    return this._sdkAvailable;
  }

  /**
   * Get or create AWS client (lazy initialization)
   * @private
   */
  _getClient() {
    if (!this._client) {
      if (!SecretsManagerClient) {
        throw new Error('AWS SDK not available');
      }
      
      this._client = new SecretsManagerClient({
        region: this.region,
        requestTimeout: this.timeout,
        timeout: this.timeout
      });
    }
    return this._client;
  }

  /**
   * Retrieve a secret from AWS Secrets Manager
   * @param {string} key - Secret reference (format: "name" or "name:jsonKey")
   * @returns {Promise<string | null>} Secret value or null
   */
  async getSecret(key) {
    // Check cache first
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    // Check SDK availability
    const available = await this._checkSDK();
    if (!available) {
      // Fallback to environment
      const envKey = key.split(':').pop();
      return process.env[envKey] || null;
    }

    try {
      // Parse reference: "name" or "name:jsonKey"
      const colonIndex = key.indexOf(':');
      let secretName, jsonKey;
      
      if (colonIndex === -1) {
        secretName = key;
        jsonKey = null;
      } else {
        secretName = key.slice(0, colonIndex);
        jsonKey = key.slice(colonIndex + 1);
      }

      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this._getClient().send(command);

      let value = response.SecretString;

      // Extract JSON key if specified
      if (jsonKey && value) {
        try {
          const parsed = JSON.parse(value);
          value = this._getNestedValue(parsed, jsonKey) || null;
        } catch (e) {
          console.warn(`[Secrets] Failed to parse AWS secret '${secretName}' as JSON`);
          value = null;
        }
      }

      // Cache result
      this._cache.set(key, value);
      return value;

    } catch (error) {
      // Log error without exposing secret values
      console.warn(`[Secrets] AWS Secrets Manager failed for '${key}': ${error.message}`);
      
      // Fallback to environment
      const envKey = key.split(':').pop();
      const fallbackValue = process.env[envKey] || null;
      this._cache.set(key, fallbackValue);
      return fallbackValue;
    }
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  _getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return await this._checkSDK();
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this._cache.clear();
  }
}

export default AWSSecretsManagerProvider;
