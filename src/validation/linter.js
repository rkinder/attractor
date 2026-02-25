/**
 * DOT Pipeline Validation and Linting
 */

export const Severity = {
  ERROR: 'error',
  WARNING: 'warning', 
  INFO: 'info'
};

export class ValidationMessage {
  constructor(severity, message, node = null, edge = null, suggestion = null) {
    this.severity = severity;
    this.message = message;
    this.node = node;
    this.edge = edge;
    this.suggestion = suggestion;
    this.timestamp = new Date();
  }

  toString() {
    const prefix = this.severity.toUpperCase();
    let location = '';
    
    if (this.node) {
      location = ` [node: ${this.node}]`;
    } else if (this.edge) {
      location = ` [edge: ${this.edge.from} -> ${this.edge.to}]`;
    }
    
    return `${prefix}${location}: ${this.message}${this.suggestion ? ` Suggestion: ${this.suggestion}` : ''}`;
  }
}

export class ValidationResult {
  constructor() {
    this.messages = [];
  }

  addError(message, node = null, edge = null, suggestion = null) {
    this.messages.push(new ValidationMessage(Severity.ERROR, message, node, edge, suggestion));
  }

  addWarning(message, node = null, edge = null, suggestion = null) {
    this.messages.push(new ValidationMessage(Severity.WARNING, message, node, edge, suggestion));
  }

  addInfo(message, node = null, edge = null, suggestion = null) {
    this.messages.push(new ValidationMessage(Severity.INFO, message, node, edge, suggestion));
  }

  get hasErrors() {
    return this.messages.some(m => m.severity === Severity.ERROR);
  }

  get hasWarnings() {
    return this.messages.some(m => m.severity === Severity.WARNING);
  }

  get errorCount() {
    return this.messages.filter(m => m.severity === Severity.ERROR).length;
  }

  get warningCount() {
    return this.messages.filter(m => m.severity === Severity.WARNING).length;
  }

  getErrors() {
    return this.messages.filter(m => m.severity === Severity.ERROR);
  }

  getWarnings() {
    return this.messages.filter(m => m.severity === Severity.WARNING);
  }

  toString() {
    return this.messages.map(m => m.toString()).join('\n');
  }
}

export class PipelineLinter {
  constructor(options = {}) {
    this.rules = options.rules || this._getDefaultRules();
    this.handlerRegistry = options.handlerRegistry || null;
  }

  validate(graph) {
    const result = new ValidationResult();
    
    for (const rule of this.rules) {
      rule.validate(graph, result, this.handlerRegistry);
    }
    
    return result;
  }

  _getDefaultRules() {
    return [
      new SingleStartNodeRule(),
      new SingleExitNodeRule(),
      new NoOrphanNodesRule(),
      new ValidNodeTypesRule(),
      new ValidEdgeConditionsRule(),
      new GoalGateValidationRule(),
      new RetryTargetValidationRule(),
      new TimeoutValidationRule(),
      new PromptValidationRule(),
      new HumanGateValidationRule(),
      new DeadlockDetectionRule(),
      new ReachabilityRule()
    ];
  }
}

// Base validation rule
class ValidationRule {
  validate(graph, result, handlerRegistry) {
    throw new Error('ValidationRule.validate() must be implemented');
  }
}

// Must have exactly one start node
class SingleStartNodeRule extends ValidationRule {
  validate(graph, result) {
    const startNodes = [];
    
    for (const node of graph.nodes.values()) {
      if (node.shape === 'Mdiamond' || node.id === 'start' || node.id === 'Start') {
        startNodes.push(node);
      }
    }
    
    if (startNodes.length === 0) {
      result.addError(
        'Graph must have exactly one start node (shape=Mdiamond or id=start)',
        null, null,
        'Add a start node: start [shape=Mdiamond]'
      );
    } else if (startNodes.length > 1) {
      result.addError(
        `Graph has ${startNodes.length} start nodes, must have exactly one`,
        null, null,
        'Remove duplicate start nodes or change their shape'
      );
      
      for (let i = 1; i < startNodes.length; i++) {
        result.addError(`Duplicate start node: ${startNodes[i].id}`, startNodes[i].id);
      }
    }
  }
}

// Must have exactly one exit node
class SingleExitNodeRule extends ValidationRule {
  validate(graph, result) {
    const exitNodes = [];
    
    for (const node of graph.nodes.values()) {
      if (node.shape === 'Msquare' || node.id === 'exit' || node.id === 'Exit') {
        exitNodes.push(node);
      }
    }
    
    if (exitNodes.length === 0) {
      result.addError(
        'Graph must have exactly one exit node (shape=Msquare or id=exit)',
        null, null,
        'Add an exit node: exit [shape=Msquare]'
      );
    } else if (exitNodes.length > 1) {
      result.addError(
        `Graph has ${exitNodes.length} exit nodes, must have exactly one`,
        null, null,
        'Remove duplicate exit nodes or change their shape'
      );
      
      for (let i = 1; i < exitNodes.length; i++) {
        result.addError(`Duplicate exit node: ${exitNodes[i].id}`, exitNodes[i].id);
      }
    }
  }
}

// Check for orphaned nodes (no incoming or outgoing edges)
class NoOrphanNodesRule extends ValidationRule {
  validate(graph, result) {
    const startNode = graph.findStartNode();
    const exitNode = graph.findExitNode();
    
    for (const node of graph.nodes.values()) {
      // Skip start and exit nodes
      if (node === startNode || node === exitNode) continue;
      
      const incomingEdges = graph.getIncomingEdges(node.id);
      const outgoingEdges = graph.getOutgoingEdges(node.id);
      
      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        result.addError(
          `Orphaned node '${node.id}' has no incoming or outgoing edges`,
          node.id, null,
          'Connect the node to the workflow or remove it'
        );
      } else if (incomingEdges.length === 0) {
        result.addWarning(
          `Node '${node.id}' has no incoming edges and may be unreachable`,
          node.id, null,
          'Add an incoming edge from another node'
        );
      } else if (outgoingEdges.length === 0) {
        result.addWarning(
          `Node '${node.id}' has no outgoing edges and may be a dead end`,
          node.id, null,
          'Add an outgoing edge to continue the workflow'
        );
      }
    }
  }
}

// Validate node types against handler registry
class ValidNodeTypesRule extends ValidationRule {
  validate(graph, result, handlerRegistry) {
    if (!handlerRegistry) return;
    
    for (const node of graph.nodes.values()) {
      const handler = handlerRegistry.resolve(node);
      
      if (!handler) {
        result.addError(
          `No handler found for node '${node.id}' (type: '${node.type}', shape: '${node.shape}')`,
          node.id, null,
          'Check the node type/shape or register a custom handler'
        );
      }
    }
  }
}

// Validate edge conditions syntax
class ValidEdgeConditionsRule extends ValidationRule {
  validate(graph, result) {
    for (const edge of graph.edges) {
      if (edge.condition) {
        try {
          this._validateConditionSyntax(edge.condition);
        } catch (error) {
          result.addError(
            `Invalid condition syntax in edge ${edge.from} -> ${edge.to}: ${error.message}`,
            null, edge,
            'Check the condition expression syntax'
          );
        }
      }
    }
  }

  _validateConditionSyntax(condition) {
    // Basic syntax validation - in production would use proper parser
    const validOperators = ['=', '!=', '&&', '||', '(', ')'];
    const validVariables = ['outcome', 'context'];
    
    // Check for obviously invalid syntax
    if (condition.includes('===') || condition.includes('!==')) {
      throw new Error('Use = and != instead of === and !==');
    }
    
    // More validation could be added here
  }
}

// Validate goal gate configuration
class GoalGateValidationRule extends ValidationRule {
  validate(graph, result) {
    let hasGoalGates = false;
    
    for (const node of graph.nodes.values()) {
      if (node.goalGate) {
        hasGoalGates = true;
        
        // Goal gate nodes should have retry targets
        if (!node.retryTarget && !node.fallbackRetryTarget && !graph.retryTarget) {
          result.addWarning(
            `Goal gate '${node.id}' has no retry target configured`,
            node.id, null,
            'Add retry_target attribute or configure graph-level retry target'
          );
        }
      }
    }
    
    if (hasGoalGates && !graph.retryTarget && !graph.fallbackRetryTarget) {
      result.addInfo(
        'Graph has goal gates but no fallback retry targets configured',
        null, null,
        'Consider adding graph-level retry_target for failed goal gates'
      );
    }
  }
}

// Validate retry target references
class RetryTargetValidationRule extends ValidationRule {
  validate(graph, result) {
    for (const node of graph.nodes.values()) {
      if (node.retryTarget) {
        if (!graph.getNode(node.retryTarget)) {
          result.addError(
            `Node '${node.id}' references non-existent retry target '${node.retryTarget}'`,
            node.id, null,
            'Check the retry_target node ID or create the referenced node'
          );
        }
      }
      
      if (node.fallbackRetryTarget) {
        if (!graph.getNode(node.fallbackRetryTarget)) {
          result.addError(
            `Node '${node.id}' references non-existent fallback retry target '${node.fallbackRetryTarget}'`,
            node.id, null,
            'Check the fallback_retry_target node ID or create the referenced node'
          );
        }
      }
    }
    
    // Check graph-level retry targets
    if (graph.retryTarget && !graph.getNode(graph.retryTarget)) {
      result.addError(
        `Graph references non-existent retry target '${graph.retryTarget}'`,
        null, null,
        'Check the graph retry_target or create the referenced node'
      );
    }
    
    if (graph.fallbackRetryTarget && !graph.getNode(graph.fallbackRetryTarget)) {
      result.addError(
        `Graph references non-existent fallback retry target '${graph.fallbackRetryTarget}'`,
        null, null,
        'Check the graph fallback_retry_target or create the referenced node'
      );
    }
  }
}

// Validate timeout values
class TimeoutValidationRule extends ValidationRule {
  validate(graph, result) {
    for (const node of graph.nodes.values()) {
      if (node.timeout !== null) {
        if (node.timeout <= 0) {
          result.addError(
            `Node '${node.id}' has invalid timeout: ${node.timeout}ms`,
            node.id, null,
            'Timeout must be a positive number'
          );
        } else if (node.timeout > 3600000) { // 1 hour
          result.addWarning(
            `Node '${node.id}' has very long timeout: ${node.timeout}ms`,
            node.id, null,
            'Consider if such a long timeout is necessary'
          );
        }
      }
    }
  }
}

// Validate prompt configuration
class PromptValidationRule extends ValidationRule {
  validate(graph, result) {
    for (const node of graph.nodes.values()) {
      // LLM nodes should have prompts
      if (node.shape === 'box' && !node.prompt && !node.label) {
        result.addWarning(
          `LLM node '${node.id}' has no prompt or label`,
          node.id, null,
          'Add a prompt attribute with instructions for the LLM'
        );
      }
      
      // Check for empty prompts
      if (node.prompt && node.prompt.trim() === '') {
        result.addWarning(
          `Node '${node.id}' has empty prompt`,
          node.id, null,
          'Provide meaningful instructions in the prompt'
        );
      }
    }
  }
}

// Validate human gate configuration
class HumanGateValidationRule extends ValidationRule {
  validate(graph, result) {
    for (const node of graph.nodes.values()) {
      if (node.shape === 'hexagon') {
        const outgoingEdges = graph.getOutgoingEdges(node.id);
        
        if (outgoingEdges.length === 0) {
          result.addError(
            `Human gate '${node.id}' has no outgoing edges for user choices`,
            node.id, null,
            'Add outgoing edges with labels for user options'
          );
        }
        
        // Check that edges have labels for user choices
        for (const edge of outgoingEdges) {
          if (!edge.label) {
            result.addWarning(
              `Edge from human gate '${node.id}' to '${edge.to}' has no label`,
              node.id, edge,
              'Add a label to provide a clear choice for users'
            );
          }
        }
      }
    }
  }
}

// Detect potential deadlocks
class DeadlockDetectionRule extends ValidationRule {
  validate(graph, result) {
    // Simple cycle detection - in production would use more sophisticated algorithms
    const visited = new Set();
    const recursionStack = new Set();
    
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.id)) {
        if (this._hasCycle(graph, node.id, visited, recursionStack)) {
          result.addWarning(
            `Potential cycle detected involving node '${node.id}'`,
            node.id, null,
            'Ensure there are exit conditions to prevent infinite loops'
          );
        }
      }
    }
  }

  _hasCycle(graph, nodeId, visited, recursionStack) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const outgoingEdges = graph.getOutgoingEdges(nodeId);
    
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.to)) {
        if (this._hasCycle(graph, edge.to, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(edge.to)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
}

// Check reachability from start to exit
class ReachabilityRule extends ValidationRule {
  validate(graph, result) {
    const startNode = graph.findStartNode();
    const exitNode = graph.findExitNode();
    
    if (!startNode || !exitNode) return; // Other rules will catch this
    
    const reachable = this._getReachableNodes(graph, startNode.id);
    
    if (!reachable.has(exitNode.id)) {
      result.addError(
        'Exit node is not reachable from start node',
        exitNode.id, null,
        'Ensure there is a path from start to exit'
      );
    }
    
    // Check for unreachable nodes
    for (const node of graph.nodes.values()) {
      if (!reachable.has(node.id) && node !== startNode) {
        result.addWarning(
          `Node '${node.id}' is not reachable from start node`,
          node.id, null,
          'Connect the node to the main workflow path'
        );
      }
    }
  }

  _getReachableNodes(graph, startNodeId) {
    const reachable = new Set();
    const stack = [startNodeId];
    
    while (stack.length > 0) {
      const nodeId = stack.pop();
      
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        stack.push(edge.to);
      }
    }
    
    return reachable;
  }
}