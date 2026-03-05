import { SecretsProvider } from './provider.js';
import { EnvironmentSecretsProvider } from './env-provider.js';
import { AWSSecretsManagerProvider } from './aws-provider.js';
import { AzureKeyVaultProvider } from './azure-provider.js';
import { resolveSecret, resolveSecretsInObject, isSecretReference } from './resolver.js';

/**
 * Secrets Management - Index module
 * 
 * Provides unified interface for all secrets providers:
 * - SecretsProvider base class
 * - EnvironmentSecretsProvider (default)
 * - AWSSecretsManagerProvider (optional)
 * - AzureKeyVaultProvider (optional)
 * - resolveSecret() utility
 * - createSecretsProvider() factory
 */

export { SecretsProvider };
export { EnvironmentSecretsProvider };
export { AWSSecretsManagerProvider };
export { AzureKeyVaultProvider };
export { resolveSecret, resolveSecretsInObject, isSecretReference };

/**
 * Create a secrets provider from configuration
 * @param {Object} config - Provider configuration
 * @param {string} config.type - Provider type: 'env', 'aws', 'azure'
 * @param {Object} config.options - Provider-specific options
 * @returns {SecretsProvider} Provider instance
 */
export function createSecretsProvider(config = {}) {
  const { type = 'env', options = {} } = config;

  switch (type) {
    case 'env':
      return new EnvironmentSecretsProvider(options);
    
    case 'aws':
      return new AWSSecretsManagerProvider(options);
    
    case 'azure':
      return new AzureKeyVaultProvider(options);
    
    default:
      console.warn(`[Secrets] Unknown provider type '${type}', defaulting to environment`);
      return new EnvironmentSecretsProvider(options);
  }
}

/**
 * Create all providers based on configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Object with { env, aws, azure } provider instances
 */
export function createAllProviders(config = {}) {
  const providers = {
    env: new EnvironmentSecretsProvider()
  };

  // Create AWS provider if configured
  if (config.aws) {
    providers.aws = new AWSSecretsManagerProvider(config.aws);
  }

  // Create Azure provider if configured
  if (config.azure) {
    providers.azure = new AzureKeyVaultProvider(config.azure);
  }

  return providers;
}

export default {
  SecretsProvider,
  EnvironmentSecretsProvider,
  AWSSecretsManagerProvider,
  AzureKeyVaultProvider,
  resolveSecret,
  resolveSecretsInObject,
  isSecretReference,
  createSecretsProvider,
  createAllProviders
};
