/**
 * Output Extractor - Extract and transform data from LLM responses
 * 
 * Supports:
 * - Regex pattern matching
 * - JSON extraction
 * - Type coercion
 */

export class OutputExtractor {
  constructor(config = {}) {
    this.config = config;
  }

  extract(output, options = {}) {
    if (!output) {
      return this._defaultOutput(options);
    }

    const outputStr = String(output);

    if (options.json) {
      return this._extractJSON(outputStr, options);
    }

    if (options.pattern) {
      return this._extractByPattern(outputStr, options.pattern, options);
    }

    if (options.key) {
      return this._extractByKey(outputStr, options.key);
    }

    return outputStr;
  }

  _extractJSON(outputStr, options) {
    const jsonMatch = outputStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        return this._defaultOutput(options);
      }
    }

    const codeBlockMatch = outputStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e) {
        return this._defaultOutput(options);
      }
    }

    return this._defaultOutput(options);
  }

  _extractByPattern(outputStr, pattern, options) {
    try {
      const regex = new RegExp(pattern, options.flags || 'i');
      const match = outputStr.match(regex);
      
      if (match) {
        if (options.group !== undefined) {
          return match[options.group] || this._defaultOutput(options);
        }
        return match[1] || match[0];
      }
    } catch (e) {
      // Invalid regex
    }
    
    return this._defaultOutput(options);
  }

  _extractByKey(outputStr, key) {
    const lines = outputStr.split('\n');
    for (const line of lines) {
      const match = line.match(new RegExp(`^${key}\\s*:\\s*(.+)$`, 'i'));
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  _defaultOutput(options) {
    if (options.default !== undefined) {
      return options.default;
    }
    return null;
  }

  coerce(value, type) {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1' || value === 'yes';
      case 'string':
        return String(value);
      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          return value.split(',').map(s => s.trim());
        }
        return [value];
      case 'object':
        if (typeof value === 'object') return value;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      default:
        return value;
    }
  }
}
