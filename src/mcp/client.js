/**
 * MCP Client - Manages MCP server processes and JSON-RPC communication
 * 
 * Provides:
 * - MCP server lifecycle management
 * - JSON-RPC 2.0 communication over stdin/stdout
 * - Tool discovery and invocation
 * - Process cleanup
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import readline from 'readline';
import { EventEmitter } from 'events';

export class MCPClient extends EventEmitter {
  constructor(configPath = './mcp.config.json') {
    super();
    this.configPath = configPath;
    this.config = {};
    this.processes = new Map();
    this.toolsCache = new Map();
    this.requestId = 0;
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Load MCP server configuration from mcp.config.json
   * @returns {Promise<Object>} Server configuration
   */
  async loadConfig() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      console.log(`Loaded MCP configuration from ${this.configPath}`);
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Warning: ${this.configPath} not found, skipping MCP initialization`);
        this.config = {};
        return {};
      }
      throw error;
    }
  }

  /**
   * Get configuration for a specific server
   * @param {string} serverName - Server name
   * @returns {Object|null} Server configuration or null
   */
  getServerConfig(serverName) {
    const mcpServers = this.config.mcp_servers || {};
    return mcpServers[serverName] || null;
  }

  /**
   * Start an MCP server process
   * @param {string} serverName - Server name
   * @returns {Promise<void>}
   */
  async startServer(serverName) {
    if (this.processes.has(serverName)) {
      console.log(`Server ${serverName} already running`);
      return;
    }

    const serverConfig = this.getServerConfig(serverName);
    if (!serverConfig) {
      throw new Error(`MCP server '${serverName}' not found in configuration`);
    }

    const { command, args = [], env = {} } = serverConfig;

    if (!command) {
      throw new Error(`MCP server '${serverName}' missing required 'command' field`);
    }

    const serverEnv = { ...process.env, ...env };

    console.log(`Starting MCP server: ${serverName} (${command} ${args.join(' ')})`);

    const process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: serverEnv
    });

    // Handle process errors
    process.on('error', (error) => {
      console.error(`MCP server ${serverName} error:`, error.message);
      this.emit('serverError', { serverName, error });
    });

    process.on('exit', (code, signal) => {
      console.log(`MCP server ${serverName} exited with code ${code}, signal ${signal}`);
      this.processes.delete(serverName);
      this.toolsCache.delete(serverName);
      this.emit('serverExit', { serverName, code, signal });
    });

    // Handle stderr
    process.stderr.on('data', (data) => {
      console.error(`MCP server ${serverName} stderr:`, data.toString());
    });

    this.processes.set(serverName, process);
    console.log(`MCP server ${serverName} started`);
  }

  /**
   * Stop an MCP server process
   * @param {string} serverName - Server name
   * @returns {Promise<void>}
   */
  async stopServer(serverName) {
    const process = this.processes.get(serverName);
    if (!process) {
      console.log(`Server ${serverName} not running`);
      return;
    }

    return new Promise((resolve, reject) => {
      process.once('exit', () => {
        this.processes.delete(serverName);
        this.toolsCache.delete(serverName);
        resolve();
      });

      process.once('error', (error) => {
        this.processes.delete(serverName);
        reject(error);
      });

      // Try graceful termination first
      process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.processes.has(serverName)) {
          process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Send a JSON-RPC request to an MCP server
   * @param {string} serverName - Server name
   * @param {string} method - JSON-RPC method name
   * @param {Object} params - Method parameters
   * @param {number} timeout - Request timeout in milliseconds
   * @returns {Promise<Object>} JSON-RPC response
   */
  async _sendRequest(serverName, method, params, timeout = this.defaultTimeout) {
    const process = this.processes.get(serverName);
    if (!process) {
      throw new Error(`MCP server '${serverName}' not running`);
    }

    const requestId = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    // Create a promise that resolves when we get a response
    const responsePromise = new Promise((resolve, reject) => {
      // Create readline interface for this request
      const rl = readline.createInterface({
        input: process.stdout,
        crlfDelay: Infinity
      });

      let responseBuffer = '';

      const onLine = (line) => {
        try {
          const response = JSON.parse(line);
          if (response.id === requestId) {
            rl.close();
            resolve(response);
          }
        } catch (error) {
          // Ignore parse errors for non-JSON lines
        }
      };

      rl.on('line', onLine);

      rl.on('close', () => {
        reject(new Error(`JSON-RPC request ${requestId} timed out or server disconnected`));
      });

      process.on('error', (error) => {
        rl.close();
        reject(error);
      });
    });

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });

    // Write request to stdin
    process.stdin.write(JSON.stringify(request) + '\n');

    // Race between response and timeout
    return Promise.race([responsePromise, timeoutPromise]);
  }

  /**
   * List available tools from an MCP server
   * @param {string} serverName - Server name
   * @returns {Promise<Array>} List of available tools
   */
  async listTools(serverName) {
    // Check cache first
    if (this.toolsCache.has(serverName)) {
      return this.toolsCache.get(serverName);
    }

    // Ensure server is running
    await this.startServer(serverName);

    const response = await this._sendRequest(serverName, 'tools/list', {});

    if (response.error) {
      throw new Error(`tools/list error: ${response.error.message}`);
    }

    const tools = response.result?.tools || [];
    this.toolsCache.set(serverName, tools);
    console.log(`Discovered ${tools.length} tools on server ${serverName}`);

    return tools;
  }

  /**
   * Call an MCP tool
   * @param {string} serverName - Server name
   * @param {string} toolName - Tool name
   * @param {Object} args - Tool arguments
   * @param {number} timeout - Request timeout in milliseconds
   * @returns {Promise<Object>} Tool response
   */
  async callTool(serverName, toolName, args = {}, timeout) {
    // Ensure server is running
    await this.startServer(serverName);

    const response = await this._sendRequest(
      serverName, 
      'tools/call', 
      { name: toolName, arguments: args },
      timeout
    );

    if (response.error) {
      throw new Error(`tools/call error: ${response.error.message}`);
    }

    return response.result || {};
  }

  /**
   * Cleanup all MCP server processes
   * @returns {Promise<void>}
   */
  async cleanup() {
    console.log('Cleaning up MCP servers...');
    const serverNames = Array.from(this.processes.keys());
    
    for (const serverName of serverNames) {
      try {
        await this.stopServer(serverName);
      } catch (error) {
        console.error(`Error stopping server ${serverName}:`, error.message);
      }
    }

    console.log('MCP cleanup complete');
  }

  /**
   * Check if a server is running
   * @param {string} serverName - Server name
   * @returns {boolean}
   */
  isServerRunning(serverName) {
    return this.processes.has(serverName);
  }

  /**
   * Get all running servers
   * @returns {string[]} List of running server names
   */
  getRunningServers() {
    return Array.from(this.processes.keys());
  }
}

export default MCPClient;
