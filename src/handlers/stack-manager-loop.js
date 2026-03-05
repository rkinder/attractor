/**
 * Stack Manager Loop Handler - Manage recursive execution loops
 * 
 * EARS Format Requirements:
 * - Handle recursive execution loops in workflows
 * - Manage stack-based execution context
 * - Support loop detection and termination
 * - Maintain proper context isolation
 * - Log loop execution details
 */

import fs from 'fs/promises';
import path from 'path';
import { Handler } from './registry.js';
import { Outcome } from '../pipeline/outcome.js';
import { Context } from '../pipeline/context.js';

export class StackManagerLoopHandler extends Handler {
  /**
   * Execute stack manager loop operation
   * @param {Object} node - Pipeline node with loop configuration
   * @param {Context} context - Execution context
   * @param {Graph} graph - Pipeline graph
   * @param {string} logsRoot - Root directory for logs
   * @returns {Promise<Outcome>} Execution outcome
   */
  async execute(node, context, graph, logsRoot) {
    // 1. Extract loop configuration
    const loopConfig = this._extractLoopConfig(node);
    
    // 2. Create stage directory
    const stageDir = path.join(logsRoot, node.id);
    await fs.mkdir(stageDir, { recursive: true });
    
    // 3. Write configuration to log
    await fs.writeFile(path.join(stageDir, 'config.json'), JSON.stringify(loopConfig, null, 2));
    
    // 4. Check for loop detection
    const loopKey = `loop.${node.id}`;
    const loopCount = context.getNumber(loopKey, 0);
    
    // 5. Handle loop termination conditions
    if (loopCount >= (loopConfig.maxIterations || 100)) {
      const errorMessage = `Loop iteration limit exceeded: ${loopCount} iterations`;
      await fs.writeFile(path.join(stageDir, 'error.txt'), errorMessage);
      
      // Write outcome
      const outcomeData = {
        status: 'FAIL',
        notes: null,
        failure_reason: errorMessage,
        preferred_label: '',
        suggested_next_ids: [],
        context_updates: {},
        timestamp: new Date().toISOString()
      };
      await fs.writeFile(path.join(stageDir, 'outcome.json'), JSON.stringify(outcomeData, null, 2));
      
      return Outcome.fail(errorMessage);
    }
    
    // 6. Increment loop counter
    context.set(loopKey, loopCount + 1);
    
    // 7. Execute loop body (this would be a recursive call to the appropriate handler)
    // For now, we'll simulate a simple loop operation
    let result;
    try {
      // Simulate loop execution
      const iteration = loopCount + 1;
      const outcomeData = {
        status: 'SUCCESS',
        notes: `Loop iteration ${iteration} completed`,
        failure_reason: null,
        preferred_label: '',
        suggested_next_ids: [],
        context_updates: {
          [`${node.id}.iteration`]: iteration,
          [`${node.id}.loop_count`]: loopCount
        },
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(path.join(stageDir, 'outcome.json'), JSON.stringify(outcomeData, null, 2));
      
      result = Outcome.success(`Loop iteration ${iteration} completed`, {
        [`${node.id}.iteration`]: iteration,
        [`${node.id}.loop_count`]: loopCount
      });
      
    } catch (error) {
      const errorMessage = `Loop execution failed: ${error.message}`;
      await fs.writeFile(path.join(stageDir, 'error.txt'), errorMessage);
      
      const outcomeData = {
        status: 'FAIL',
        notes: null,
        failure_reason: errorMessage,
        preferred_label: '',
        suggested_next_ids: [],
        context_updates: {},
        timestamp: new Date().toISOString()
      };
      await fs.writeFile(path.join(stageDir, 'outcome.json'), JSON.stringify(outcomeData, null, 2));
      
      return Outcome.fail(errorMessage);
    }
    
    // 8. Write loop state to log
    const stateData = {
      iteration: loopCount + 1,
      max_iterations: loopConfig.maxIterations || 100,
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(path.join(stageDir, 'state.json'), JSON.stringify(stateData, null, 2));
    
    return result;
  }
  
  /**
   * Extract loop configuration from node attributes
   * @private
   */
  _extractLoopConfig(node) {
    return {
      maxIterations: parseInt(node.attributes?.max_iterations || '100'),
      condition: node.attributes?.condition || '',
      delay: parseInt(node.attributes?.delay || '0'),
      retryOnFailure: node.attributes?.retry_on_failure === 'true'
    };
  }
}