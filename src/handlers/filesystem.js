/**
 * Filesystem Handler
 * Enables reading/writing files and executing shell commands
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ROOT = process.cwd();

const DEFAULT_TIMEOUT = 30000;
const MAX_TIMEOUT = 300000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_COMMANDS = new Set([
  'npm', 'node', 'git', 'docker', 'npx', 'pnpm', 'yarn',
  'python', 'python3', 'pip', 'pip3',
  'go', 'cargo', 'rustc',
  'make', 'cmake', 'gcc', 'g++'
]);

class FilesystemHandler {
  constructor() {
    this.name = 'filesystem';
  }

  async execute(node, context, graph, logsDir) {
    const { operation, path: filePath, ...options } = node;

    if (!operation) {
      return { success: false, error: 'operation is required' };
    }

    try {
      switch (operation) {
        case 'read':
          return await this._read(filePath);
        case 'write':
          return await this._write(filePath, options.content, options);
        case 'mkdir':
          return await this._mkdir(filePath, options.recursive);
        case 'delete':
          return await this._delete(filePath, options.recursive);
        case 'shell':
          return await this._shell(options.command, options.cwd, options.timeout);
        case 'exists':
          return await this._exists(filePath);
        case 'copy':
          return await this._copy(options.source, options.dest);
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  _validatePath(filePath) {
    if (!filePath) {
      throw new Error('path is required');
    }

    // Handle absolute paths
    let resolvedPath;
    if (path.isAbsolute(filePath)) {
      resolvedPath = path.normalize(filePath);
    } else {
      resolvedPath = path.resolve(PROJECT_ROOT, filePath);
    }

    // Check for path traversal
    if (!resolvedPath.startsWith(PROJECT_ROOT)) {
      throw new Error(`Path outside project not allowed: ${filePath}`);
    }

    return resolvedPath;
  }

  _validateCommand(command) {
    if (!command) {
      throw new Error('command is required');
    }

    const cmd = command.trim().split(/\s+/)[0];
    if (!ALLOWED_COMMANDS.has(cmd)) {
      throw new Error(`Command not allowed: ${cmd}. Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`);
    }

    // Block dangerous patterns
    const dangerous = [
      /\|\s*sh/,
      /\|\s*bash/,
      /curl.*\|/,
      /wget.*\|/,
      /;\s*rm\s+-rf/,
      /&&\s*rm\s+-rf/,
      /^sudo\s+rm/,
      /\>\s*\/dev\/sd/,
      /fork\(\)/,
      /while\s*\(.*\)\s*\{\s*\}/,
    ];

    for (const pattern of dangerous) {
      if (pattern.test(command)) {
        throw new Error(`Dangerous pattern blocked: ${command}`);
      }
    }

    return command;
  }

  async _read(filePath) {
    const resolvedPath = this._validatePath(filePath);

    const stats = await fs.promises.stat(resolvedPath);
    if (stats.size > MAX_FILE_SIZE) {
      return { success: false, error: `File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE})` };
    }

    const content = await fs.promises.readFile(resolvedPath, 'utf-8');
    return { success: true, content };
  }

  async _write(filePath, content, options = {}) {
    if (content === undefined || content === null) {
      return { success: false, error: 'content is required for write' };
    }

    if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
      return { success: false, error: `Content too large: ${Buffer.byteLength(content)} bytes (max: ${MAX_FILE_SIZE})` };
    }

    const resolvedPath = this._validatePath(filePath);

    // Create parent directory if needed
    const parentDir = path.dirname(resolvedPath);
    await fs.promises.mkdir(parentDir, { recursive: true });

    await fs.promises.writeFile(resolvedPath, content, 'utf-8');
    return { success: true };
  }

  async _mkdir(dirPath, recursive = false) {
    const resolvedPath = this._validatePath(dirPath);
    await fs.promises.mkdir(resolvedPath, { recursive });
    return { success: true };
  }

  async _delete(filePath, recursive = false) {
    const resolvedPath = this._validatePath(filePath);

    try {
      await fs.promises.rm(resolvedPath, { recursive, force: true });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return { success: true };
  }

  async _shell(command, cwd, timeout) {
    const validatedCommand = this._validateCommand(command);

    const effectiveTimeout = Math.min(timeout || DEFAULT_TIMEOUT, MAX_TIMEOUT);
    const workingDir = cwd ? this._validatePath(cwd) : PROJECT_ROOT;

    return new Promise((resolve) => {
      const child = spawn(validatedCommand, {
        shell: true,
        cwd: workingDir,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      const timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({ success: false, error: 'Command timed out', stdout, stderr, exitCode: -1 });
      }, effectiveTimeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          stdout: stdout.slice(-100000), // Limit output size
          stderr: stderr.slice(-10000),
          exitCode: code
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({ success: false, error: error.message, stdout, stderr, exitCode: -1 });
      });
    });
  }

  async _exists(filePath) {
    const resolvedPath = this._validatePath(filePath);

    try {
      await fs.promises.access(resolvedPath);
      return { success: true, exists: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, exists: false };
      }
      throw error;
    }
  }

  async _copy(source, dest) {
    const resolvedSource = this._validatePath(source);
    const resolvedDest = this._validatePath(dest);

    const stats = await fs.promises.stat(resolvedSource);

    if (stats.isDirectory()) {
      await this._copyDirectory(resolvedSource, resolvedDest);
    } else {
      await fs.promises.copyFile(resolvedSource, resolvedDest);
    }

    return { success: true };
  }

  async _copyDirectory(source, dest) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this._copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }
}

export default FilesystemHandler;
export { FilesystemHandler };
