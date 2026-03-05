/**
 * Secret Resolver - Parse and resolve secret references
 * 
 * Parses secret references to determine provider and extraction format:
 * - $VAR_NAME - Environment variable
 * - aws:secret-name - AWS Secrets Manager
 * - aws:secret-name:key - AWS with JSON key extraction
 * - azure:secret-name - Azure Key Vault
 * - Plain text - Returned unchanged
 */

import { EnvironmentSecretsProvider } from './env-provider.js';

/**
 * Resolve a secret reference to its actual value
 * @param {string} value - Secret reference ($VAR, aws:name, azure:name, or plain text)
 * @param {Object} providers - Object with provider instances { env, aws, azure }
 * @returns {Promise<string | null>} Resolved value or null
 */
export async function resolveSecret(value, providers = {}) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Get environment provider (default)
  const envProvider = providers.env || new EnvironmentSecretsProvider();

  // Check for environment variable format: $VAR_NAME
  if (value.startsWith('$')) {
    const varName = value.slice(1); // Remove $ prefix
    return await envProvider.getSecret(varName);
  }

  // Check for AWS format: aws:secret-name or aws:secret-name:key
  if (value.startsWith('aws:')) {
    const ref = value.slice(4); // Remove 'aws:' prefix
    if (providers.aws) {
      try {
        return await providers.aws.getSecret(ref);
      } catch (error) {
        // Fallback to environment
        const envKey = ref.split(':').pop();
        console.warn(`[Secrets] AWS Secrets Manager failed, using environment fallback for '${envKey}'`);
        return await envProvider.getSecret(envKey);
      }
    }
    // No AWS provider, try environment fallback
    const envKey = ref.split(':').pop();
    return await envProvider.getSecret(envKey);
  }

  // Check for Azure format: azure:secret-name
  if (value.startsWith('azure:')) {
    const secretName = value.slice(6); // Remove 'azure:' prefix
    if (providers.azure) {
      try {
        return await providers.azure.getSecret(secretName);
      } catch (error) {
        // Fallback to environment
        console.warn(`[Secrets] Azure Key Vault failed, using environment fallback for '${secretName}'`);
        return await envProvider.getSecret(secretName);
      }
    }
    // No Azure provider, try environment fallback
    return await envProvider.getSecret(secretName);
  }

  // Plain text - return unchanged
  return value;
}

/**
 * Resolve all secrets in an object recursively
 * @param {Object} obj - Object with potential secret references
 * @param {Object} providers - Provider instances
 * @param {Array<string>} keys - Specific keys to resolve (default: all string values)
 * @returns {Promise<Object>} Object with resolved secrets
 */
export async function resolveSecretsInObject(obj, providers, keys = null) {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (keys && !keys.includes(key)) {
      // Only resolve specific keys if provided
      result[key] = value;
      continue;
    }
    
    if (typeof value === 'string') {
      result[key] = await resolveSecret(value, providers);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively resolve nested objects
      result[key] = await resolveSecretsInObject(value, providers, keys);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Check if a value is a secret reference
 * @param {string} value - Value to check
 * @returns {boolean} True if value is a secret reference
 */
export function isSecretReference(value) {
  if (typeof value !== 'string') return false;
  return value.startsWith('$') || value.startsWith('aws:') || value.startsWith('azure:');
}

export default resolveSecret;
