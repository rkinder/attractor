import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { MCPClient } from '../src/mcp/client.js';
import { MCPHandler } from '../src/handlers/mcp.js';

describe('MCPClient', () => {
  
  test('loadConfig loads valid mcp.config.json', async () => {
    // Create a test config file
    const configPath = './test-mcp-config.json';
    const config = {
      mcp_servers: {
        test_server: {
          command: 'node',
          args: ['-e', 'console.log("test")'],
          env: { TEST_VAR: 'test' }
        }
      }
    };
    
    await fs.writeFile(configPath, JSON.stringify(config));
    
    try {
      const client = new MCPClient(configPath);
      const loadedConfig = await client.loadConfig();
      
      assert.ok(loadedConfig.mcp_servers);
      assert.ok(loadedConfig.mcp_servers.test_server);
      assert.strictEqual(loadedConfig.mcp_servers.test_server.command, 'node');
    } finally {
      await fs.unlink(configPath);
    }
  });
  
  test('loadConfig handles missing config gracefully', async () => {
    const client = new MCPClient('./nonexistent-config.json');
    const config = await client.loadConfig();
    
    assert.deepStrictEqual(config, {});
  });
  
  test('getServerConfig returns server config', async () => {
    const configPath = './test-mcp-config2.json';
    const config = {
      mcp_servers: {
        my_server: {
          command: 'echo',
          args: ['hello']
        }
      }
    };
    
    await fs.writeFile(configPath, JSON.stringify(config));
    
    try {
      const client = new MCPClient(configPath);
      await client.loadConfig();
      
      const serverConfig = client.getServerConfig('my_server');
      assert.ok(serverConfig);
      assert.strictEqual(serverConfig.command, 'echo');
      
      const missingConfig = client.getServerConfig('nonexistent');
      assert.strictEqual(missingConfig, null);
    } finally {
      await fs.unlink(configPath);
    }
  });
  
  test('isServerRunning returns false for non-running server', async () => {
    const client = new MCPClient();
    assert.strictEqual(client.isServerRunning('test'), false);
  });
  
  test('getRunningServers returns empty array initially', async () => {
    const client = new MCPClient();
    const servers = client.getRunningServers();
    assert.deepStrictEqual(servers, []);
  });
});

describe('MCPHandler', () => {
  
  test('MCPHandler can be instantiated', () => {
    const client = new MCPClient();
    const handler = new MCPHandler(client);
    assert.ok(handler);
    assert.ok(handler instanceof MCPHandler);
  });
  
  test('MCPHandler requires mcp_server attribute', async () => {
    const client = new MCPClient();
    const handler = new MCPHandler(client);
    
    const node = {
      id: 'test-node',
      attributes: {
        mcp_tool: 'test-tool'
      }
    };
    
    const context = {};
    const graph = {};
    const logsRoot = './test-mcp-logs';
    
    try {
      const result = await handler.execute(node, context, graph, logsRoot);
      assert.strictEqual(result.status, 'fail');
      assert.ok(result.failure_reason.includes('mcp_server'));
    } finally {
      try {
        await fs.rm(logsRoot, { recursive: true });
      } catch {}
    }
  });
  
  test('MCPHandler requires mcp_tool attribute', async () => {
    const client = new MCPClient();
    const handler = new MCPHandler(client);
    
    const node = {
      id: 'test-node',
      attributes: {
        mcp_server: 'test-server'
      }
    };
    
    const context = {};
    const graph = {};
    const logsRoot = './test-mcp-logs2';
    
    try {
      const result = await handler.execute(node, context, graph, logsRoot);
      assert.strictEqual(result.status, 'fail');
      assert.ok(result.failure_reason.includes('mcp_tool'));
    } finally {
      try {
        await fs.rm(logsRoot, { recursive: true });
      } catch {}
    }
  });
  
  test('MCPHandler extracts output from content array', () => {
    const client = new MCPClient();
    const handler = new MCPHandler(client);
    
    // Test output extraction
    const result1 = handler._extractOutput({
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'World' }
      ]
    });
    assert.strictEqual(result1, 'Hello World');
    
    // Test empty content - returns stringified result
    const result2 = handler._extractOutput({});
    assert.strictEqual(result2, '{}');
    
    // Test non-text content - returns stringified result
    const result3 = handler._extractOutput({
      content: [{ type: 'image', data: 'abc' }]
    });
    assert.strictEqual(result3, '{"content":[{"type":"image","data":"abc"}]}');
  });
});

describe('MCP Integration', () => {
  
  test('MCPHandler registers with registry', async () => {
    const { Attractor } = await import('../src/index.js');
    
    // Just verify Attractor can be created without errors
    const attractor = await Attractor.create();
    assert.ok(attractor);
    
    // Verify MCP handler is registered
    const mcpHandler = attractor.handlerRegistry.get('mcp');
    assert.ok(mcpHandler);
  });
});