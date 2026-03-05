/**
 * Pipeline Execution Engine - Core traversal and orchestration logic
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { Context } from './context.js';
import { Outcome, StageStatus } from './outcome.js';
import { DOTParser } from './parser.js';
import { PipelineLinter } from '../validation/linter.js';
import { ModelStylesheet, StylesheetApplicator } from '../styling/stylesheet.js';
import { DirectoryWorkflowLoader } from '../workflow/directory-loader.js';

export class PipelineEngine extends EventEmitter {
  constructor(handlerRegistry, config = {}) {
    super();
    this.handlerRegistry = handlerRegistry;
    this.config = {
      logsRoot: config.logsRoot || './logs',
      enableCheckpointing: config.enableCheckpointing !== false,
      maxExecutionTime: config.maxExecutionTime || 3600000, // 1 hour
      enableValidation: config.enableValidation !== false,
      enableStylesheet: config.enableStylesheet !== false,
      ...config
    };
    this.linter = new PipelineLinter({ handlerRegistry });
    this.stylesheetApplicator = null;
  }

  async run(dotFilePath, options = {}) {
    const runId = options.runId || this._generateRunId();
    const logsDir = path.join(this.config.logsRoot, runId);
    
    // Create logs directory
    await fs.mkdir(logsDir, { recursive: true });
    
    try {
      this.emit('pipeline_start', { runId, dotFilePath, logsDir });
      
      // Load workflow using either file or directory-based loader
      const workflowLoader = new DirectoryWorkflowLoader();
      const { dotText, prompts } = await workflowLoader.load(dotFilePath);
      
      // Parse phase
      const parser = new DOTParser();
      const graph = workflowLoader.parseWithPrompts(dotText, prompts);
      
      // Validate phase
      this._validateGraph(graph);
      
      // Setup stylesheet applicator
      if (this.config.enableStylesheet && graph.modelStylesheet) {
        const stylesheet = new ModelStylesheet(graph.modelStylesheet);
        this.stylesheetApplicator = new StylesheetApplicator(stylesheet);
        this.emit('stylesheet_loaded', { stylesheet: graph.modelStylesheet });
      }
      
      // Initialize phase
      const context = this._initializeContext(graph);
      let checkpoint = this._createCheckpoint(context, null, []);
      
      if (this.config.enableCheckpointing) {
        await this._saveCheckpoint(checkpoint, logsDir);
      }
      
      // Execute phase
      const result = await this._executeGraph(graph, context, logsDir);
      
      this.emit('pipeline_complete', { runId, result });
      return result;
      
    } catch (error) {
      this.emit('pipeline_error', { runId, error });
      throw error;
    }
  }

  async _executeGraph(graph, context, logsDir) {
    const completedNodes = [];
    const nodeOutcomes = new Map();
    
    let currentNode = graph.findStartNode();
    if (!currentNode) {
      throw new Error('No start node found (shape=Mdiamond or id=start)');
    }
    
    while (true) {
      context.set(Context.CURRENT_NODE, currentNode.id);
      
      // Check for terminal node
      if (this._isTerminal(currentNode)) {
        const { goalsSatisfied, failedGoal } = this._checkGoalGates(graph, nodeOutcomes);
        
        if (!goalsSatisfied && failedGoal) {
          const retryTarget = this._getRetryTarget(failedGoal, graph);
          if (retryTarget) {
            currentNode = graph.getNode(retryTarget);
            this.emit('goal_gate_retry', { 
              failedGoal: failedGoal.id, 
              retryTarget: retryTarget 
            });
            continue;
          } else {
            throw new Error(`Goal gate '${failedGoal.id}' unsatisfied and no retry target available`);
          }
        }
        
        this.emit('pipeline_terminal', { nodeId: currentNode.id });
        break;
      }
      
      // Execute node with retry policy
      const retryPolicy = this._buildRetryPolicy(currentNode, graph);
      const outcome = await this._executeWithRetry(currentNode, context, graph, logsDir, retryPolicy);
      
      // Record completion
      completedNodes.push(currentNode.id);
      nodeOutcomes.set(currentNode.id, outcome);
      
      // Apply context updates
      context.applyUpdates(outcome.context_updates);
      context.set(Context.OUTCOME, outcome.status);
      
      if (outcome.preferred_label) {
        context.set(Context.PREFERRED_LABEL, outcome.preferred_label);
      }
      
      // Save checkpoint
      if (this.config.enableCheckpointing) {
        const checkpoint = this._createCheckpoint(context, currentNode.id, completedNodes);
        await this._saveCheckpoint(checkpoint, logsDir);
      }
      
      // Select next edge
      const nextEdge = this._selectEdge(currentNode, outcome, context, graph);
      
      if (!nextEdge) {
        if (outcome.isFailed()) {
          throw new Error(`Stage '${currentNode.id}' failed with no outgoing fail edge`);
        }
        break;
      }
      
      // Handle loop restart
      if (nextEdge.loopRestart) {
        this.emit('loop_restart', { 
          currentNode: currentNode.id, 
          restartTarget: nextEdge.to 
        });
        // In a real implementation, would restart the entire run
        throw new Error('Loop restart not implemented in this demo');
      }
      
      // Advance to next node
      const nextNode = graph.getNode(nextEdge.to);
      if (!nextNode) {
        throw new Error(`Target node '${nextEdge.to}' not found`);
      }
      
      this.emit('edge_traversed', { 
        from: currentNode.id, 
        to: nextNode.id, 
        edge: nextEdge 
      });
      
      currentNode = nextNode;
    }
    
    const lastOutcome = nodeOutcomes.get(currentNode.id);
    return {
      success: lastOutcome ? lastOutcome.isSuccess() : true,
      finalNode: currentNode.id,
      completedNodes,
      finalOutcome: lastOutcome
    };
  }

  async _executeWithRetry(node, context, graph, logsDir, retryPolicy) {
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        this.emit('node_execution_start', { 
          nodeId: node.id, 
          attempt, 
          maxAttempts: retryPolicy.maxAttempts 
        });
        
        const outcome = await this._executeNode(node, context, graph, logsDir);
        
        if (outcome.isSuccess()) {
          this._resetRetryCounter(node.id, context);
          this.emit('node_execution_success', { nodeId: node.id, outcome });
          return outcome;
        }
        
        if (outcome.needsRetry()) {
          if (attempt < retryPolicy.maxAttempts) {
            this._incrementRetryCounter(node.id, context);
            const delay = retryPolicy.getDelay(attempt);
            
            this.emit('node_execution_retry', { 
              nodeId: node.id, 
              attempt, 
              delay, 
              reason: outcome.failure_reason 
            });
            
            await this._sleep(delay);
            continue;
          } else {
            // Retries exhausted
            if (node.allowPartial) {
              this.emit('node_execution_partial', { nodeId: node.id });
              return Outcome.partialSuccess('Retries exhausted, partial accepted');
            }
            
            this.emit('node_execution_failed', { 
              nodeId: node.id, 
              reason: 'Max retries exceeded' 
            });
            
            return Outcome.fail('Max retries exceeded');
          }
        }
        
        if (outcome.isFailed()) {
          this.emit('node_execution_failed', { 
            nodeId: node.id, 
            reason: outcome.failure_reason 
          });
          return outcome;
        }
        
        // SUCCESS or PARTIAL_SUCCESS or SKIPPED
        this.emit('node_execution_success', { nodeId: node.id, outcome });
        return outcome;
        
      } catch (error) {
        if (retryPolicy.shouldRetry(error) && attempt < retryPolicy.maxAttempts) {
          const delay = retryPolicy.getDelay(attempt);
          
          this.emit('node_execution_error_retry', { 
            nodeId: node.id, 
            attempt, 
            error: error.message, 
            delay 
          });
          
          await this._sleep(delay);
          continue;
        } else {
          this.emit('node_execution_error', { nodeId: node.id, error: error.message });
          return Outcome.fail(`Execution error: ${error.message}`);
        }
      }
    }
    
    return Outcome.fail('Max retry attempts exceeded');
  }

  async _executeNode(node, context, graph, logsDir) {
    const handler = this.handlerRegistry.resolve(node);
    
    if (!handler) {
      throw new Error(`No handler found for node type: ${node.type || node.shape}`);
    }
    
    return await handler.execute(node, context, graph, logsDir);
  }

  _selectEdge(node, outcome, context, graph) {
    const edges = graph.getOutgoingEdges(node.id);
    
    if (edges.length === 0) {
      return null;
    }
    
    // Step 1: Condition matching
    const conditionMatched = edges.filter(edge => {
      if (!edge.condition) return false;
      return this._evaluateCondition(edge.condition, outcome, context);
    });
    
    if (conditionMatched.length > 0) {
      return this._bestByWeightThenLexical(conditionMatched);
    }
    
    // Step 2: Preferred label match
    if (outcome.preferred_label) {
      const labelMatched = edges.find(edge => 
        this._normalizeLabel(edge.label) === this._normalizeLabel(outcome.preferred_label)
      );
      if (labelMatched) return labelMatched;
    }
    
    // Step 3: Suggested next IDs
    if (outcome.suggested_next_ids.length > 0) {
      for (const suggestedId of outcome.suggested_next_ids) {
        const edge = edges.find(e => e.to === suggestedId);
        if (edge) return edge;
      }
    }
    
    // Step 4 & 5: Weight with lexical tiebreak (unconditional edges only)
    const unconditional = edges.filter(edge => !edge.condition);
    if (unconditional.length > 0) {
      return this._bestByWeightThenLexical(unconditional);
    }
    
    // Fallback: any edge
    return this._bestByWeightThenLexical(edges);
  }

  _bestByWeightThenLexical(edges) {
    return edges.sort((a, b) => {
      // Sort by weight descending, then by target node ascending
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.to.localeCompare(b.to);
    })[0];
  }

  _normalizeLabel(label) {
    if (!label) return '';
    return label.toLowerCase()
      .trim()
      .replace(/^\[?\w+\]\s*/, '') // Remove [Y] prefix
      .replace(/^\w+\)\s*/, '')    // Remove Y) prefix  
      .replace(/^\w+\s*-\s*/, ''); // Remove Y - prefix
  }

  _evaluateCondition(condition, outcome, context) {
    // Simple condition evaluator - in production would use a proper expression parser
    try {
      // Replace context variables
      let expr = condition
        .replace(/\boutcome\b/g, `"${outcome.status}"`)
        .replace(/\bcontext\.(\w+)/g, (match, key) => {
          const value = context.get(key);
          return typeof value === 'string' ? `"${value}"` : String(value);
        });
      
      // Basic operators
      expr = expr
        .replace(/\s*=\s*/g, ' === ')
        .replace(/\s*!=\s*/g, ' !== ')
        .replace(/\s+and\s+/gi, ' && ')
        .replace(/\s+or\s+/gi, ' || ');
      
      // Evaluate safely (in production, use a proper expression evaluator)
      return eval(expr);
    } catch (error) {
      this.emit('condition_error', { condition, error: error.message });
      return false;
    }
  }

  _isTerminal(node) {
    return node.shape === 'Msquare' || node.id === 'exit' || node.id === 'Exit';
  }

  _checkGoalGates(graph, nodeOutcomes) {
    for (const [nodeId, outcome] of nodeOutcomes.entries()) {
      const node = graph.getNode(nodeId);
      if (node && node.goalGate) {
        if (!outcome.isSuccess()) {
          return { goalsSatisfied: false, failedGoal: node };
        }
      }
    }
    return { goalsSatisfied: true, failedGoal: null };
  }

  _getRetryTarget(node, graph) {
    return node.retryTarget || 
           node.fallbackRetryTarget || 
           graph.retryTarget || 
           graph.fallbackRetryTarget || 
           null;
  }

  _buildRetryPolicy(node, graph) {
    const maxAttempts = (node.maxRetries > 0 ? node.maxRetries : graph.defaultMaxRetry) + 1;
    
    return {
      maxAttempts,
      getDelay: (attempt) => {
        // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms
        const baseDelay = 200;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const maxDelay = 60000; // 1 minute
        return Math.min(delay, maxDelay);
      },
      shouldRetry: (error) => {
        // Simple retry logic - in production, would be more sophisticated
        if (error.code === 'ENOTFOUND') return true; // Network error
        if (error.code === 'TIMEOUT') return true;
        if (error.status >= 500) return true; // Server error
        if (error.status === 429) return true; // Rate limit
        return false;
      }
    };
  }

  _validateGraph(graph) {
    if (!this.config.enableValidation) {
      // Basic validation only
      const startNode = graph.findStartNode();
      if (!startNode) {
        throw new Error('Graph must have exactly one start node (shape=Mdiamond or id=start)');
      }
      
      const exitNode = graph.findExitNode();
      if (!exitNode) {
        throw new Error('Graph must have exactly one exit node (shape=Msquare or id=exit)');
      }
      
      return;
    }
    
    // Full validation using linter
    const result = this.linter.validate(graph);
    
    if (result.hasErrors) {
      const errorMessages = result.getErrors().map(e => e.message).join('\n');
      throw new Error(`Pipeline validation failed:\n${errorMessages}`);
    }
    
    if (result.hasWarnings) {
      this.emit('validation_warnings', { 
        warnings: result.getWarnings(),
        count: result.warningCount 
      });
    }
    
    this.emit('validation_complete', { 
      errorCount: result.errorCount,
      warningCount: result.warningCount 
    });
  }

  _initializeContext(graph) {
    const context = new Context();
    
    // Mirror graph attributes into context
    context.set(Context.GRAPH_GOAL, graph.goal);
    context.set('graph.label', graph.label);
    context.set('graph.default_fidelity', graph.defaultFidelity);
    
    return context;
  }

  _createCheckpoint(context, currentNodeId, completedNodes) {
    return {
      timestamp: new Date().toISOString(),
      current_node: currentNodeId,
      completed_nodes: [...completedNodes],
      context_values: context.snapshot(),
      logs: [...context.logs]
    };
  }

  async _saveCheckpoint(checkpoint, logsDir) {
    const checkpointPath = path.join(logsDir, 'checkpoint.json');
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }

  _generateRunId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 8);
    return `run-${timestamp}-${random}`;
  }

  _resetRetryCounter(nodeId, context) {
    context.delete(`internal.retry_count.${nodeId}`);
  }

  _incrementRetryCounter(nodeId, context) {
    const key = `internal.retry_count.${nodeId}`;
    const current = context.getNumber(key, 0);
    context.set(key, current + 1);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}