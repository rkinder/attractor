/**
 * Basic Node Handlers - Start, Exit, Conditional
 */

import { Handler } from './registry.js';
import { Outcome } from '../pipeline/outcome.js';

export class StartHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    return Outcome.success(`Pipeline started at node: ${node.id}`);
  }
}

export class ExitHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    return Outcome.success(`Pipeline completed at node: ${node.id}`);
  }
}

export class ConditionalHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    // Conditional routing is handled by the execution engine's edge selection
    // This handler just returns success to indicate the condition was evaluated
    return Outcome.success(`Conditional node evaluated: ${node.id}`);
  }
}