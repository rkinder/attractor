# Secrets Management

The Secrets Management system provides a secure, multi-provider way to store and retrieve sensitive credentials (API keys, tokens, passwords) used by Attractor pipelines. It supports multiple backends including environment variables, AWS Secrets Manager, and Azure Key Vault.

## Overview

Secrets are referenced using special syntax in configuration files:
- `$ENV_VAR` - Environment variable
- `aws:secret-name` - AWS Secrets Manager
- `aws:secret-name:key` - AWS Secrets Manager with JSON key extraction
- `azure:secret-name` - Azure Key Vault
- Plain text - Returned unchanged

## Installation

The core secrets management requires no additional dependencies. For AWS or Azure support:

```bash
# For AWS Secrets Manager support
npm install @aws-sdk/client-secrets-manager

# For Azure Key Vault support
npm install @azure/keyvault-secrets @azure/identity
```

## Quick Start

### Basic Usage

```javascript
import { EnvironmentSecretsProvider, resolveSecret } from 'attractor';

const provider = new EnvironmentSecretsProvider();

// Set an environment variable
process.env.OPENAI_API_KEY = 'sk-...';

// Resolve a secret reference
const apiKey = await resolveSecret('$OPENAI_API_KEY', { env: provider });
console.log(apiKey); // 'sk-...'
```

### With Multiple Providers

```javascript
import { createAllProviders, resolveSecret } from 'attractor';

const providers = createAllProviders({
  aws: { region: 'us-east-1' },
  azure: { vaultUrl: 'https://myvault.vault.azure.net' }
});

// AWS secret
const awsKey = await resolveSecret('aws:prod-keys:OPENAI', providers);

// Azure secret
const azureKey = await resolveSecret('azure:openai-key', providers);

// Environment variable
const envKey = await resolveSecret('$OPENAI_API_KEY', providers);
```

## Providers

### EnvironmentSecretsProvider (Default)

Reads secrets from `process.env`. No configuration required.

```javascript
import { EnvironmentSecretsProvider } from 'attractor';

const provider = new EnvironmentSecretsProvider();
const apiKey = await provider.getSecret('OPENAI_API_KEY');
```

### AWSSecretsManagerProvider

Retrieves secrets from AWS Secrets Manager. Supports:
- Plain secret values
- JSON secrets with key extraction

```javascript
import { AWSSecretsManagerProvider } from 'attractor';

const provider = new AWSSecretsManagerProvider({
  region: 'us-east-1',
  timeout: 5000
});

// Plain secret
const secret = await provider.getSecret('my-secret');

// JSON secret with key extraction
const apiKey = await provider.getSecret('prod-keys:OPENAI');
```

**Reference formats:**
- `aws:secret-name` - Get entire secret value
- `aws:secret-name:json-key` - Parse JSON and extract key (supports dot notation)

### AzureKeyVaultProvider

Retrieves secrets from Azure Key Vault.

```javascript
import { AzureKeyVaultProvider } from 'attractor';

const provider = new AzureKeyVaultProvider({
  vaultUrl: 'https://myvault.vault.azure.net',
  timeout: 5000
});

const secret = await provider.getSecret('openai-api-key');
```

## Secret Resolution

### resolveSecret()

Resolve a single secret reference:

```javascript
import { resolveSecret, createAllProviders } from 'attractor';

const providers = createAllProviders();

// Environment variable
await resolveSecret('$API_KEY', providers);

// AWS secret
await resolveSecret('aws:my-secrets:API_KEY', providers);

// Azure secret
await resolveSecret('azure:api-key', providers);

// Plain text (returned unchanged)
await resolveSecret('sk-plain-text', providers);
```

### resolveSecretsInObject()

Resolve all secrets in a configuration object:

```javascript
import { resolveSecretsInObject, createAllProviders } from 'attractor';

const providers = createAllProviders();

const config = {
  apiKey: '$OPENAI_API_KEY',
  awsRegion: 'us-east-1',
  nested: {
    database: '$DATABASE_URL'
  }
};

const resolved = await resolveSecretsInObject(config, providers);
// {
//   apiKey: 'sk-...',
//   awsRegion: 'us-east-1',
//   nested: { database: 'postgres://...' }
// }
```

Resolve only specific keys:

```javascript
const resolved = await resolveSecretsInObject(
  config, 
  providers,
  ['apiKey'] // Only resolve apiKey, leave others unchanged
);
```

## Configuration Examples

### Gateway Configuration

Before (with secret references):
```json
{
  "gateways": [
    {
      "name": "production",
      "provider": "openai",
      "apiKey": "aws:prod-api-keys:OPENAI"
    }
  ]
}
```

After resolution:
```json
{
  "gateways": [
    {
      "name": "production", 
      "provider": "openai",
      "apiKey": "sk-proj-abc123..."
    }
  ]
}
```

### Using Factory

```javascript
import { createSecretsProvider } from 'attractor';

// Default: environment variables
const envProvider = createSecretsProvider();

// AWS Secrets Manager
const awsProvider = createSecretsProvider({
  type: 'aws',
  options: { region: 'us-west-2' }
});

// Azure Key Vault
const azureProvider = createSecretsProvider({
  type: 'azure',
  options: { vaultUrl: 'https://myvault.vault.azure.net' }
});
```

## Error Handling

### Null Handling

Missing secrets return `null` without throwing exceptions:

```javascript
const result = await resolveSecret('$NONEXISTENT', providers);
console.log(result); // null
```

### Fallback

AWS and Azure providers fall back to environment variables on error:

```javascript
// If AWS fails, tries process.env
await resolveSecret('aws:secret:KEY', providers);

// If Azure fails, tries process.env  
await resolveSecret('azure:secret-name', providers);
```

### Logging

Errors are logged without exposing secret values:

```bash
[Secrets] AWS Secrets Manager failed for 'secret-name': ResourceNotFoundException
[Secrets] Azure Key Vault failed for 'secret-name': Secret not found
```

## Caching

Providers cache secrets for the duration of their instance:

```javascript
const provider = new AWSSecretsManagerProvider();

// First call - fetches from AWS
const secret1 = await provider.getSecret('my-secret');

// Second call - returns cached value
const secret2 = await provider.getSecret('my-secret');

// Clear cache
provider.clearCache();
```

## Security

### Best Practices

1. **Use Secret References**: Always use `$VAR`, `aws:`, or `azure:` prefixes instead of plain text
2. **Environment Fallback**: AWS/Azure providers automatically fall back to environment variables
3. **No Value Logging**: Secret values are never logged, only key names
4. **Minimal Scope**: Use AWS IAM roles with minimal required permissions
5. **Secret Rotation**: Restart pipelines to pick up rotated secrets

### Environment Variables

For development, use environment variables:

```bash
export OPENAI_API_KEY='sk-...'
export ANTHROPIC_API_KEY='sk-ant-...'
```

In your workflow:
```dot
start -> api_call [prompt="$OPENAI_API_KEY will be resolved"]
```

## API Reference

### Classes

- `SecretsProvider` - Abstract base class
- `EnvironmentSecretsProvider` - Reads from process.env
- `AWSSecretsManagerProvider` - AWS Secrets Manager
- `AzureKeyVaultProvider` - Azure Key Vault

### Functions

- `resolveSecret(value, providers)` - Resolve single secret
- `resolveSecretsInObject(obj, providers, keys)` - Resolve secrets in object
- `isSecretReference(value)` - Check if value is a secret reference
- `createSecretsProvider(config)` - Create provider from config
- `createAllProviders(config)` - Create all providers

## Troubleshooting

### AWS SDK Not Installed

If AWS SDK is not installed, the provider falls back to environment variables:

```bash
[Secrets] AWS SDK not installed, AWS Secrets Manager unavailable
```

### Azure SDK Not Installed

If Azure SDK is not installed, the provider falls back to environment variables:

```bash
[Secrets] Azure SDK not installed, Azure Key Vault unavailable
```

### Timeout

If a provider times out, it falls back to environment variables:

```bash
[Secrets] AWS Secrets Manager failed for 'secret': Request timeout
```
