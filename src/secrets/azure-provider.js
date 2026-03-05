/**
 * AzureKeyVaultProvider - Azure Key Vault integration
 * 
 * Retrieves secrets from Azure Key Vault.
 * Supports:
 * - Secret retrieval by name
 * - Lazy initialization
 * - Caching within provider instance
 * - Fallback to environment variables
 */

import { SecretsProvider } from './provider.js';

let SecretClient = null;
let DefaultAzureCredential = null;

export class AzureKeyVaultProvider extends SecretsProvider {
  /**
   * @param {Object} options - Provider options
   * @param {string} options.vaultUrl - Azure Key Vault URL (e.g., https://myvault.vault.azure.net)
   * @param {number} options.timeout - Request timeout in ms (default: 5000)
   */
  constructor(options = {}) {
    super();
    this.vaultUrl = options.vaultUrl;
    this.timeout = options.timeout || 5000;
    this._client = null;
    this._cache = new Map();
    this._sdkAvailable = null;
  }

  /**
   * Check if Azure SDK is available
   * @returns {Promise<boolean>}
   */
  async _checkSDK() {
    if (this._sdkAvailable !== null) {
      return this._sdkAvailable;
    }

    try {
      const azure = await import('@azure/keyvault-secrets');
      const identity = await import('@azure/identity');
      SecretClient = azure.SecretClient;
      DefaultAzureCredential = identity.DefaultAzureCredential;
      this._sdkAvailable = true;
    } catch (error) {
      console.warn('[Secrets] Azure SDK not installed, Azure Key Vault unavailable');
      this._sdkAvailable = false;
    }
    
    return this._sdkAvailable;
  }

  /**
   * Get or create Azure client (lazy initialization)
   * @private
   */
  _getClient() {
    if (!this._client) {
      if (!SecretClient || !DefaultAzureCredential) {
        throw new Error('Azure SDK not available');
      }
      
      if (!this.vaultUrl) {
        throw new Error('Azure Key Vault URL not configured');
      }
      
      const credential = new DefaultAzureCredential();
      this._client = new SecretClient(this.vaultUrl, credential);
    }
    return this._client;
  }

  /**
   * Retrieve a secret from Azure Key Vault
   * @param {string} key - Secret name
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
      return process.env[key] || null;
    }

    try {
      const client = this._getClient();
      
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const secret = await client.getSecret(key, { abortSignal: controller.signal });
      clearTimeout(timeoutId);

      const value = secret.properties?.contentType === 'application/json' 
        ? JSON.stringify(secret.value)
        : (secret.value || null);

      // Cache result
      this._cache.set(key, value);
      return value;

    } catch (error) {
      // Log error without exposing secret values
      console.warn(`[Secrets] Azure Key Vault failed for '${key}': ${error.message}`);
      
      // Fallback to environment
      const fallbackValue = process.env[key] || null;
      this._cache.set(key, fallbackValue);
      return fallbackValue;
    }
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

export default AzureKeyVaultProvider;
