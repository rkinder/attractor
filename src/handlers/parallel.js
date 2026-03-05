/**
 * Parallel Handler - Execute multiple branches concurrently
 */

import fs from 'fs/promises';
import path from 'path';
import { Handler } from './registry.js';
import { Outcome, StageStatus } from '../pipeline/outcome.js';
import { Context } from '../pipeline/context.js';

export class ParallelHandler extends Handler {
  /**
   * @param {HandlerRegistry} handlerRegistry - Registry for resolving branch handlers
   */
  constructor(handlerRegistry) {
    super();
    this.handlerRegistry = handlerRegistry;
  }

  /**
   * Execute multiple branches in parallel
   * @param {Object} node - Parallel node with max_parallel attribute
   * @param {Context} context - Execution context
   * @param {Graph} graph - Pipeline graph
   * @param {string} logsRoot - Root directory for logs
   * @returns {Promise<Outcome>} Aggregate execution outcome
   */
  async execute(node, context, graph, logsRoot) {
    // 1. Get outgoing edges from graph
    const edges = graph.getOutgoingEdges(node.id);
    
    // 2. Handle empty branches case
    if (!edges || edges.length === 0) {
      return Outcome.success('No branches to execute');
    }
    
    // 3. Extract max_parallel configuration with default of 4
    const maxParallelAttr = node.attributes?.max_parallel;
    let maxParallel = 4; // Default
    
    if (maxParallelAttr !== undefined && maxParallelAttr !== null) {
      const parsed = parseInt(maxParallelAttr);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
        maxParallel = parsed;
      } else if (parsed > 50) {
        // Log warning for values over 50
        console.warn(`Warning: max_parallel value ${parsed} exceeds 50, using 50`);
        maxParallel = 50;
      } else {
        // Invalid value, use default
        console.warn(`Warning: Invalid max_parallel value "${maxParallelAttr}", using default 4`);
      }
    }
    
    // 4. Create parallel node directory
    const parallelDir = path.join(logsRoot, node.id);
    await fs.mkdir(parallelDir, { recursive: true });
    
    // 5. Create branch directories for logging
    const branchDirs = [];
    for (const edge of edges) {
      const branchDir = path.join(parallelDir, `branch_${edge.to}`);
      branchDirs.push(branchDir);
      await fs.mkdir(branchDir, { recursive: true });
    }
    
    // 6. Create concurrency limiter (using a simple approach with Promise.allSettled)
    // For now, we'll use Promise.allSettled with a custom semaphore approach
    const results = await this._executeBranches(edges, context, graph, parallelDir, maxParallel);
    
    // 7. Aggregate results
    const aggregateOutcome = this._aggregateResults(results, edges);
    
    // 8. Write summary file
    await this._writeSummary(parallelDir, aggregateOutcome, results, edges, maxParallel);
    
    return aggregateOutcome;
  }
  
  /**
   * Execute all branches with concurrency control
   * @private
   */
  async _executeBranches(edges, context, graph, logsRoot, maxParallel) {
    // Simple semaphore implementation for concurrency control
    const semaphore = {
      count: 0,
      max: maxParallel,
      waiting: [],
      
      async acquire() {
        if (this.count < this.max) {
          this.count++;
          return Promise.resolve();
        } else {
          return new Promise((resolve) => {
            this.waiting.push(resolve);
          });
        }
      },
      
      release() {
        this.count--;
        if (this.waiting.length > 0) {
          this.count++;
          const resolve = this.waiting.shift();
          resolve();
        }
      }
    };
    
    // Execute all branches
    const promises = edges.map(async (edge) => {
      // Acquire semaphore
      await semaphore.acquire();
      
      try {
        const result = await this._executeBranch(edge, context, graph, logsRoot);
        return result;
      } finally {
        // Release semaphore
        semaphore.release();
      }
    });
    
    // Wait for all branches to complete
    const results = await Promise.allSettled(promises);
    
    // Extract the actual results (not Promise rejection objects)
    return results.map(promiseResult => {
      if (promiseResult.status === 'fulfilled') {
        return promiseResult.value;
      } else {
        // Handle rejected promises
        return Outcome.fail(`Branch execution failed: ${promiseResult.reason.message}`);
      }
    });
  }
  
  /**
   * Execute a single branch
   * @private
   */
  async _executeBranch(edge, context, graph, logsRoot) {
    try {
      // 1. Get target node
      const targetNode = graph.getNode(edge.to);
      if (!targetNode) {
        return Outcome.fail(`Target node not found: ${edge.to}`);
      }
      
      // 2. Create isolated context snapshot for this branch
      const branchContext = new Context();
      const snapshot = context.snapshot();
      for (const [key, value] of Object.entries(snapshot)) {
        branchContext.set(key, value);
      }
      branchContext.logs = [...context.logs];
      
      // 3. Create branch-specific log directory
      const branchDir = path.join(logsRoot, `branch_${targetNode.id}`);
      await fs.mkdir(branchDir, { recursive: true });
      
      // 4. Resolve handler for target node
      const handler = this.handlerRegistry.resolve(targetNode);
      if (!handler) {
        return Outcome.fail(`No handler found for node type: ${targetNode.type || targetNode.shape}`);
      }
      
      // 5. Execute branch with isolated context and logs
      const result = await handler.execute(targetNode, branchContext, graph, branchDir);
      
      // 6. Return outcome
      return result;
    } catch (error) {
      // Handle exceptions by converting to FAIL outcome
      return Outcome.fail(`Branch execution failed: ${error.message}`);
    }
  }
  
  /**
   * Aggregate results from all branches
   * @private
   */
  _aggregateResults(results, edges) {
    const successCount = results.filter(result => 
      result.status === StageStatus.SUCCESS || result.status === StageStatus.PARTIAL_SUCCESS
    ).length;
    
    const totalCount = results.length;
    
    // Create branch result data for context
    const branchResults = edges.map((edge, index) => {
      const result = results[index];
      return {
        id: edge.to,
        status: result.status,
        notes: result.notes,
        failureReason: result.failure_reason
      };
    });
    
    const contextUpdates = {
      'parallel.results': JSON.stringify({ branches: branchResults }),
      'parallel.success_count': successCount,
      'parallel.fail_count': totalCount - successCount,
      'parallel.total_count': totalCount
    };
    
    // Store individual branch outputs in context
    results.forEach((result, index) => {
      if (result.context_updates) {
        for (const [key, value] of Object.entries(result.context_updates)) {
          if (key.startsWith('last_response') || key.startsWith('output')) {
            // Store branch-specific outputs
            contextUpdates[`parallel.branches.${edges[index].to}.${key}`] = value;
          }
        }
      }
    });
    
    // Determine aggregate status
    if (successCount === totalCount) {
      // All branches succeeded
      return Outcome.success(`All ${totalCount} branches succeeded`, contextUpdates);
    } else if (successCount === 0) {
      // All branches failed
      const failureReasons = branchResults
        .filter(br => br.failureReason)
        .map(br => `Branch ${br.id}: ${br.failureReason}`)
        .join('; ');
      
      return Outcome.fail(`All ${totalCount} branches failed: ${failureReasons}`, contextUpdates);
    } else {
      // Partial success
      const failedBranches = branchResults
        .filter(br => br.status !== StageStatus.SUCCESS && br.status !== StageStatus.PARTIAL_SUCCESS)
        .map(br => br.id);
      
      const failureReasons = failedBranches.length > 0 
        ? `Failed branches: ${failedBranches.join(', ')}`
        : '';
      
      return Outcome.partialSuccess(`${successCount}/${totalCount} branches succeeded`, {
        ...contextUpdates,
        failureReason: failureReasons
      });
    }
  }
  
  /**
   * Write summary JSON file with aggregate results
   * @private
   */
  async _writeSummary(parallelDir, aggregateOutcome, results, edges, maxParallel) {
    const summary = {
      timestamp: new Date().toISOString(),
      total_branches: edges.length,
      success_count: results.filter(r => 
        r.status === StageStatus.SUCCESS || r.status === StageStatus.PARTIAL_SUCCESS
      ).length,
      fail_count: results.filter(r => 
        r.status !== StageStatus.SUCCESS && r.status !== StageStatus.PARTIAL_SUCCESS
      ).length,
      max_parallel: maxParallel,
      branches: edges.map((edge, index) => {
        const result = results[index];
        return {
          id: edge.to,
          status: result.status,
          notes: result.notes,
          failure_reason: result.failure_reason,
          timestamp: new Date().toISOString()
        };
      }),
      aggregate_status: aggregateOutcome.status,
      aggregate_notes: aggregateOutcome.notes,
      aggregate_failure_reason: aggregateOutcome.failure_reason
    };
    
    const summaryPath = path.join(parallelDir, 'summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  }
}