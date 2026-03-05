# Tasks: Secrets Management

## Implementation Tasks

### Phase 1: Core Infrastructure
- **TASK-001**: Create SecretsProvider base class (`src/secrets/provider.js`) - 15min
- **TASK-002**: Create EnvironmentSecretsProvider (`src/secrets/env-provider.js`) - 20min
- **TASK-003**: Create resolver utility (`src/secrets/resolver.js`) - 30min

### Phase 2: AWS Integration
- **TASK-004**: Create AWSSecretsManagerProvider with lazy init (`src/secrets/aws-provider.js`) - 45min
- **TASK-005**: Implement AWS JSON secret parsing - 25min
- **TASK-006**: Implement AWS fallback to environment - 20min
- **TASK-007**: Add AWS provider caching - 20min

### Phase 3: Azure Integration
- **TASK-008**: Create AzureKeyVaultProvider with DefaultAzureCredential (`src/secrets/azure-provider.js`) - 40min
- **TASK-009**: Implement Azure fallback to environment - 15min
- **TASK-010**: Add Azure provider caching - 15min

### Phase 4: Integration
- **TASK-011**: Create provider factory (`src/secrets/index.js`) - 25min
- **TASK-012**: Integrate with GatewayRegistry.fromFile() - 30min
- **TASK-013**: Add timeout configuration for providers - 20min
- **TASK-014**: Add error logging (no value exposure) - 20min

### Phase 5: Testing & Documentation
- **TASK-015**: Unit tests for all providers (14 test cases) - 90min
- **TASK-016**: Integration test with gateway config - 30min
- **TASK-017**: Document in `docs/secrets-management.md` - 45min
- **TASK-018**: Update README and package.json peerDependencies - 15min

## Test Cases

- **TC-001**: SecretsProvider base class exists
- **TC-002**: EnvironmentSecretsProvider reads from process.env
- **TC-003**: AWSSecretsManagerProvider retrieves secret
- **TC-004**: AWS JSON key extraction works
- **TC-005**: AWS fallback to environment on error
- **TC-006**: AzureKeyVaultProvider retrieves secret
- **TC-007**: Azure fallback to environment on error
- **TC-008**: resolveSecret() parses $VAR format
- **TC-009**: resolveSecret() parses aws: and azure: formats
- **TC-010**: Null returned for missing secrets
- **TC-011**: Error logging doesn't expose values
- **TC-012**: Gateway config integration resolves secrets
- **TC-013**: Factory creates correct provider type
- **TC-014**: Providers cache secrets
- **TC-015**: Timeout enforced on provider calls
- **TC-016**: Missing SDK handled gracefully

## Estimated Effort: ~8 hours
