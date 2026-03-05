# Design: Secrets Management

## Overview

Secrets Management provides a secure, multi-provider system for storing and retrieving sensitive credentials (API keys, tokens, passwords) used by Attractor pipelines. This feature enables production deployments where hardcoding secrets in configuration files or environment variables is inappropriate for security and compliance reasons.

**Problem Statement**: Currently, the JavaScript Attractor only supports environment variables for secrets (API keys for LLM providers). This approach is insufficient for production environments requiring:
- Centralized secret storage with access control
- Secret rotation without code changes
- Audit logging of secret access
- Integration with enterprise secret management systems (AWS Secrets Manager, Azure Key Vault)

**Solution**: Implement a pluggable secrets provider system supporting multiple backends (environment variables for development, AWS Secrets Manager for production, Azure Key Vault for Azure deployments). Secret references in configuration use special syntax (`$ENV_VAR`, `aws:secret-name`, `azure:secret-name`) that are resolved at runtime by the appropriate provider.

## Architecture

### Components

1. **SecretsProvider Base Class** (`src/secrets/provider.js`)
   - Abstract interface for secret resolution
   - Method: `async getSecret(key): Promise<string | null>`
   - Implemented by concrete providers

2. **EnvironmentSecretsProvider** (`src/secrets/env-provider.js`)
   - Reads from `process.env`
   - Default provider for development
   - No external dependencies

3. **AWSSecretsManagerProvider** (`src/secrets/aws-provider.js`)
   - Integrates with AWS Secrets Manager via AWS SDK
   - Supports JSON secrets with key extraction
   - Caches secrets for performance
   - Requires AWS credentials configured

4. **AzureKeyVaultProvider** (`src/secrets/azure-provider.js`)
   - Integrates with Azure Key Vault
   - Uses DefaultAzureCredential for authentication
   - Requires Azure SDK packages

5. **Secret Resolver Utility** (`src/secrets/resolver.js`)
   - Parses secret references: `$VAR`, `aws:name`, `aws:name:key`, `azure:name`
   - Routes to appropriate provider
   - Returns resolved value or null

6. **Integration Points**
   - Gateway configuration: API keys resolved on load
   - Node attributes: Secret values resolved before handler execution
   - MCP configuration: Server credentials resolved at startup

### Data Flow

```
Configuration File (gateway.config.json):
{
  "gateways": [{
    "name": "production",
    "apiKey": "aws:api-keys:OPENAI_KEY"
  }]
}
          ↓
  GatewayRegistry.fromFile()
          ↓
  Detect secret reference: "aws:api-keys:OPENAI_KEY"
          ↓
  resolveSecret(value, provider)
          ↓
  provider = AWSSecretsManagerProvider
          ↓
  provider.getSecret("api-keys:OPENAI_KEY")
          ↓
  AWS SDK → GetSecretValue(SecretId="api-keys")
          ↓
  Parse JSON: { "OPENAI_KEY": "sk-..." }
          ↓
  Return: "sk-..."
          ↓
  Gateway configured with actual key
```

### Secret Reference Formats

| Format | Provider | Example | Description |
|--------|----------|---------|-------------|
| `$ENV_VAR` | Environment | `$OPENAI_API_KEY` | Read from process.env |
| `aws:secret-name` | AWS | `aws:prod-api-keys` | Entire secret value |
| `aws:secret:key` | AWS | `aws:prod-keys:OPENAI` | JSON secret with key |
| `azure:secret-name` | Azure | `azure:openai-key` | Azure Key Vault secret |
| Plain text | None | `sk-1234...` | Literal value (not recommended) |

## Functional Requirements

### FR-001: Provider Interface Definition
**Type**: Ubiquitous  
**Statement**: The system shall define a `SecretsProvider` base class with an async `getSecret(key)` method that returns a string or null.  
**Rationale**: Consistent interface enables pluggable providers without coupling to specific implementations.

### FR-002: Environment Variable Provider
**Type**: Ubiquitous  
**Statement**: The system shall provide an `EnvironmentSecretsProvider` that reads secrets from `process.env`.  
**Rationale**: Default provider for development and simple deployments, no external dependencies.

### FR-003: AWS Secrets Manager Provider
**Type**: Optional Feature  
**Statement**: WHERE AWS SDK is installed, the system shall provide an `AWSSecretsManagerProvider` that retrieves secrets from AWS Secrets Manager.  
**Rationale**: Production-grade secret storage for AWS deployments.

### FR-004: AWS JSON Secret Parsing
**Type**: Event-driven  
**Statement**: WHEN an AWS secret reference includes a colon-separated key (format: `aws:name:key`), the system shall parse the secret value as JSON and extract the specified key.  
**Rationale**: Enables storing multiple related secrets in a single AWS secret for cost efficiency.

### FR-005: Azure Key Vault Provider
**Type**: Optional Feature  
**Statement**: WHERE Azure SDK is installed, the system shall provide an `AzureKeyVaultProvider` that retrieves secrets from Azure Key Vault using DefaultAzureCredential.  
**Rationale**: Production-grade secret storage for Azure deployments.

### FR-006: Secret Reference Detection
**Type**: Ubiquitous  
**Statement**: The system shall detect secret references by checking for prefixes: `$` for environment, `aws:` for AWS, `azure:` for Azure.  
**Rationale**: Explicit syntax prevents accidental resolution of plain text values.

### FR-007: Secret Resolution
**Type**: Ubiquitous  
**Statement**: The system shall provide a `resolveSecret(value, provider)` function that routes secret resolution to the appropriate provider based on reference format.  
**Rationale**: Central resolution logic simplifies integration across the codebase.

### FR-008: Provider Fallback
**Type**: Unwanted Behavior  
**Statement**: IF a provider-specific secret resolution fails (e.g., AWS SDK error), THEN the system shall attempt to read from environment variables as fallback.  
**Rationale**: Graceful degradation maintains availability during provider outages.

### FR-009: Null Handling for Missing Secrets
**Type**: Unwanted Behavior  
**Statement**: IF a secret cannot be resolved by any provider, THEN the system shall return null without throwing exceptions.  
**Rationale**: Enables validation logic to check for missing secrets and provide clear error messages.

### FR-010: AWS Provider Lazy Initialization
**Type**: State-driven  
**Statement**: WHILE AWS credentials are not configured, the system shall delay AWS client initialization until first secret request.  
**Rationale**: Avoids startup failures when AWS provider is available but not needed.

### FR-011: Azure Provider Credential Handling
**Type**: Optional Feature  
**Statement**: WHERE Azure Key Vault is used, the system shall authenticate using DefaultAzureCredential which supports managed identity, environment variables, and Azure CLI.  
**Rationale**: Flexible authentication supports multiple Azure deployment scenarios.

### FR-012: Plain Text Pass-Through
**Type**: Event-driven  
**Statement**: WHEN a value does not match any secret reference format, the system shall return it unchanged as plain text.  
**Rationale**: Supports non-secret configuration values in the same fields.

### FR-013: Gateway Configuration Integration
**Type**: Ubiquitous  
**Statement**: The system shall resolve secret references in gateway configuration files when loading gateways.  
**Rationale**: API keys must be resolved before gateway clients are instantiated.

### FR-014: Error Logging
**Type**: Unwanted Behavior  
**Statement**: IF secret resolution fails, THEN the system shall log a warning with the secret key (but not the value) and error details.  
**Rationale**: Enables debugging without exposing sensitive information in logs.

## Non-Functional Requirements

### NFR-001: Security
- **No Logging**: Secret values must never be logged (keys/names only)
- **Memory Safety**: Secrets should not be stored longer than necessary
- **Transmission**: Use TLS for all provider communication (AWS/Azure SDKs handle this)

### NFR-002: Performance
- **Caching**: Providers should cache secrets for the duration of pipeline execution
- **Lazy Loading**: Only load secrets that are actually referenced
- **Startup Time**: Secret resolution must not significantly impact startup (<500ms overhead)

### NFR-003: Availability
- **Fallback**: Environment variable fallback ensures basic functionality during provider outages
- **Timeout**: Provider requests should timeout after 5 seconds
- **Retry**: Single retry on transient failures before falling back

### NFR-004: Compatibility
- **Optional Dependencies**: AWS and Azure providers are optional (peer dependencies)
- **Node.js Version**: Compatible with Node.js 14+ (async/await support)
- **Platform**: Works on Linux, macOS, Windows

### NFR-005: Observability
- **Resolution Tracking**: Log which provider resolved each secret (but not values)
- **Failure Metrics**: Track secret resolution failures for monitoring
- **Audit**: Log secret access attempts (keys only) at debug level

## Dependencies

### Internal
- None - standalone module

### External - Core
- None - EnvironmentSecretsProvider has no dependencies

### External - AWS (Optional)
- `@aws-sdk/client-secrets-manager` (^3.0.0) - AWS Secrets Manager client
- AWS credentials configured (environment, IAM role, or AWS config file)

### External - Azure (Optional)
- `@azure/keyvault-secrets` (^4.0.0) - Azure Key Vault client
- `@azure/identity` (^3.0.0) - Azure authentication

### Similar Implementations
- Python version: `src/attractor/secrets.py`
- Same provider pattern and secret formats

## Open Questions

1. **Should we support Google Cloud Secret Manager?**
   - Python version doesn't have this
   - GCP is a major cloud provider
   - **Decision**: Defer to future enhancement based on user demand

2. **Should secrets be cached across pipeline runs?**
   - Pro: Reduces API calls to secret providers
   - Con: Stale secrets if rotated externally
   - **Decision**: Cache only within single pipeline run (per-execution cache)

3. **How do we handle secret rotation?**
   - Current: Secrets resolved once at startup
   - Alternative: Refresh on configurable interval
   - **Decision**: No automatic refresh for MVP, restart pipeline to pick up rotated secrets

4. **Should we validate secret reference syntax strictly?**
   - Current: Lenient (unrecognized prefixes treated as plain text)
   - Alternative: Throw error on malformed references
   - **Decision**: Lenient for MVP, add strict mode later

5. **Do we need secret versioning support (AWS versions, Azure versions)?**
   - AWS supports AWSCURRENT, AWSPENDING, AWSPREVIOUS
   - Azure supports version IDs
   - **Decision**: Always use latest/current version for MVP

6. **Should we support HashiCorp Vault?**
   - Popular in enterprises
   - Requires additional HTTP client
   - **Decision**: Defer to community contribution

7. **How do we test secret providers without real credentials?**
   - Option A: Mock AWS/Azure SDKs
   - Option B: Use localstack/azurite emulators
   - Option C: Provide test stubs
   - **Decision**: Mock SDKs for unit tests, document emulator setup for integration tests

8. **Should secret resolution be async or sync?**
   - AWS/Azure SDKs are async
   - Simplifies code if everything is async
   - **Decision**: All providers are async (return Promises)

9. **Do we need a secrets cache TTL?**
   - Could reload secrets after N minutes
   - Complicates cache management
   - **Decision**: No TTL for MVP, cache cleared at pipeline completion

10. **Should we encrypt secrets in memory?**
    - Node.js doesn't have built-in memory encryption
    - Significant complexity for marginal benefit
    - **Decision**: No in-memory encryption for MVP (rely on OS protections)
