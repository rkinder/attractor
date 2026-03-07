/**
 * Condition Evaluator - Safe expression parser for workflow conditions
 * 
 * Replaces unsafe eval() with a recursive descent parser
 * Supports: comparison operators, logical operators, context variables
 */

export class ConditionEvaluator {
  constructor(options = {}) {
    this.options = options;
    this.contextValues = {};
  }

  evaluate(condition, contextValues = {}) {
    try {
      this.contextValues = contextValues;
      const expr = this._preprocess(condition, contextValues);
      return this._parseExpression(expr);
    } catch (error) {
      return false;
    }
  }

  _preprocess(condition, contextValues) {
    let expr = condition;

    expr = expr.replace(/\benv\.([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => {
      const value = process.env[key];
      if (value === undefined || value === null) {
        return 'null';
      }
      return typeof value === 'string' ? `"${value}"` : String(value);
    });

    expr = expr.replace(/\bcontext\.([a-zA-Z_][a-zA-Z0-9_.]*)/g, (match, key) => {
      const value = contextValues[key];
      if (value === undefined || value === null) {
        return 'null';
      }
      return typeof value === 'string' ? `"${value}"` : String(value);
    });

    const chars = expr.split('');
    const result = [];
    let i = 0;
    
    const isAlphaNumeric = (c) => /[a-zA-Z0-9_]/.test(c);
    
    while (i < chars.length) {
      const remaining = expr.slice(i);
      const nextChar = chars[i + 1];
      const prevChar = chars[result.length - 1];
      
      if (remaining.startsWith('>=')) {
        result.push('>=', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 2;
      } else if (remaining.startsWith('<=')) {
        result.push('<=', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 2;
      } else if (remaining.startsWith('!==')) {
        result.push('!==', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 3;
      } else if (remaining.startsWith('===')) {
        result.push('===', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 3;
      } else if (remaining.startsWith('!=')) {
        result.push('!=', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 2;
      } else if (remaining.startsWith('==')) {
        result.push('===', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 2;
      } else if (remaining.startsWith('>')) {
        result.push('>', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 1;
      } else if (remaining.startsWith('<')) {
        result.push('<', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 1;
      } else if (chars[i] === '=') {
        result.push('===', isAlphaNumeric(nextChar) ? ' ' : '');
        i += 1;
      } else {
        result.push(chars[i]);
        i += 1;
      }
    }
    
    expr = result.join('').replace(/\s+/g, ' ').trim();
    
    expr = expr.replace(/\s+AND\s+/gi, ' && ');
    expr = expr.replace(/\s+OR\s+/gi, ' || ');

    return expr;
  }

  _parseExpression(expr) {
    expr = expr.trim();
    return this._parseOr(expr);
  }

  _parseOr(expr) {
    const orIndex = this._findOperator(expr, '||');
    if (orIndex !== -1) {
      const left = expr.slice(0, orIndex).trim();
      const right = expr.slice(orIndex + 2).trim();
      return this._parseOr(left) || this._parseOr(right);
    }
    return this._parseAnd(expr);
  }

  _parseAnd(expr) {
    const andIndex = this._findOperator(expr, '&&');
    if (andIndex !== -1) {
      const left = expr.slice(0, andIndex).trim();
      const right = expr.slice(andIndex + 2).trim();
      return this._parseAnd(left) && this._parseAnd(right);
    }
    return this._parseComparison(expr);
  }

  _findOperator(expr, operator) {
    let depth = 0;
    for (let i = expr.length - 1; i >= 0; i--) {
      const char = expr[i];
      if (char === ')') depth++;
      if (char === '(') depth--;
      if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
        return i;
      }
    }
    return -1;
  }

  _parseComparison(expr) {
    expr = expr.trim();

    if (expr.startsWith('(') && expr.endsWith(')')) {
      return this._parseExpression(expr.slice(1, -1));
    }

    const operators = ['===', '!==', '!=', '>=', '<=', '>', '<'];
    for (const op of operators) {
      const index = this._findComparisonOperator(expr, op);
      if (index !== -1) {
        const left = expr.slice(0, index).trim();
        const right = expr.slice(index + op.length).trim();
        return this._compare(left, right, op, this.contextValues);
      }
    }

    return this._parseValue(expr, this.contextValues);
  }

  _findComparisonOperator(expr, operator) {
    let depth = 0;
    for (let i = expr.length - 1; i >= 0; i--) {
      const char = expr[i];
      if (char === ')') depth++;
      if (char === '(') depth--;
      if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
        return i;
      }
    }
    return -1;
  }

  _compare(leftStr, rightStr, operator, contextValues = {}) {
    let left = this._parseValue(leftStr, contextValues);
    let right = this._parseValue(rightStr, contextValues);

    switch (operator) {
      case '===':
        return left === right;
      case '!==':
      case '!=':
        return left !== right;
      case '>':
        return Number(left) > Number(right);
      case '<':
        return Number(left) < Number(right);
      case '>=':
        return Number(left) >= Number(right);
      case '<=':
        return Number(left) <= Number(right);
      default:
        return false;
    }
  }

  _parseValue(str, contextValues = {}) {
    str = str.trim();

    if (str === 'true') return true;
    if (str === 'false') return false;
    if (str === 'null') return null;
    if (str === 'undefined') return undefined;

    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }

    if (str.startsWith("'") && str.endsWith("'")) {
      return str.slice(1, -1);
    }

    const num = Number(str);
    if (!isNaN(num)) {
      return num;
    }

    if (contextValues.hasOwnProperty(str)) {
      return contextValues[str];
    }

    return str;
  }
}
