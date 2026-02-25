/**
 * DOT Pipeline Parser - Parses Graphviz DOT files into pipeline definitions
 */

export class ParseError extends Error {
  constructor(message, line = null, column = null) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
  }
}

export class Node {
  constructor(id, attributes = {}) {
    this.id = id;
    this.attributes = attributes;
  }

  get(key, defaultValue = null) {
    return this.attributes[key] !== undefined ? this.attributes[key] : defaultValue;
  }

  // Convenience accessors for common attributes
  get label() { return this.get('label', this.id); }
  get shape() { return this.get('shape', 'box'); }
  get type() { return this.get('type', ''); }
  get prompt() { return this.get('prompt', ''); }
  get maxRetries() { return parseInt(this.get('max_retries', '0')); }
  get goalGate() { return this.get('goal_gate', 'false') === 'true'; }
  get retryTarget() { return this.get('retry_target', ''); }
  get fallbackRetryTarget() { return this.get('fallback_retry_target', ''); }
  get fidelity() { return this.get('fidelity', ''); }
  get threadId() { return this.get('thread_id', ''); }
  get timeout() { return this._parseDuration(this.get('timeout', '')); }
  get llmModel() { return this.get('llm_model', ''); }
  get llmProvider() { return this.get('llm_provider', ''); }
  get reasoningEffort() { return this.get('reasoning_effort', 'high'); }
  get autoStatus() { return this.get('auto_status', 'false') === 'true'; }
  get allowPartial() { return this.get('allow_partial', 'false') === 'true'; }

  _parseDuration(value) {
    if (!value) return null;
    const match = value.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) return null;
    
    const [, amount, unit] = match;
    const multipliers = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return parseInt(amount) * multipliers[unit];
  }
}

export class Edge {
  constructor(from, to, attributes = {}) {
    this.from = from;
    this.to = to;
    this.attributes = attributes;
  }

  get(key, defaultValue = null) {
    return this.attributes[key] !== undefined ? this.attributes[key] : defaultValue;
  }

  // Convenience accessors
  get label() { return this.get('label', ''); }
  get condition() { return this.get('condition', ''); }
  get weight() { return parseInt(this.get('weight', '0')); }
  get fidelity() { return this.get('fidelity', ''); }
  get threadId() { return this.get('thread_id', ''); }
  get loopRestart() { return this.get('loop_restart', 'false') === 'true'; }
}

export class Graph {
  constructor(id = '', attributes = {}) {
    this.id = id;
    this.attributes = attributes;
    this.nodes = new Map();
    this.edges = [];
    this.subgraphs = [];
  }

  get(key, defaultValue = null) {
    return this.attributes[key] !== undefined ? this.attributes[key] : defaultValue;
  }

  // Graph-level convenience accessors
  get goal() { return this.get('goal', ''); }
  get label() { return this.get('label', ''); }
  get modelStylesheet() { return this.get('model_stylesheet', ''); }
  get defaultMaxRetry() { return parseInt(this.get('default_max_retry', '50')); }
  get retryTarget() { return this.get('retry_target', ''); }
  get fallbackRetryTarget() { return this.get('fallback_retry_target', ''); }
  get defaultFidelity() { return this.get('default_fidelity', ''); }

  addNode(node) {
    this.nodes.set(node.id, node);
  }

  addEdge(edge) {
    this.edges.push(edge);
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getOutgoingEdges(nodeId) {
    return this.edges.filter(edge => edge.from === nodeId);
  }

  getIncomingEdges(nodeId) {
    return this.edges.filter(edge => edge.to === nodeId);
  }

  findStartNode() {
    // Look for shape=Mdiamond first
    for (const node of this.nodes.values()) {
      if (node.shape === 'Mdiamond') return node;
    }
    
    // Fall back to id="start" or "Start"
    return this.getNode('start') || this.getNode('Start');
  }

  findExitNode() {
    // Look for shape=Msquare first
    for (const node of this.nodes.values()) {
      if (node.shape === 'Msquare') return node;
    }
    
    // Fall back to id="exit" or "Exit"
    return this.getNode('exit') || this.getNode('Exit');
  }
}

export class DOTParser {
  constructor() {
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.text = '';
    this.tokens = [];
  }

  parse(dotText) {
    this.text = dotText;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = this._tokenize(dotText);
    
    return this._parseGraph();
  }

  _tokenize(text) {
    const tokens = [];
    let pos = 0;
    
    // Remove comments first
    text = this._removeComments(text);
    
    const patterns = [
      { type: 'DIGRAPH', regex: /^digraph\b/i },
      { type: 'GRAPH', regex: /^graph\b/i },
      { type: 'NODE', regex: /^node\b/i },
      { type: 'EDGE', regex: /^edge\b/i },
      { type: 'SUBGRAPH', regex: /^subgraph\b/i },
      { type: 'ARROW', regex: /^->/ },
      { type: 'LBRACE', regex: /^{/ },
      { type: 'RBRACE', regex: /^}/ },
      { type: 'LBRACKET', regex: /^\[/ },
      { type: 'RBRACKET', regex: /^\]/ },
      { type: 'SEMICOLON', regex: /^;/ },
      { type: 'COMMA', regex: /^,/ },
      { type: 'EQUALS', regex: /^=/ },
      { type: 'STRING', regex: /^"([^"\\]|\\.)*"/ },
      { type: 'DURATION', regex: /^\d+(ms|s|m|h|d)\b/ },
      { type: 'FLOAT', regex: /^-?\d*\.\d+/ },
      { type: 'INTEGER', regex: /^-?\d+/ },
      { type: 'BOOLEAN', regex: /^(true|false)\b/ },
      { type: 'IDENTIFIER', regex: /^[A-Za-z_][A-Za-z0-9_]*/ },
      { type: 'WHITESPACE', regex: /^\s+/ }
    ];

    while (pos < text.length) {
      let matched = false;
      
      for (const pattern of patterns) {
        const match = text.slice(pos).match(pattern.regex);
        if (match) {
          if (pattern.type !== 'WHITESPACE') {
            tokens.push({
              type: pattern.type,
              value: match[0],
              pos
            });
          }
          pos += match[0].length;
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        throw new ParseError(`Unexpected character: ${text[pos]}`, this.line, this.column);
      }
    }
    
    return tokens;
  }

  _removeComments(text) {
    // Remove // line comments and /* block comments */
    return text
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  }

  _parseGraph() {
    this._expectToken('DIGRAPH');
    
    const id = this._parseIdentifier();
    
    this._expectToken('LBRACE');
    
    const graph = new Graph(id);
    
    while (!this._isNextToken('RBRACE')) {
      this._parseStatement(graph);
    }
    
    this._expectToken('RBRACE');
    
    return graph;
  }

  _parseStatement(graph) {
    const token = this._peekToken();
    
    if (!token) {
      throw new ParseError('Unexpected end of input');
    }
    
    if (token.type === 'GRAPH') {
      this._parseGraphAttributes(graph);
    } else if (token.type === 'NODE') {
      this._parseNodeDefaults(graph);
    } else if (token.type === 'EDGE') {
      this._parseEdgeDefaults(graph);
    } else if (token.type === 'SUBGRAPH') {
      this._parseSubgraph(graph);
    } else if (token.type === 'IDENTIFIER') {
      // Could be node definition or edge or graph attribute
      this._parseNodeOrEdgeOrGraphAttr(graph);
    } else {
      throw new ParseError(`Unexpected token: ${token.value}`, this.line, this.column);
    }
    
    // Optional semicolon
    if (this._isNextToken('SEMICOLON')) {
      this._expectToken('SEMICOLON');
    }
  }

  _parseNodeOrEdgeOrGraphAttr(graph) {
    const firstId = this._parseIdentifier();
    
    if (this._isNextToken('EQUALS')) {
      // Graph attribute: key = value
      this._expectToken('EQUALS');
      const value = this._parseValue();
      graph.attributes[firstId] = value;
    } else if (this._isNextToken('ARROW')) {
      // Edge: id -> id [attrs]
      this._parseEdgeFromFirst(graph, firstId);
    } else {
      // Node: id [attrs]
      const attributes = this._isNextToken('LBRACKET') ? this._parseAttributes() : {};
      graph.addNode(new Node(firstId, attributes));
    }
  }

  _parseEdgeFromFirst(graph, firstId) {
    const targets = [firstId];
    
    // Parse chain: A -> B -> C
    while (this._isNextToken('ARROW')) {
      this._expectToken('ARROW');
      targets.push(this._parseIdentifier());
    }
    
    const attributes = this._isNextToken('LBRACKET') ? this._parseAttributes() : {};
    
    // Create edges for the chain
    for (let i = 0; i < targets.length - 1; i++) {
      graph.addEdge(new Edge(targets[i], targets[i + 1], attributes));
    }
  }

  _parseGraphAttributes(graph) {
    this._expectToken('GRAPH');
    const attributes = this._parseAttributes();
    Object.assign(graph.attributes, attributes);
  }

  _parseNodeDefaults(graph) {
    this._expectToken('NODE');
    // For now, we ignore node defaults - would need to track them for inheritance
    this._parseAttributes();
  }

  _parseEdgeDefaults(graph) {
    this._expectToken('EDGE');
    // For now, we ignore edge defaults - would need to track them for inheritance
    this._parseAttributes();
  }

  _parseSubgraph(graph) {
    this._expectToken('SUBGRAPH');
    
    let id = '';
    if (this._isNextToken('IDENTIFIER')) {
      id = this._parseIdentifier();
    }
    
    this._expectToken('LBRACE');
    
    const subgraph = new Graph(id);
    
    while (!this._isNextToken('RBRACE')) {
      this._parseStatement(subgraph);
    }
    
    this._expectToken('RBRACE');
    
    graph.subgraphs.push(subgraph);
    
    // Merge subgraph nodes and edges into parent
    for (const node of subgraph.nodes.values()) {
      graph.addNode(node);
    }
    
    for (const edge of subgraph.edges) {
      graph.addEdge(edge);
    }
  }

  _parseAttributes() {
    this._expectToken('LBRACKET');
    
    const attributes = {};
    
    while (!this._isNextToken('RBRACKET')) {
      const key = this._parseIdentifier();
      this._expectToken('EQUALS');
      const value = this._parseValue();
      attributes[key] = value;
      
      if (this._isNextToken('COMMA')) {
        this._expectToken('COMMA');
      } else if (!this._isNextToken('RBRACKET')) {
        throw new ParseError('Expected comma or closing bracket');
      }
    }
    
    this._expectToken('RBRACKET');
    
    return attributes;
  }

  _parseValue() {
    const token = this._peekToken();
    
    if (!token) {
      throw new ParseError('Expected value');
    }
    
    this._consumeToken();
    
    switch (token.type) {
      case 'STRING':
        // Remove quotes and process escape sequences
        return token.value.slice(1, -1)
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      
      case 'INTEGER':
        return token.value;
      
      case 'FLOAT':
        return token.value;
      
      case 'BOOLEAN':
        return token.value;
      
      case 'DURATION':
        return token.value;
      
      case 'IDENTIFIER':
        return token.value;
      
      default:
        throw new ParseError(`Unexpected value token: ${token.value}`);
    }
  }

  _parseIdentifier() {
    const token = this._expectToken('IDENTIFIER');
    return token.value;
  }

  _peekToken() {
    return this.tokens[this.pos] || null;
  }

  _consumeToken() {
    return this.tokens[this.pos++] || null;
  }

  _expectToken(expectedType) {
    const token = this._consumeToken();
    
    if (!token) {
      throw new ParseError(`Expected ${expectedType} but reached end of input`);
    }
    
    if (token.type !== expectedType) {
      throw new ParseError(`Expected ${expectedType} but got ${token.type}: ${token.value}`);
    }
    
    return token;
  }

  _isNextToken(expectedType) {
    const token = this._peekToken();
    return token && token.type === expectedType;
  }
}