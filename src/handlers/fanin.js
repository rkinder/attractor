/**
 * FanIn Handler - Consolidate results from parallel branches using LLM
 */

import fs from 'fs/promises';
import path from 'path';
import { Handler } from './registry.js';
import { Outcome, StageStatus } from '../pipeline/outcome.js';
import { Context } from '../pipeline/context.js';

export class FanInHandler extends Handler {
  /**
   * @param {Object} backend - LLM backend for consolidation (same as CodergenHandler)
   */
  constructor(backend = null) {
    super();
    this.backend = backend;
  }

  /**
   * Consolidate results from multiple branches using LLM
   * @param {Object} node - FanIn node with prompt attribute
   * @param {Context} context - Execution context with branch outputs
   * @param {Graph} graph - Pipeline graph
   * @param {string} logsRoot - Root directory for logs
   * @returns {Promise<Outcome>} Consolidation outcome
   */
  async execute(node, context, graph, logsRoot) {
    // 1. Get incoming edges from graph
    const edges = graph.getIncomingEdges(node.id);
    
    // 2. Handle empty edges case
    if (!edges || edges.length === 0) {
      return Outcome.success('No branches to consolidate');
    }
    
    // 3. Collect branch outputs
    const branchResults = [];
    const missingBranches = [];
    
    for (const edge of edges) {
      const sourceNodeId = edge.from; // or edge.fromId depending on structure
      const outputKey = `${sourceNodeId}.output`;
      
      const output = context.get(outputKey);
      if (output !== null && output !== undefined) {
        branchResults.push({
          nodeId: sourceNodeId,
          output: output
        });
      } else {
        missingBranches.push(sourceNodeId);
        console.warn(`FanIn [${node.id}]: Branch output missing for node '${sourceNodeId}'`);
      }
    }
    
    // 4. Create stage directory
    const stageDir = path.join(logsRoot, node.id);
    try {
      await fs.mkdir(stageDir, { recursive: true });
    } catch (error) {
      return Outcome.fail(`Failed to create stage directory: ${error.message}`);
    }
    
    // 5. Build base prompt
    let basePrompt = node.prompt || 'Consolidate the following results:';
    
    // 6. Expand variables in base prompt
    basePrompt = this._expandVariables(basePrompt, graph, context);
    
    // 7. Format branch results
    let prompt = basePrompt;
    
    if (branchResults.length > 0) {
      prompt += '\n\n';
      
      for (let i = 0; i < branchResults.length; i++) {
        const result = branchResults[i];
        const index = i + 1;
        prompt += `## Result ${index} (from ${result.nodeId})\n\n`;
        prompt += `${result.output}\n\n`;
      }
    }
    
    // 8. Add default consolidation instruction if needed
    if (!prompt.toLowerCase().includes('consolidate')) {
      prompt += '\nConsolidate these results into a unified summary.';
    }
    
    // 9. Write prompt to log
    await fs.writeFile(path.join(stageDir, 'prompt.md'), prompt);
    
    // 10. Process results
    let responseText;
    let outcome;
    
    if (branchResults.length === 0) {
      // No results to process, but still need to return success
      responseText = '';
      outcome = Outcome.success('No branch outputs to consolidate');
    } else {
      try {
        if (this.backend) {
          // 11. Call backend for consolidation
          const result = await this.backend.run(node, prompt, context);
          
          // Handle both string and Outcome return types
          if (result && typeof result === 'object' && result.status) {
            // This is an Outcome object
            responseText = result.response || result.notes || '';
          } else {
            // This is a string response
            responseText = String(result);
          }
        } else {
          // 12. Simulation mode
          responseText = `[Simulated consolidation of ${branchResults.length} results]`;
        }
        
        // 13. Write response to log
        await fs.writeFile(path.join(stageDir, 'response.md'), responseText);
        
        // 14. Store in context
        const contextUpdates = {
          [`${node.id}.output`]: responseText,
          'fanin.branch_count': branchResults.length
        };
        
        // Also set last_response for compatibility
        if (responseText) {
          contextUpdates.last_response = responseText;
        }
        
        // 15. Create success outcome
        const notes = this.backend 
          ? `Consolidated ${branchResults.length} branch results` 
          : `Simulated consolidation of ${branchResults.length} results`;
          
        outcome = Outcome.success(notes, contextUpdates);
        
      } catch (error) {
        // 16. Handle backend errors
        const errorMessage = `Backend error: ${error.message}`;
        await fs.writeFile(path.join(stageDir, 'error.txt'), errorMessage);
        return Outcome.fail(errorMessage);
      }
    }
    
    // 17. Write outcome to log
    const outcomeData = {
      status: outcome.status,
      notes: outcome.notes,
      failure_reason: outcome.failure_reason,
      preferred_label: outcome.preferred_label,
      suggested_next_ids: outcome.suggested_next_ids,
      context_updates: outcome.context_updates,
      timestamp: new Date().toISOString(),
      branch_count: branchResults.length,
      missing_branches: missingBranches
    };
    
    await fs.writeFile(path.join(stageDir, 'outcome.json'), JSON.stringify(outcomeData, null, 2));
    
    return outcome;
  }
  
  /**
   * Expand variables in prompt (same as CodergenHandler)
   * @private
   */
  _expandVariables(prompt, graph, context) {
    // Simple variable expansion for $goal, $last_response, and $<node_id>.output
    let expanded = prompt;
    
    // Expand $goal with graph goal
    expanded = expanded.replace(/\$goal/g, graph.goal || '');
    
    // Expand $last_response with context value
    const lastResponse = context.get('last_response');
    expanded = expanded.replace(/\$last_response/g, lastResponse || '');
    
    // Expand $<node_id>.output with context values
    const outputRegex = /\$([a-zA-Z0-9_-]+)\.output/g;
    const matches = expanded.match(outputRegex);
    
    if (matches) {
      for (const match of matches) {
        const nodeId = match.slice(1, -7); // Remove $ and .output
        const outputKey = `${nodeId}.output`;
        const outputValue = context.get(outputKey);
        expanded = expanded.replace(match, outputValue || '');
      }
    }
    
    return expanded;
  }
}