/**
 * Tool Handler - Execute external shell commands
 * 
 * EARS Format Requirements:
 * - Execute external shell commands with timeout handling
 * - Proper logging of command execution, stdout, stderr, exit codes
 * - Error handling for timeouts and execution failures
 * - Context updates with tool output
 * - Required log files: command.txt, stdout.txt, stderr.txt, exit-code.txt, error.txt, outcome.json
 * - Security: Optional whitelist/blacklist validation via CommandValidator
 */

import fs from 'fs/promises';
import path from 'path';
import { Handler } from './registry.js';
import { Outcome } from '../pipeline/outcome.js';
import { promisify } from 'util';
import { exec as childExec } from 'child_process';
import { CommandValidator, DEFAULT_ALLOWED_COMMANDS, DEFAULT_BLOCKED_PATTERNS } from './command-validator.js';

const exec = promisify(childExec);

export class ToolHandler extends Handler {
  constructor(config = {}) {
    super();
    this.validator = config.validator || null;
    
    // Auto-create validator if security mode is configured
    if (!this.validator && process.env.TOOL_HANDLER_SECURITY_MODE) {
      const whitelist = process.env.TOOL_HANDLER_ALLOWED_COMMANDS 
        ? process.env.TOOL_HANDLER_ALLOWED_COMMANDS.split(',').map(c => c.trim())
        : DEFAULT_ALLOWED_COMMANDS;
        
      const blacklist = process.env.TOOL_HANDLER_BLOCKED_COMMANDS
        ? process.env.TOOL_HANDLER_BLOCKED_COMMANDS.split(',').map(c => c.trim())
        : DEFAULT_BLOCKED_PATTERNS;
        
      this.validator = new CommandValidator({
        mode: process.env.TOOL_HANDLER_SECURITY_MODE,
        whitelist,
        blacklist
      });
    }
  }
  /**
   * Execute external shell command
   * @param {Object} node - Pipeline node with tool_command attribute
   * @param {Context} context - Execution context
   * @param {Graph} graph - Pipeline graph
   * @param {string} logsRoot - Root directory for logs
   * @returns {Promise<Outcome>} Execution outcome
   */
  async execute(node, context, graph, logsRoot) {
    // 1. Extract and validate tool_command
    const toolCommand = node.attributes?.tool_command || node.attrs?.tool_command;
    if (!toolCommand) {
      const outcome = Outcome.fail('No tool_command specified');
      const stageDir = path.join(logsRoot, node.id);
      await fs.mkdir(stageDir, { recursive: true });
      await this._writeLogFiles(stageDir, {
        command: '',
        stdout: '',
        stderr: '',
        exitCode: -1,
        error: 'No tool_command specified',
        outcome: outcome
      });
      return outcome;
    }

    // 1.5 Security validation
    if (this.validator && this.validator.isEnabled()) {
      const validation = this.validator.validate(toolCommand);
      if (!validation.valid) {
        const outcome = Outcome.fail(`Security validation failed: ${validation.reason}`);
        const stageDir = path.join(logsRoot, node.id);
        await fs.mkdir(stageDir, { recursive: true });
        await this._writeLogFiles(stageDir, {
          command: toolCommand,
          stdout: '',
          stderr: '',
          exitCode: -1,
          error: validation.reason,
          outcome: outcome
        });
        return outcome;
      }
    }

    // 2. Extract timeout with default of 30000ms
    const timeoutAttr = node.attributes?.timeout || node.attrs?.timeout;
    const timeout = timeoutAttr ? parseInt(timeoutAttr) : 30000;
    
    // 3. Create stage directory
    const stageDir = path.join(logsRoot, node.id);
    await fs.mkdir(stageDir, { recursive: true });
    
    // 4. Write command to log file
    await fs.writeFile(path.join(stageDir, 'command.txt'), toolCommand);
    
    try {
      // 5. Execute command with timeout
      const result = await exec(toolCommand, {
        timeout: timeout,
        maxBuffer: 1024 * 1024 // 1MB limit
      });
      
      // 6. Handle successful execution
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const exitCode = 0;
      
      // Write logs
      await this._writeLogFiles(stageDir, {
        command: toolCommand,
        stdout: stdout,
        stderr: stderr,
        exitCode: exitCode,
        error: null,
        outcome: null
      });
      
      // Return success outcome
      return Outcome.success(`Tool completed: ${toolCommand}`, {
        'tool.output': stdout.trim()
      });
      
    } catch (error) {
      // 7. Handle execution errors
      let exitCode = -1;
      let stderr = '';
      let errorMessage = '';
      
      if (error.killed === true) {
        // Timeout error
        errorMessage = `Command timed out after ${timeout}ms`;
      } else if (error.code === 'ETIMEDOUT') {
        // Timeout error from child_process
        errorMessage = `Command timed out after ${timeout}ms`;
      } else {
        // Other execution error
        errorMessage = `Execution error: ${error.message}`;
        if (error.stderr) {
          stderr = error.stderr;
        }
        if (error.code !== undefined) {
          exitCode = error.code;
        }
      }
      
      // Try to extract exit code from error message if not already set
      if (exitCode === -1 && error.message) {
        const exitCodeMatch = error.message.match(/exit code (\d+)/);
        if (exitCodeMatch) {
          exitCode = parseInt(exitCodeMatch[1]);
        }
      }
      
      // Write logs
      await this._writeLogFiles(stageDir, {
        command: toolCommand,
        stdout: '',
        stderr: stderr,
        exitCode: exitCode,
        error: errorMessage,
        outcome: null
      });
      
      // Return failure outcome
      return Outcome.fail(errorMessage);
    }
  }
  
  /**
   * Write all required log files to stage directory
   * @private
   */
  async _writeLogFiles(stageDir, { command, stdout, stderr, exitCode, error, outcome }) {
    // Write command.txt
    await fs.writeFile(path.join(stageDir, 'command.txt'), command);
    
    // Write stdout.txt if exists
    if (stdout) {
      await fs.writeFile(path.join(stageDir, 'stdout.txt'), stdout);
    }
    
    // Write stderr.txt if exists
    if (stderr) {
      await fs.writeFile(path.join(stageDir, 'stderr.txt'), stderr);
    }
    
    // Write exit-code.txt
    await fs.writeFile(path.join(stageDir, 'exit-code.txt'), exitCode.toString());
    
    // Write error.txt if exists
    if (error) {
      await fs.writeFile(path.join(stageDir, 'error.txt'), error);
    }
    
    // Write outcome.json
    const outcomeData = {
      status: outcome ? outcome.status : (error ? 'FAIL' : 'SUCCESS'),
      notes: outcome ? outcome.notes : (error ? null : `Tool completed: ${command}`),
      failure_reason: outcome ? outcome.failure_reason : error,
      preferred_label: outcome ? outcome.preferred_label : '',
      suggested_next_ids: outcome ? outcome.suggested_next_ids : [],
      context_updates: outcome ? outcome.context_updates : (error ? {} : { 'tool.output': stdout?.trim() || '' }),
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(path.join(stageDir, 'outcome.json'), JSON.stringify(outcomeData, null, 2));
  }
}