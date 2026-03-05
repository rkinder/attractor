import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  SecretsProvider,
  EnvironmentSecretsProvider,
  resolveSecret,
  resolveSecretsInObject,
  isSecretReference,
  createSecretsProvider,
  createAllProviders
} from '../src/secrets/index.js';

describe('SecretsProvider', () => {
  
  test('SecretsProvider base class exists', () => {
    assert.ok(SecretsProvider);
    assert.strictEqual(typeof SecretsProvider, 'function');
  });

  test('SecretsProvider getSecret throws error', async () => {
    const provider = new SecretsProvider();
    try {
      await provider.getSecret('test');
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error.message.includes('must implement'));
    }
  });
});

describe('EnvironmentSecretsProvider', () => {
  
  test('reads from process.env', async () => {
    const provider = new EnvironmentSecretsProvider();
    
    // Set test variable
    process.env.TEST_SECRET_VAR = 'test-value-123';
    
    try {
      const result = await provider.getSecret('TEST_SECRET_VAR');
      assert.strictEqual(result, 'test-value-123');
    } finally {
      delete process.env.TEST_SECRET_VAR;
    }
  });

  test('returns null for missing variable', async () => {
    const provider = new EnvironmentSecretsProvider();
    const result = await provider.getSecret('NONEXISTENT_VAR_12345');
    assert.strictEqual(result, null);
  });

  test('isAvailable returns true', async () => {
    const provider = new EnvironmentSecretsProvider();
    const available = await provider.isAvailable();
    assert.strictEqual(available, true);
  });
});

describe('resolveSecret', () => {
  
  test('parses $VAR format', async () => {
    process.env.MY_TEST_VAR = 'resolved-value';
    
    try {
      const result = await resolveSecret('$MY_TEST_VAR');
      assert.strictEqual(result, 'resolved-value');
    } finally {
      delete process.env.MY_TEST_VAR;
    }
  });

  test('returns null for missing $VAR', async () => {
    const result = await resolveSecret('$NONEXISTENT_VAR');
    assert.strictEqual(result, null);
  });

  test('returns plain text unchanged', async () => {
    const result = await resolveSecret('sk-plain-text-123');
    assert.strictEqual(result, 'sk-plain-text-123');
  });

  test('handles aws: format with fallback', async () => {
    const providers = {
      env: new EnvironmentSecretsProvider()
    };
    
    process.env.AWS_KEY = 'env-fallback-value';
    
    try {
      const result = await resolveSecret('aws:secret-name:AWS_KEY', providers);
      assert.strictEqual(result, 'env-fallback-value');
    } finally {
      delete process.env.AWS_KEY;
    }
  });

  test('handles azure: format with fallback', async () => {
    const providers = {
      env: new EnvironmentSecretsProvider()
    };
    
    process.env['secret-name'] = 'azure-env-fallback';
    
    try {
      const result = await resolveSecret('azure:secret-name', providers);
      assert.strictEqual(result, 'azure-env-fallback');
    } finally {
      delete process.env['secret-name'];
    }
  });

  test('returns null for null input', async () => {
    const result = await resolveSecret(null);
    assert.strictEqual(result, null);
  });

  test('returns null for undefined input', async () => {
    const result = await resolveSecret(undefined);
    assert.strictEqual(result, null);
  });
});

describe('resolveSecretsInObject', () => {
  
  test('resolves secrets in object', async () => {
    process.env.API_KEY = 'secret-api-key';
    process.env.API_URL = 'https://api.example.com';
    
    try {
      const config = {
        apiKey: '$API_KEY',
        apiUrl: '$API_URL',
        otherValue: 'plain-text'
      };
      
      const result = await resolveSecretsInObject(config, { env: new EnvironmentSecretsProvider() });
      
      assert.strictEqual(result.apiKey, 'secret-api-key');
      assert.strictEqual(result.apiUrl, 'https://api.example.com');
      assert.strictEqual(result.otherValue, 'plain-text');
    } finally {
      delete process.env.API_KEY;
      delete process.env.API_URL;
    }
  });

  test('resolves nested objects', async () => {
    process.env.DEEP_KEY = 'deep-secret';
    
    try {
      const config = {
        nested: {
          key: '$DEEP_KEY'
        }
      };
      
      const result = await resolveSecretsInObject(config, { env: new EnvironmentSecretsProvider() });
      
      assert.strictEqual(result.nested.key, 'deep-secret');
    } finally {
      delete process.env.DEEP_KEY;
    }
  });

  test('resolves only specified keys', async () => {
    process.env.RESOLVE_ME = 'resolved';
    process.env.IGNORE_ME = 'ignored';
    
    try {
      const config = {
        resolveMe: '$RESOLVE_ME',
        ignoreMe: '$IGNORE_ME'
      };
      
      const result = await resolveSecretsInObject(
        config, 
        { env: new EnvironmentSecretsProvider() },
        ['resolveMe']
      );
      
      assert.strictEqual(result.resolveMe, 'resolved');
      assert.strictEqual(result.ignoreMe, '$IGNORE_ME');
    } finally {
      delete process.env.RESOLVE_ME;
      delete process.env.IGNORE_ME;
    }
  });
});

describe('isSecretReference', () => {
  
  test('returns true for $VAR', () => {
    assert.strictEqual(isSecretReference('$VAR'), true);
  });

  test('returns true for aws: format', () => {
    assert.strictEqual(isSecretReference('aws:secret-name'), true);
  });

  test('returns true for azure: format', () => {
    assert.strictEqual(isSecretReference('azure:secret-name'), true);
  });

  test('returns false for plain text', () => {
    assert.strictEqual(isSecretReference('plain-text'), false);
  });

  test('returns false for non-strings', () => {
    assert.strictEqual(isSecretReference(null), false);
    assert.strictEqual(isSecretReference(123), false);
    assert.strictEqual(isSecretReference({}), false);
  });
});

describe('createSecretsProvider', () => {
  
  test('creates EnvironmentSecretsProvider by default', () => {
    const provider = createSecretsProvider();
    assert.ok(provider instanceof EnvironmentSecretsProvider);
  });

  test('creates EnvironmentSecretsProvider for type env', () => {
    const provider = createSecretsProvider({ type: 'env' });
    assert.ok(provider instanceof EnvironmentSecretsProvider);
  });

  test('creates AWSSecretsManagerProvider for type aws', () => {
    const provider = createSecretsProvider({ type: 'aws' });
    assert.ok(provider.constructor.name.includes('AWSSecretsManager'));
  });

  test('creates AzureKeyVaultProvider for type azure', () => {
    const provider = createSecretsProvider({ type: 'azure' });
    assert.ok(provider.constructor.name.includes('AzureKeyVault'));
  });

  test('defaults to env for unknown type', () => {
    const provider = createSecretsProvider({ type: 'unknown' });
    assert.ok(provider instanceof EnvironmentSecretsProvider);
  });
});

describe('createAllProviders', () => {
  
  test('creates env provider by default', () => {
    const providers = createAllProviders();
    assert.ok(providers.env instanceof EnvironmentSecretsProvider);
  });

  test('creates aws provider when configured', () => {
    const providers = createAllProviders({ aws: { region: 'us-west-2' } });
    assert.ok(providers.aws);
  });

  test('creates azure provider when configured', () => {
    const providers = createAllProviders({ azure: { vaultUrl: 'https://test.vault.azure.net' } });
    assert.ok(providers.azure);
  });
});
