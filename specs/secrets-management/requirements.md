# Requirements: Secrets Management

## Technical Specifications

### REQ-001: SecretsProvider Base Class
**From Design**: FR-001  
**Description**: Define abstract base class for all secret providers.

**Acceptance Criteria**:
- [ ] Create class `SecretsProvider` in `src/secrets/provider.js`
- [ ] Define async method `getSecret(key)` that returns `Promise<string | null>`
- [ ] Export as base class
- [ ] Document in JSDoc that subclasses must implement `getSecret()`

---

### REQ-002: EnvironmentSecretsProvider Implementation
**From Design**: FR-002  
**Description**: Implement provider that reads from process.env.

**Acceptance Criteria**:
- [ ] Create `EnvironmentSecretsProvider` class in `src/secrets/env-provider.js`
- [ ] Extend `SecretsProvider` base class
- [ ] Implement `getSecret(key)` to return `process.env[key] || null`
- [ ] No async I/O (can return immediate Promise)
- [ ] Export as named export

---

### REQ-003: AWSSecretsManagerProvider Implementation
**From Design**: FR-003, FR-004  
**Description**: Implement provider for AWS Secrets Manager with JSON key extraction.

**Acceptance Criteria**:
- [ ] Create `AWSSecretsManagerProvider` in `src/secrets/aws-provider.js`
- [ ] Extend `SecretsProvider` base class
- [ ] Accept `region` parameter in constructor (default: us-east-1)
- [ ] Lazy initialize AWS SDK client on first `getSecret()` call
- [ ] Support format: `secret-name` (entire value) and `secret-name:key` (JSON extraction)
- [ ] Parse SecretString as JSON if colon-separated key provided
- [ ] Return extracted key value or entire secret
- [ ] Handle ImportError gracefully if AWS SDK not installed

---

### REQ-004: AWS Provider Fallback
**From Design**: FR-008  
**Description**: Fall back to environment variables if AWS call fails.

**Acceptance Criteria**:
- [ ] Wrap AWS SDK calls in try-catch
- [ ] On error, extract key name from reference (part after colon)
- [ ] Attempt `process.env[key]` as fallback
- [ ] Log warning: "AWS Secrets Manager failed, using environment fallback"
- [ ] Return environment value or null

---

### REQ-005: AzureKeyVaultProvider Implementation
**From Design**: FR-005, FR-011  
**Description**: Implement provider for Azure Key Vault.

**Acceptance Criteria**:
- [ ] Create `AzureKeyVaultProvider` in `src/secrets/azure-provider.js`
- [ ] Extend `SecretsProvider` base class
- [ ] Accept `vaultUrl` parameter in constructor (e.g., https://myvault.vault.azure.net)
- [ ] Lazy initialize SecretClient with DefaultAzureCredential
- [ ] Implement `getSecret(key)` to call `client.getSecret(key)`
- [ ] Return `secret.value` or null
- [ ] Handle ImportError gracefully if Azure SDK not installed

---

### REQ-006: Azure Provider Fallback
**From Design**: FR-008  
**Description**: Fall back to environment variables if Azure call fails.

**Acceptance Criteria**:
- [ ] Wrap Azure SDK calls in try-catch
- [ ] On error, attempt `process.env[key]` as fallback
- [ ] Log warning: "Azure Key Vault failed, using environment fallback"
- [ ] Return environment value or null

---

### REQ-007: Secret Reference Parsing
**From Design**: FR-006, FR-012  
**Description**: Parse secret references to determine provider and extraction format.

**Acceptance Criteria**:
- [ ] Create `resolveSecret(value, provider)` in `src/secrets/resolver.js`
- [ ] If value is null/undefined, return null
- [ ] If value starts with `$`, extract variable name and use EnvironmentSecretsProvider
- [ ] If value starts with `aws:`, use provided AWS provider
- [ ] If value starts with `azure:`, use provided Azure provider
- [ ] If no prefix matches, return value unchanged (plain text)
- [ ] Return Promise resolving to string or null

---

### REQ-008: AWS Secret Format Handling
**From Design**: FR-004  
**Description**: Handle both plain and JSON secrets from AWS.

**Acceptance Criteria**:
- [ ] Parse reference: `aws:secret-name` → call with "secret-name"
- [ ] Parse reference: `aws:secret-name:key` → call with "secret-name:key"
- [ ] In provider, split on first colon to get secret name and optional key
- [ ] If key present, parse SecretString as JSON
- [ ] Extract value at key path
- [ ] Handle JSON parse errors gracefully (return null, log error)

---

### REQ-009: Environment Variable Extraction
**From Design**: FR-002, FR-008  
**Description**: Extract variable names from different reference formats.

**Acceptance Criteria**:
- [ ] For `$VAR_NAME`, extract "VAR_NAME"
- [ ] For `aws:secret:KEY`, extract "KEY" as fallback
- [ ] For `azure:secret-name`, extract "secret-name" as fallback
- [ ] Use extracted name for environment variable lookup

---

### REQ-010: Null Handling
**From Design**: FR-009  
**Description**: Return null for missing secrets without throwing exceptions.

**Acceptance Criteria**:
- [ ] All providers return null if secret not found
- [ ] No exceptions thrown from `getSecret()` methods
- [ ] Null propagates through `resolveSecret()` function
- [ ] Caller responsible for checking null and handling missing secrets

---

### REQ-011: Error Logging
**From Design**: FR-014  
**Description**: Log secret resolution failures without exposing values.

**Acceptance Criteria**:
- [ ] Log warnings for provider failures with format: `[SecretsProvider] Failed to resolve secret 'key-name': error message`
- [ ] Never log actual secret values
- [ ] Log provider name and key/reference being resolved
- [ ] Use `console.warn()` or logger if available

---

### REQ-012: Gateway Configuration Integration
**From Design**: FR-013  
**Description**: Resolve secrets in gateway configuration when loading.

**Acceptance Criteria**:
- [ ] Modify `GatewayRegistry.fromFile()` to accept optional `secretsProvider`
- [ ] For each gateway, resolve `apiKey` field using `resolveSecret()`
- [ ] Replace reference with resolved value before creating gateway
- [ ] If resolution fails (null), keep original value and let validation catch it

---

### REQ-013: Provider Factory
**From Design**: Architecture  
**Description**: Create factory for instantiating providers based on configuration.

**Acceptance Criteria**:
- [ ] Create `createSecretsProvider(config)` function in `src/secrets/index.js`
- [ ] Config options: `{ type: 'env' | 'aws' | 'azure', ...providerOptions }`
- [ ] Return appropriate provider instance
- [ ] Default to EnvironmentSecretsProvider if no config
- [ ] Throw error if provider type unknown

---

### REQ-014: Provider Caching
**From Design**: NFR-002  
**Description**: Cache resolved secrets within provider to avoid redundant calls.

**Acceptance Criteria**:
- [ ] AWS and Azure providers maintain internal cache Map
- [ ] Cache key is the full secret reference
- [ ] Return cached value if present
- [ ] Fetch and cache if not present
- [ ] Cache persists for lifetime of provider instance
- [ ] No automatic cache invalidation

---

### REQ-015: Timeout Configuration
**From Design**: NFR-003  
**Description**: Set timeouts on provider API calls.

**Acceptance Criteria**:
- [ ] AWS SDK client configured with timeout: 5000ms
- [ ] Azure SecretClient configured with timeout: 5000ms
- [ ] Timeout errors caught and trigger fallback
- [ ] Log timeout errors distinctly from other errors

---

### REQ-016: Optional Dependency Handling
**From Design**: NFR-004  
**Description**: Handle missing AWS/Azure SDKs gracefully.

**Acceptance Criteria**:
- [ ] AWS provider checks for `@aws-sdk/client-secrets-manager` with try-catch import
- [ ] Azure provider checks for `@azure/keyvault-secrets` with try-catch import
- [ ] If SDK missing, log warning and fall back to environment variables
- [ ] Document peer dependencies in package.json peerDependencies field

---

### REQ-017: Index Module Exports
**From Design**: Architecture  
**Description**: Create convenient index module exporting all providers.

**Acceptance Criteria**:
- [ ] Create `src/secrets/index.js`
- [ ] Export `SecretsProvider` base class
- [ ] Export all provider implementations
- [ ] Export `resolveSecret()` utility
- [ ] Export `createSecretsProvider()` factory

---

## Interface Contracts

### SecretsProvider Interface

```javascript
export class SecretsProvider {
  /**
   * Retrieve a secret value
   * @param {string} key - Secret identifier (format varies by provider)
   * @returns {Promise<string | null>} Secret value or null if not found
   */
  async getSecret(key) {
    throw new Error('Subclasses must implement getSecret()');
  }
}
```

### Provider Implementations

```javascript
// Environment
export class EnvironmentSecretsProvider extends SecretsProvider {
  async getSecret(key) {
    return process.env[key] || null;
  }
}

// AWS
export class AWSSecretsManagerProvider extends SecretsProvider {
  constructor(region = 'us-east-1') { ... }
  async getSecret(key) { ... } // Supports "name" and "name:key" formats
}

// Azure
export class AzureKeyVaultProvider extends SecretsProvider {
  constructor(vaultUrl) { ... }
  async getSecret(key) { ... }
}
```

### Resolver Function

```javascript
/**
 * Resolve a secret reference to its actual value
 * @param {string} value - Secret reference ($VAR, aws:name, azure:name, or plain text)
 * @param {SecretsProvider} provider - Provider to use for resolution
 * @returns {Promise<string | null>} Resolved value or null
 */
export async function resolveSecret(value, provider) { ... }
```

### Factory Function

```javascript
/**
 * Create secrets provider from configuration
 * @param {Object} config - Provider configuration
 * @returns {SecretsProvider} Provider instance
 */
export function createSecretsProvider(config = {}) { ... }

// Example config:
const provider = createSecretsProvider({
  type: 'aws',
  region: 'us-west-2'
});
```

### Secret Reference Formats

| Format | Example | Provider | Returns |
|--------|---------|----------|---------|
| `$VAR` | `$OPENAI_KEY` | Environment | `process.env.OPENAI_KEY` |
| `aws:name` | `aws:prod-keys` | AWS | Entire secret value |
| `aws:name:key` | `aws:prod-keys:OPENAI` | AWS | JSON key from secret |
| `azure:name` | `azure:openai-key` | Azure | Secret from vault |
| Plain text | `sk-1234...` | None | Returned unchanged |

---

## Gateway Configuration Integration Example

**Before Resolution** (gateway.config.json):
```json
{
  "gateways": [
    {
      "name": "production",
      "provider": "openai",
      "apiKey": "aws:api-keys:OPENAI_KEY"
    }
  ]
}
```

**After Resolution** (in memory):
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

**Code Integration**:
```javascript
import { GatewayRegistry } from './gateway.js';
import { createSecretsProvider } from './secrets/index.js';

const provider = createSecretsProvider({ type: 'aws', region: 'us-east-1' });
const registry = await GatewayRegistry.fromFile('gateway.config.json', provider);
```

---

## Constraints

### Security
- **No Value Logging**: Secret values must never appear in logs
- **Memory Handling**: Secrets stored only as long as needed (per-execution)
- **SDK Security**: AWS/Azure SDKs handle TLS and credential security

### Performance
- **Caching**: Providers cache secrets during single execution
- **Lazy Init**: SDK clients created only when first secret requested
- **Startup**: Secret resolution adds <500ms to startup time

### Availability
- **Fallback**: Environment variable fallback ensures basic operation
- **Timeout**: 5 second timeout on provider API calls
- **Retry**: Single retry on transient failures

### Compatibility
- **Peer Dependencies**: AWS and Azure SDKs are optional
- **Node.js**: Requires 14+ for async/await
- **Platforms**: Linux, macOS, Windows

---

## Traceability Matrix

| Requirement | Design Source | Test Case(s) |
|-------------|---------------|--------------|
| REQ-001 | FR-001 | TC-001 |
| REQ-002 | FR-002 | TC-002 |
| REQ-003 | FR-003, FR-004 | TC-003, TC-004 |
| REQ-004 | FR-008 | TC-005 |
| REQ-005 | FR-005, FR-011 | TC-006 |
| REQ-006 | FR-008 | TC-007 |
| REQ-007 | FR-006, FR-012 | TC-008, TC-009 |
| REQ-008 | FR-004 | TC-004 |
| REQ-009 | FR-002, FR-008 | TC-005, TC-007 |
| REQ-010 | FR-009 | TC-010 |
| REQ-011 | FR-014 | TC-011 |
| REQ-012 | FR-013 | TC-012 |
| REQ-013 | Architecture | TC-013 |
| REQ-014 | NFR-002 | TC-014 |
| REQ-015 | NFR-003 | TC-015 |
| REQ-016 | NFR-004 | TC-016 |
| REQ-017 | Architecture | TC-001 |

---

## AWS SDK Configuration Example

```javascript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class AWSSecretsManagerProvider extends SecretsProvider {
  constructor(region = 'us-east-1') {
    super();
    this.region = region;
    this._client = null;
    this._cache = new Map();
  }

  _getClient() {
    if (!this._client) {
      this._client = new SecretsManagerClient({ 
        region: this.region,
        requestTimeout: 5000
      });
    }
    return this._client;
  }

  async getSecret(key) {
    // Check cache
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    try {
      // Parse reference: "name" or "name:jsonKey"
      const [secretName, jsonKey] = key.split(':', 2);
      
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this._getClient().send(command);
      
      let value = response.SecretString;
      
      // Extract JSON key if specified
      if (jsonKey && value) {
        try {
          const parsed = JSON.parse(value);
          value = parsed[jsonKey] || null;
        } catch (e) {
          console.warn(`Failed to parse AWS secret as JSON: ${secretName}`);
          return null;
        }
      }
      
      // Cache result
      this._cache.set(key, value);
      return value;
      
    } catch (error) {
      console.warn(`AWS Secrets Manager failed for '${key}': ${error.message}`);
      // Fallback to environment
      const envKey = key.split(':').pop();
      return process.env[envKey] || null;
    }
  }
}
```

---

## Azure SDK Configuration Example

```javascript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export class AzureKeyVaultProvider extends SecretsProvider {
  constructor(vaultUrl) {
    super();
    this.vaultUrl = vaultUrl;
    this._client = null;
    this._cache = new Map();
  }

  _getClient() {
    if (!this._client) {
      const credential = new DefaultAzureCredential();
      this._client = new SecretClient(this.vaultUrl, credential);
    }
    return this._client;
  }

  async getSecret(key) {
    // Check cache
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    try {
      const secret = await this._getClient().getSecret(key);
      const value = secret.value || null;
      
      // Cache result
      this._cache.set(key, value);
      return value;
      
    } catch (error) {
      console.warn(`Azure Key Vault failed for '${key}': ${error.message}`);
      // Fallback to environment
      return process.env[key] || null;
    }
  }
}
```
