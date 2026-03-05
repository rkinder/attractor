/**
 * MCP Handler - Pipeline handler for MCP tool invocation
 * 
 * Invokes external tools via MCP (Model Context Protocol) servers
 * Reads mcp_server, mcp_tool, and mcp_args attributes from nodes
 */

import fs from 'fs/promises';
import path from 'path';
import { Handler } from './registry.js';
import { Outcome } from '../pipeline/outcome.js';

export class MCPHandler extends Handler {
  /**
   * @param {MCPClient} mcpClient - MCP client instance
   */
  constructor(mcpClient) {
    super();
    this.mcpClient = mcpClient;
  }

  /**
   * Execute MCP tool invocation
   * @param {Object} node - Pipeline node with MCP attributes
   * @param {Context} context - Execution context
   * @param {Graph} graph - Pipeline graph
   * @param {string} logsRoot - Root directory for logs
   * @returns {Promise<Outcome>} Execution outcome
   */
  async execute(node, context, graph, logsRoot) {
    // 1. Extract MCP attributes from node
    const mcpServer = node.attributes?.mcp_server || node.attrs?.mcp_server;
    const mcpTool = node.attributes?.mcp_tool || node.attrs?.mcp_tool;
    const mcpArgs = node.attributes?.mcp_args || node.attrs?.mcp_args || {};
    const timeout = node.attributes?.timeout || node.attrs?.timeout || 30000;

    // 2. Validate required attributes
    if (!mcpServer) {
      const outcome = Outcome.fail('No mcp_server specified');
      const stageDir = path.join(logsRoot, node.id);
      await fs.mkdir(stageDir, { recursive: true });
      await this._writeError(stageDir, 'No mcp_server specified');
      await this._writeOutcome(stageDir, outcome);
      return outcome;
    }

    if (!mcpTool) {
      const outcome = Outcome.fail('No mcp_tool specified');
      const stageDir = path.join(logsRoot, node.id);
      await fs.mkdir(stageDir, { recursive: true });
      await this._writeError(stageDir, 'No mcp_tool specified');
      await this._writeOutcome(stageDir, outcome);
      return outcome;
    }

    // 3. Create stage directory
    const stageDir = path.join(logsRoot, node.id);
    await fs.mkdir(stageDir, { recursive: true });

    try {
      // 4. Write request to log
      const requestLog = {
        server: mcpServer,
        tool: mcpTool,
        arguments: mcpArgs,
        timeout: timeout,
        timestamp: new Date().toISOString()
      };
      await fs.writeFile(
        path.join(stageDir, 'mcp_request.json'), 
        JSON.stringify(requestLog, null, 2)
      );

      // 5. Call MCP tool
      console.log(`Calling MCP tool: ${mcpServer}/${mcpTool}`);
      const result = await this.mcpClient.callTool(mcpServer, mcpTool, mcpArgs, timeout);

      // 6. Extract content from response
      const output = this._extractOutput(result);

      // 7. Write response to log
      const responseLog = {
        result: result,
        output: output,
        timestamp: new Date().toISOString()
      };
      await fs.writeFile(
        path.join(stageDir, 'mcp_response.json'), 
        JSON.stringify(responseLog, null, 2)
      );

      // 8. Return success outcome with output
      return Outcome.success(`MCP tool ${mcpTool} completed`, {
        [`${node.id}.output`]: output,
        'last_response': output
      });

    } catch (error) {
      // 9. Handle errors
      const errorMessage = error.message;
      console.error(`MCP error: ${errorMessage}`);

      // Write error to log
      await this._writeError(stageDir, errorMessage);

      // Return failure outcome
      const outcome = Outcome.fail(`MCP error: ${errorMessage}`);
      await this._writeOutcome(stageDir, outcome);
      return outcome;
    }
  }

  /**
   * Extract text output from MCP response content array
   * @private
   * @param {Object} result - MCP tool result
   * @returns {string} Extracted text output
   */
  _extractOutput(result) {
    const content = result?.content;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      // Return stringified result if no content array
      return JSON.stringify(result);
    }

    // Extract text from content array
    const textParts = content
      .filter(item => item.type === 'text')
      .map(item => item.text || '')
      .join('');

    // If no text content found, return stringified result
    if (!textParts) {
      return JSON.stringify(result);
    }
    
    return textParts;
  }

  /**
   * Write error to log file
   * @private
   */
  async _writeError(stageDir, errorMessage) {
    await fs.writeFile(path.join(stageDir, 'error.txt'), errorMessage);
  }

  /**
   * Write outcome to log file
   * @private
   */
  async _writeOutcome(stageDir, outcome) {
    const outcomeData = {
      status: outcome.status,
      notes: outcome.notes,
      failure_reason: outcome.failure_reason,
      preferred_label: outcome.preferred_label,
      suggested_next_ids: outcome.suggested_next_ids,
      context_updates: outcome.context_updates,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(stageDir, 'outcome.json'), 
      JSON.stringify(outcomeData, null, 2)
    );
  }
}

export default MCPHandler;
