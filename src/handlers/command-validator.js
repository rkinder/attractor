/**
 * Command Validator - Security validation for tool commands
 * 
 * Supports:
 * - Whitelist mode: Only allow specified commands
 * - Blacklist mode: Block dangerous commands
 * - Configuration via environment variables
 */

export class CommandValidator {
  constructor(config = {}) {
    this.mode = config.mode || 'none'; // 'none', 'whitelist', 'blacklist'
    this.whitelist = new Set(config.whitelist || []);
    this.blacklist = config.blacklist || [];
    this.logBlocked = config.logBlocked !== false;
    this.logger = config.logger || console;
  }

  static fromEnv() {
    const mode = process.env.TOOL_HANDLER_SECURITY_MODE || 'none';
    
    let whitelist = [];
    if (process.env.TOOL_HANDLER_ALLOWED_COMMANDS) {
      whitelist = process.env.TOOL_HANDLER_ALLOWED_COMMANDS.split(',').map(c => c.trim());
    }
    
    let blacklist = [];
    if (process.env.TOOL_HANDLER_BLOCKED_COMMANDS) {
      blacklist = process.env.TOOL_HANDLER_BLOCKED_COMMANDS.split(',').map(c => c.trim());
    }
    
    return new CommandValidator({ mode, whitelist, blacklist });
  }

  validate(command) {
    if (this.mode === 'none') {
      return { valid: true };
    }

    const baseCommand = this._extractBaseCommand(command);

    if (this.mode === 'whitelist') {
      return this._validateWhitelist(command, baseCommand);
    }

    if (this.mode === 'blacklist') {
      return this._validateBlacklist(command, baseCommand);
    }

    return { valid: true };
  }

  _extractBaseCommand(command) {
    const trimmed = command.trim();
    
    // Handle quoted commands
    if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
      const match = trimmed.match(/^["']([^"']+)/);
      if (match) {
        return match[1].split(' ')[0];
      }
    }
    
    // Handle compound commands (take first command)
    const parts = trimmed.split(/[|;&]/);
    const firstPart = parts[0].trim();
    
    return firstPart.split(/\s+/)[0];
  }

  _validateWhitelist(command, baseCommand) {
    if (this.whitelist.has(baseCommand)) {
      return { valid: true };
    }

    if (this.logBlocked) {
      this.logger.warn(`Command blocked by whitelist: ${baseCommand} not in allowed list`);
    }

    return {
      valid: false,
      reason: `Command '${baseCommand}' not in whitelist`,
      code: 'WHITELIST_VIOLATION'
    };
  }

  _validateBlacklist(command, baseCommand) {
    for (const pattern of this.blacklist) {
      if (this._matchesPattern(command, pattern)) {
        if (this.logBlocked) {
          this.logger.warn(`Command blocked by blacklist: matched pattern '${pattern}'`);
        }

        return {
          valid: false,
          reason: `Command matches blocked pattern: ${pattern}`,
          code: 'BLACKLIST_VIOLATION',
          pattern
        };
      }
    }

    return { valid: true };
  }

  _matchesPattern(command, pattern) {
    try {
      // Check for exact match
      if (command.includes(pattern)) {
        return true;
      }

      // Check for regex pattern
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1), 'i');
        return regex.test(command);
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  isEnabled() {
    return this.mode !== 'none';
  }
}

// Default blocked patterns for blacklist mode
export const DEFAULT_BLOCKED_PATTERNS = [
  'rm -rf',
  'rm -r /',
  'dd if=',
  'mkfs',
  'curl | sh',
  'wget | sh',
  'bash -c',
  'nc -e',
  '/etc/passwd',
  ':(){:|:&};:'
];

// Default allowed commands for whitelist mode
export const DEFAULT_ALLOWED_COMMANDS = [
  'npm', 'npx', 'node', 'python3', 'python', 'pip', 'pip3',
  'git', 'ls', 'cat', 'echo', 'printf', 'head', 'tail',
  'grep', 'awk', 'sed', 'find', 'make', 'docker', 'docker-compose',
  'curl', 'wget', 'rsync', 'ssh', 'scp'
];
