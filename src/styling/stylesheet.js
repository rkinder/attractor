/**
 * Model Stylesheet - CSS-like rules for per-node LLM model/provider defaults
 */

export class ModelStylesheet {
  constructor(cssText = '') {
    this.rules = [];
    if (cssText) {
      this.parse(cssText);
    }
  }

  parse(cssText) {
    this.rules = [];
    
    // Remove comments and normalize whitespace
    const cleanCss = cssText
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\/\/.*$/gm, '') // Remove // comments
      .replace(/\s+/g, ' ')
      .trim();

    // Split into rules
    const ruleBlocks = cleanCss.split('}').filter(block => block.trim());
    
    for (const block of ruleBlocks) {
      const parts = block.split('{');
      if (parts.length !== 2) continue;
      
      const selector = parts[0].trim();
      const declarations = parts[1].trim();
      
      const rule = this._parseRule(selector, declarations);
      if (rule) {
        this.rules.push(rule);
      }
    }
  }

  _parseRule(selector, declarations) {
    const rule = new StyleRule(selector);
    
    // Parse declarations
    const decls = declarations.split(';').filter(d => d.trim());
    
    for (const decl of decls) {
      const colonIndex = decl.indexOf(':');
      if (colonIndex === -1) continue;
      
      const property = decl.substring(0, colonIndex).trim();
      const value = decl.substring(colonIndex + 1).trim();
      
      rule.addDeclaration(property, value);
    }
    
    return rule.declarations.size > 0 ? rule : null;
  }

  applyToNode(node, graph = null) {
    const result = {};
    
    // Apply rules in order (later rules override earlier ones)
    for (const rule of this.rules) {
      if (rule.matches(node, graph)) {
        for (const [property, value] of rule.declarations) {
          result[property] = value;
        }
      }
    }
    
    return result;
  }

  addRule(selector, declarations) {
    const rule = new StyleRule(selector);
    
    for (const [property, value] of Object.entries(declarations)) {
      rule.addDeclaration(property, value);
    }
    
    this.rules.push(rule);
  }

  toString() {
    return this.rules.map(rule => rule.toString()).join('\n\n');
  }
}

export class StyleRule {
  constructor(selector) {
    this.selector = selector;
    this.declarations = new Map();
    this._parseSelector(selector);
  }

  _parseSelector(selector) {
    // Parse CSS-like selectors
    // Supported: node, .class, #id, [attr], [attr="value"]
    this.nodeSelector = null;
    this.classSelectors = [];
    this.idSelector = null;
    this.attributeSelectors = [];
    
    // Split by whitespace and parse each part
    const parts = selector.split(/\s+/);
    
    for (const part of parts) {
      if (part.startsWith('.')) {
        // Class selector: .class-name
        this.classSelectors.push(part.substring(1));
      } else if (part.startsWith('#')) {
        // ID selector: #node-id
        this.idSelector = part.substring(1);
      } else if (part.startsWith('[') && part.endsWith(']')) {
        // Attribute selector: [attr] or [attr="value"]
        const attrMatch = part.match(/^\[([^=]+)(?:="([^"]*)")?\]$/);
        if (attrMatch) {
          this.attributeSelectors.push({
            name: attrMatch[1],
            value: attrMatch[2] || null
          });
        }
      } else if (part && !part.includes('[')) {
        // Node type selector
        this.nodeSelector = part;
      }
    }
  }

  matches(node, graph = null) {
    // Check node type selector
    if (this.nodeSelector && this.nodeSelector !== '*') {
      if (this.nodeSelector !== node.shape && this.nodeSelector !== node.type) {
        return false;
      }
    }
    
    // Check ID selector
    if (this.idSelector && this.idSelector !== node.id) {
      return false;
    }
    
    // Check class selectors
    if (this.classSelectors.length > 0) {
      const nodeClasses = this._getNodeClasses(node, graph);
      
      for (const requiredClass of this.classSelectors) {
        if (!nodeClasses.includes(requiredClass)) {
          return false;
        }
      }
    }
    
    // Check attribute selectors
    for (const attrSelector of this.attributeSelectors) {
      const nodeValue = node.get(attrSelector.name);
      
      if (nodeValue === null) {
        return false; // Attribute doesn't exist
      }
      
      if (attrSelector.value !== null && nodeValue !== attrSelector.value) {
        return false; // Attribute value doesn't match
      }
    }
    
    return true;
  }

  _getNodeClasses(node, graph) {
    const classes = [];
    
    // Classes from node's class attribute
    const nodeClass = node.get('class');
    if (nodeClass) {
      classes.push(...nodeClass.split(',').map(c => c.trim()));
    }
    
    // Classes derived from subgraph membership (if graph provided)
    if (graph && graph.subgraphs) {
      for (const subgraph of graph.subgraphs) {
        if (subgraph.nodes.has(node.id) && subgraph.label) {
          const derivedClass = this._deriveClassFromLabel(subgraph.label);
          if (derivedClass) {
            classes.push(derivedClass);
          }
        }
      }
    }
    
    return classes;
  }

  _deriveClassFromLabel(label) {
    // Convert "Loop A" -> "loop-a"
    return label
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  addDeclaration(property, value) {
    this.declarations.set(property, value);
  }

  toString() {
    const declarations = Array.from(this.declarations.entries())
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join('\n');
    
    return `${this.selector} {\n${declarations}\n}`;
  }
}

// Utility class for applying stylesheet to pipeline execution
export class StylesheetApplicator {
  constructor(stylesheet) {
    this.stylesheet = stylesheet;
  }

  applyToRequest(request, node, graph) {
    if (!this.stylesheet) return request;
    
    const styles = this.stylesheet.applyToNode(node, graph);
    
    // Apply model and provider overrides
    if (styles.model && !request.model) {
      request.model = styles.model;
    }
    
    if (styles.provider && !request.provider) {
      request.provider = styles.provider;
    }
    
    // Apply reasoning effort
    if (styles.reasoning_effort && !request.reasoning_effort) {
      request.reasoning_effort = styles.reasoning_effort;
    }
    
    // Apply temperature
    if (styles.temperature !== undefined && request.temperature === undefined) {
      request.temperature = parseFloat(styles.temperature);
    }
    
    // Apply max_tokens
    if (styles.max_tokens !== undefined && request.max_tokens === undefined) {
      request.max_tokens = parseInt(styles.max_tokens);
    }
    
    // Apply provider-specific options
    if (styles.provider_options) {
      try {
        const providerOptions = JSON.parse(styles.provider_options);
        request.provider_options = {
          ...request.provider_options,
          ...providerOptions
        };
      } catch (error) {
        console.warn('Invalid provider_options in stylesheet:', error.message);
      }
    }
    
    return request;
  }
}

// Predefined stylesheets for common patterns
export class PredefinedStylesheets {
  static balanced() {
    return new ModelStylesheet(`
      /* Default balanced configuration */
      * {
        model: claude-opus-4-6;
        provider: anthropic;
        reasoning_effort: medium;
        temperature: 0.7;
      }
      
      /* Higher precision for critical tasks */
      .critical {
        reasoning_effort: high;
        temperature: 0.3;
      }
      
      /* Faster execution for simple tasks */
      .simple {
        model: claude-sonnet-4-5;
        reasoning_effort: low;
        temperature: 0.5;
      }
    `);
  }

  static performance() {
    return new ModelStylesheet(`
      /* Performance-optimized configuration */
      * {
        model: claude-sonnet-4-5;
        provider: anthropic;
        reasoning_effort: low;
        temperature: 0.5;
        max_tokens: 2000;
      }
      
      /* Use faster models for simple operations */
      .fast {
        model: claude-haiku-4-5;
        reasoning_effort: none;
      }
    `);
  }

  static quality() {
    return new ModelStylesheet(`
      /* Quality-focused configuration */
      * {
        model: claude-opus-4-6;
        provider: anthropic;
        reasoning_effort: high;
        temperature: 0.3;
      }
      
      /* Maximum quality for code generation */
      .code {
        model: gpt-5-2-codex;
        provider: openai;
        reasoning_effort: high;
        temperature: 0.1;
      }
      
      /* Detailed analysis */
      .analysis {
        reasoning_effort: high;
        max_tokens: 8000;
        temperature: 0.2;
      }
    `);
  }

  static multiProvider() {
    return new ModelStylesheet(`
      /* Multi-provider configuration */
      .openai {
        provider: openai;
        model: gpt-5-2;
      }
      
      .anthropic {
        provider: anthropic;
        model: claude-opus-4-6;
      }
      
      .gemini {
        provider: gemini;
        model: gemini-3-flash-preview;
      }
      
      /* Code tasks prefer OpenAI */
      .code {
        provider: openai;
        model: gpt-5-2-codex;
        reasoning_effort: high;
      }
      
      /* Analysis tasks prefer Anthropic */
      .analysis {
        provider: anthropic;
        model: claude-opus-4-6;
        reasoning_effort: high;
      }
    `);
  }
}