/**
 * PipelineManager - Manages pipeline executions
 * 
 * Handles creating, tracking, and canceling pipeline executions
 */

import path from 'path';
import { PipelineExecution, PipelineStatus } from './pipeline-execution.js';
import { Attractor } from '../index.js';
import { coordinatorService } from './coordinator.js';
import { config } from './config.js';

export class PipelineManager {
  constructor() {
    this.executions = new Map();
    this.attractor = null;
    this.websockets = new Map(); // Map of pipeline_id -> Set of WebSocket connections
  }

  /**
   * Initialize the Attractor instance
   */
  async initialize() {
    this.attractor = await Attractor.create();
  }

  /**
   * Create a new pipeline execution
   * @param {Object} options - Pipeline options
   * @returns {PipelineExecution} The created execution
   */
  create(options) {
    const id = this._generateId();
    const execution = new PipelineExecution({
      id,
      dotSource: options.dotSource,
      autoApprove: options.autoApprove,
      gateway: options.gateway
    });
    
    this.executions.set(id, execution);
    
    // Initialize WebSocket set for this pipeline
    this.websockets.set(id, new Set());
    
    return execution;
  }

  /**
   * Start executing a pipeline
   * @param {string} id - Pipeline ID
   * @returns {Promise<void>}
   */
  async start(id) {
    const execution = this.executions.get(id);
    if (!execution) {
      throw new Error(`Pipeline ${id} not found`);
    }

    if (execution.status !== PipelineStatus.PENDING) {
      throw new Error(`Pipeline ${id} is not in pending state`);
    }

    execution.status = PipelineStatus.RUNNING;
    execution.startedAt = new Date().toISOString();

    // Broadcast status change
    this._broadcast(id, execution.toJSON());

    try {
      // Execute pipeline asynchronously
      // Use runFromString if content looks like DOT (starts with digraph/graph), otherwise treat as file path
      const isDotContent = execution.dotSource.trim().startsWith('digraph') || 
                          execution.dotSource.trim().startsWith('graph');
      
      const options = {
        logsRoot: path.join(config.get('storage.logsDir'), id),
        autoApprove: execution.autoApprove
      };
      
      let result;
      if (isDotContent) {
        result = await this.attractor.runFromString(execution.dotSource, options);
      } else {
        result = await this.attractor.run(execution.dotSource, options);
      }

      if (execution.cancelled) {
        execution.status = PipelineStatus.CANCELLED;
      } else if (result && result.success === true) {
        execution.status = PipelineStatus.COMPLETED;
        execution.outcomeStatus = 'success';
        execution.outcomeNotes = result.finalOutcome?.notes || 'Pipeline completed successfully';
        
        // Notify coordinator of completion
        await coordinatorService.onPipelineComplete(id, {
          success: true,
          outcome: result.finalOutcome || result  // Use finalOutcome if available, else the whole result
        });
      } else {
        execution.status = PipelineStatus.FAILED;
        execution.outcomeStatus = 'fail';
        execution.outcomeNotes = result?.failure_reason || result?.notes || 'Pipeline failed';
        
        // Notify coordinator of failure
        await coordinatorService.onPipelineError(id, new Error(execution.outcomeNotes));
      }
    } catch (error) {
      execution.status = PipelineStatus.FAILED;
      execution.error = error.message;
      execution.outcomeStatus = 'fail';
      execution.outcomeNotes = error.message;
      
      // Notify coordinator of error
      await coordinatorService.onPipelineError(id, error);
    }

    execution.completedAt = new Date().toISOString();

    // Broadcast final status
    this._broadcast(id, execution.toJSON());
  }

  /**
   * Cancel a running pipeline
   * @param {string} id - Pipeline ID
   * @returns {Object} Result message
   */
  cancel(id) {
    const execution = this.executions.get(id);
    if (!execution) {
      throw new Error(`Pipeline ${id} not found`);
    }

    if (execution.status === PipelineStatus.COMPLETED || 
        execution.status === PipelineStatus.FAILED ||
        execution.status === PipelineStatus.CANCELLED) {
      throw new Error(`Pipeline ${id} is already in terminal state: ${execution.status}`);
    }

    execution.cancelled = true;
    execution.status = PipelineStatus.CANCELLED;
    execution.completedAt = new Date().toISOString();

    // Broadcast status change
    this._broadcast(id, execution.toJSON());

    return { message: 'Pipeline cancelled' };
  }

  /**
   * Get pipeline status
   * @param {string} id - Pipeline ID
   * @returns {PipelineExecution} The execution
   */
  get(id) {
    const execution = this.executions.get(id);
    if (!execution) {
      return null;
    }
    return execution;
  }

  /**
   * List all pipeline executions
   * @returns {Array} Array of executions
   */
  list() {
    return Array.from(this.executions.values()).map(e => e.toJSON());
  }

  /**
   * Register a WebSocket connection for a pipeline
   * @param {string} id - Pipeline ID
   * @param {WebSocket} ws - WebSocket connection
   */
  registerWebSocket(id, ws) {
    if (!this.websockets.has(id)) {
      this.websockets.set(id, new Set());
    }
    this.websockets.get(id).add(ws);
  }

  /**
   * Unregister a WebSocket connection
   * @param {string} id - Pipeline ID
   * @param {WebSocket} ws - WebSocket connection
   */
  unregisterWebSocket(id, ws) {
    const connections = this.websockets.get(id);
    if (connections) {
      connections.delete(ws);
    }
  }

  /**
   * Broadcast a custom message to all WebSocket connections for a pipeline
   * @param {string} id - Pipeline ID
   * @param {Object} message - Message to broadcast
   */
  broadcastToPipeline(id, message) {
    const connections = this.websockets.get(id);
    if (!connections) return;

    const messageStr = JSON.stringify(message);
    for (const ws of connections) {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(messageStr);
        }
      } catch (error) {
        console.error(`Error broadcasting to WebSocket: ${error.message}`);
      }
    }
  }

  /**
   * Broadcast status to all WebSocket connections for a pipeline
   * @private
   */
  _broadcast(id, data) {
    const connections = this.websockets.get(id);
    if (!connections) return;

    const message = JSON.stringify(data);
    for (const ws of connections) {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      } catch (error) {
        console.error(`Error broadcasting to WebSocket: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique pipeline ID
   * @private
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `pipeline-${timestamp}-${random}`;
  }

  /**
   * Cancel all running pipelines (for graceful shutdown)
   */
  async cancelAll() {
    for (const [id, execution] of this.executions) {
      if (execution.status === PipelineStatus.RUNNING) {
        this.cancel(id);
      }
    }
  }
}

export default PipelineManager;
