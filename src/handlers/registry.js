/**
 * Handler Registry - Maps node types to handler implementations
 */

export const SHAPE_TO_TYPE = {
  'Mdiamond': 'start',
  'Msquare': 'exit',
  'box': 'codergen',
  'hexagon': 'wait.human',
  'diamond': 'conditional',
  'component': 'parallel',
  'tripleoctagon': 'parallel.fan_in',
  'parallelogram': 'tool',
  'house': 'stack.manager_loop'
};

export class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.defaultHandler = null;
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  setDefault(handler) {
    this.defaultHandler = handler;
  }

  resolve(node) {
    // 1. Explicit type attribute
    if (node.type && this.handlers.has(node.type)) {
      return this.handlers.get(node.type);
    }

    // 2. Shape-based resolution
    const handlerType = SHAPE_TO_TYPE[node.shape];
    if (handlerType && this.handlers.has(handlerType)) {
      return this.handlers.get(handlerType);
    }

    // 3. Default handler
    return this.defaultHandler;
  }

  get(type) {
    return this.handlers.get(type);
  }

  has(type) {
    return this.handlers.has(type);
  }

  types() {
    return Array.from(this.handlers.keys());
  }
}

// Base Handler interface
export class Handler {
  async execute(node, context, graph, logsRoot) {
    throw new Error('Handler.execute() must be implemented by subclasses');
  }
}