/**
 * SecretsProvider - Abstract base class for secret providers
 * 
 * Defines the interface that all secret providers must implement.
 * Subclasses must implement the getSecret() method.
 */

export class SecretsProvider {
  /**
   * Retrieve a secret value
   * @param {string} key - Secret identifier (format varies by provider)
   * @returns {Promise<string | null>} Secret value or null if not found
   */
  async getSecret(key) {
    throw new Error('Subclasses must implement getSecret()');
  }

  /**
   * Check if this provider is available
   * @returns {Promise<boolean>} True if provider can be used
   */
  async isAvailable() {
    return true;
  }
}

export default SecretsProvider;
