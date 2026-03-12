/**
 * Codergen Handler - LLM task execution
 */

import fs from 'fs/promises';
import path from 'path';
import { Handler } from './registry.js';
import { Outcome } from '../pipeline/outcome.js';
import { Context } from '../pipeline/context.js';

export class CodergenHandler extends Handler {
  constructor(backend = null, stylesheetApplicator = null, modelRouter = null) {
    super();
    this.backend = backend; // CodergenBackend implementation or null for simulation
    this.stylesheetApplicator = stylesheetApplicator;
    this.modelRouter = modelRouter; // Smart model selection
    this.personaCache = new Map(); // Cache for loaded personas
    this.personasBasePath = null; // Base path for persona files
  }

  /**
   * Set the base path for persona files
   * @param {string} basePath - The directory containing the personas/ folder
   */
  setPersonasBasePath(basePath) {
    this.personasBasePath = basePath;
  }

  async execute(node, context, graph, logsRoot) {
    // 1. Load persona if specified
    let personaPrompt = null;
    if (node.persona) {
      personaPrompt = await this._loadPersona(node.persona, graph);
    }

    // 2. Build prompt
    let prompt = node.prompt;
    if (!prompt) {
      // Try loading from prompt_file attribute
      if (node.prompt_file) {
        prompt = await this._loadPromptFile(node.prompt_file, graph);
      }
    }
    if (!prompt) {
      prompt = node.label;
    }
    prompt = this._expandVariables(prompt, graph, context);

    // 3. Inject persona into prompt if available
    if (personaPrompt) {
      prompt = this._injectPersona(personaPrompt, prompt, node.persona);
    }

    // 3b. Handle target_file for read-modify-write pattern
    const attrs = node.attributes || node;
    let targetFile = attrs.target_file || attrs.target || node.target_file || node.target;
    let existingContent = null;
    if (targetFile) {
      const targetPath = path.resolve(process.cwd(), targetFile);
      try {
        existingContent = await fs.readFile(targetPath, 'utf-8');
        prompt = this._buildReadModifyPrompt(targetFile, existingContent, prompt);
      } catch (error) {
        // File doesn't exist, will be created
        prompt = this._buildNewFilePrompt(targetFile, prompt);
      }
    }

    // 4. Determine optimal model if router available
    let selectedModel = null;
    let modelInfo = null;
    if (this.modelRouter && this.backend) {
      const taskInfo = this._extractTaskInfo(node, prompt, context);
      selectedModel = this.modelRouter.selectModel(taskInfo);
      modelInfo = {
        selected: selectedModel,
        taskType: taskInfo.taskType,
        complexity: taskInfo.complexity,
        reasoning: `Selected ${selectedModel} for ${taskInfo.taskType} task with ${taskInfo.complexity} complexity`
      };
    }

    // 5. Write prompt and model info to logs
    const stageDir = path.join(logsRoot, node.id);
    await fs.mkdir(stageDir, { recursive: true });
    await fs.writeFile(path.join(stageDir, 'prompt.md'), prompt);
    
    // Write persona info if used
    if (personaPrompt) {
      await fs.writeFile(
        path.join(stageDir, 'persona.md'), 
        personaPrompt
      );
    }
    
    if (modelInfo) {
      await fs.writeFile(
        path.join(stageDir, 'model-selection.json'), 
        JSON.stringify(modelInfo, null, 2)
      );
    }

    // 6. Call LLM backend with stylesheet support
    let responseText;
    if (this.backend) {
      try {
        // Apply stylesheet if available
        let enhancedNode = node;
        if (this.stylesheetApplicator) {
          const styleOverrides = this.stylesheetApplicator.stylesheet.applyToNode(node, graph);
          if (Object.keys(styleOverrides).length > 0) {
            // Create enhanced node with style overrides
            enhancedNode = {
              ...node,
              attributes: { ...node.attributes, ...styleOverrides }
            };
          }
        }
        
        const result = await this.backend.run(enhancedNode, prompt, context, selectedModel);
        
        // Backend can return either an Outcome or a string
        if (result && typeof result === 'object' && result.status) {
          await this._writeStatus(stageDir, result);
          return result;
        }
        
        responseText = String(result);
      } catch (error) {
        const outcome = Outcome.fail(`Backend error: ${error.message}`);
        await this._writeStatus(stageDir, outcome);
        return outcome;
      }
    } else {
      // Simulation mode
      responseText = `[Simulated] Response for stage: ${node.id}`;
    }

    // 7. Write response to logs
    await fs.writeFile(path.join(stageDir, 'response.md'), responseText);

    // 7b. Write to target_file if specified (read-modify-write pattern)
    if (targetFile) {
      const extractedCode = this._extractCodeFromResponse(responseText, targetFile);
      if (extractedCode) {
        const targetPath = path.resolve(process.cwd(), targetFile);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, extractedCode, 'utf-8');
        console.log(`[codergen] Wrote to ${targetFile}`);
      }
    } else {
      // No target_file specified - look for FILE: directives in response
      const filesWritten = await this._extractAndWriteFiles(responseText, stageDir);
      if (filesWritten.length > 0) {
        console.log(`[codergen] Wrote ${filesWritten.length} file(s): ${filesWritten.join(', ')}`);
      }
    }

    // 8. Write status and return outcome
    const outcome = Outcome.success(`Stage completed: ${node.id}`, {
      [Context.LAST_STAGE]: node.id,
      [Context.LAST_RESPONSE]: this._truncate(responseText, 200)
    });
    
    await this._writeStatus(stageDir, outcome);
    return outcome;
  }

  /**
   * Load a persona by name
   * @param {string} personaName - The name of the persona (without extension)
   * @param {object} graph - The workflow graph object
   * @returns {Promise<string|null>} - The persona prompt content or null if not found
   */
  async _loadPersona(personaName, graph) {
    // Check cache first
    if (this.personaCache.has(personaName)) {
      return this.personaCache.get(personaName);
    }

    const personaExtensions = ['.md', '.txt'];

    // Determine search paths for personas
    const searchPaths = [];

    // 1. Workflow-local personas: workflow-dir/../personas/
    if (graph.workflowDir) {
      const workflowDir = path.dirname(graph.workflowDir);
      for (const ext of personaExtensions) {
        searchPaths.push(path.join(workflowDir, 'personas', `${personaName}${ext}`));
      }
    }

    // 2. Project-level personas: process.cwd()/personas/
    if (this.personasBasePath) {
      for (const ext of personaExtensions) {
        searchPaths.push(path.join(this.personasBasePath, `${personaName}${ext}`));
      }
    } else {
      for (const ext of personaExtensions) {
        searchPaths.push(path.join(process.cwd(), 'personas', `${personaName}${ext}`));
      }
    }

    // 3. Alternative: personas/ in same directory as workflow file
    if (graph.workflowDir) {
      const workflowDir = path.dirname(graph.workflowDir);
      for (const ext of personaExtensions) {
        searchPaths.push(path.join(workflowDir, 'personas', `${personaName}${ext}`));
      }
    }

    // Try each path
    for (const personaPath of searchPaths) {
      try {
        const content = await fs.readFile(personaPath, 'utf-8');
        this.personaCache.set(personaName, content);
        return content;
      } catch {
        // File doesn't exist at this path, try next
      }
    }

    console.warn(`Persona '${personaName}' not found in any of these locations: ${searchPaths.join(', ')}`);
    return null;
  }

  /**
   * Load a prompt file
   * @param {string} promptFile - The path to the prompt file (relative or absolute)
   * @param {object} graph - The workflow graph object
   * @returns {Promise<string>} - The prompt content
   */
  async _loadPromptFile(promptFile, graph) {
    const searchPaths = [];

    // 1. Relative to workflow file
    if (graph.workflowDir) {
      const workflowDir = path.dirname(graph.workflowDir);
      searchPaths.push(path.join(workflowDir, promptFile));
    }

    // 2. Relative to current working directory
    searchPaths.push(path.join(process.cwd(), promptFile));

    // 3. Try as absolute path
    searchPaths.push(promptFile);

    for (const promptPath of searchPaths) {
      try {
        const content = await fs.readFile(promptPath, 'utf-8');
        return content;
      } catch {
        // Try next path
      }
    }

    throw new Error(`Prompt file '${promptFile}' not found in any of these locations: ${searchPaths.join(', ')}`);
  }

  /**
   * Inject persona context into the user prompt
   * @param {string} personaPrompt - The persona definition
   * @param {string} userPrompt - The user's task prompt
   * @param {string} personaName - The name of the persona (for logging)
   * @returns {string} - The combined prompt with persona context
   */
  _injectPersona(personaPrompt, userPrompt, personaName) {
    return `${personaPrompt}

---

## Current Task

${userPrompt}

---

*This task is being executed with the "${personaName}" persona.*`;
  }

  _expandVariables(text, graph, context) {
    if (!text) return text;
    
    let expanded = text;
    
    expanded = this._expandGoal(expanded, graph);
    expanded = this._expandLastResponse(expanded, context);
    expanded = this._expandCurrentNode(expanded, context);
    expanded = this._expandContextKey(expanded, context);
    expanded = this._expandNodeOutput(expanded, context);
    expanded = this._expandEnvVar(expanded);
    
    return expanded;
  }

  _expandEnvVar(text) {
    const pattern = /\$env\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    return text.replace(pattern, (match, key) => {
      const value = process.env[key];
      return value !== undefined ? value : '';
    });
  }

  _expandGoal(text, graph) {
    return text.replace(/\$goal/g, graph.goal || '');
  }

  _expandLastResponse(text, context) {
    const lastResponse = context.get(Context.LAST_RESPONSE, '');
    return text.replace(/\$last_response/g, this._truncate(lastResponse, 200));
  }

  _expandCurrentNode(text, context) {
    const currentNode = context.get(Context.CURRENT_NODE, '');
    return text.replace(/\$current_node/g, currentNode);
  }

  _expandContextKey(text, context) {
    const pattern = /\$context\.([a-zA-Z_][a-zA-Z0-9_.]*)/g;
    return text.replace(pattern, (match, key) => {
      const value = context.get(key, '');
      return value !== null ? String(value) : '';
    });
  }

  _expandNodeOutput(text, context) {
    const pattern = /\$([a-zA-Z_][a-zA-Z0-9_-]*)\.output/g;
    return text.replace(pattern, (match, nodeId) => {
      const key = `${nodeId}.output`;
      const value = context.get(key, '');
      return value !== null ? String(value) : '';
    });
  }

  _truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  _extractTaskInfo(node, prompt, context) {
    // Extract task characteristics for model routing
    const taskTypeHints = {
      'analyze': 'code_analysis',
      'review': 'code_analysis', 
      'security': 'security_review',
      'performance': 'performance_analysis',
      'test': 'test_generation',
      'document': 'documentation',
      'generate': 'documentation',
      'create': 'documentation'
    };

    // Determine task type from node ID or prompt
    let taskType = 'general';
    const nodeIdLower = node.id.toLowerCase();
    const promptLower = prompt.toLowerCase();
    
    for (const [hint, type] of Object.entries(taskTypeHints)) {
      if (nodeIdLower.includes(hint) || promptLower.includes(hint)) {
        taskType = type;
        break;
      }
    }

    // Determine complexity
    let complexity = 'medium';
    if (prompt.length > 1000 || promptLower.includes('comprehensive') || 
        promptLower.includes('detailed') || promptLower.includes('thorough')) {
      complexity = 'high';
    } else if (prompt.length < 200 || promptLower.includes('quick') || 
               promptLower.includes('simple') || promptLower.includes('brief')) {
      complexity = 'low';
    }

    // Check for reasoning requirements
    const requiresReasoning = promptLower.includes('analyze') || 
                              promptLower.includes('evaluate') ||
                              promptLower.includes('assess') ||
                              promptLower.includes('determine');

    // Check for creativity requirements  
    const requiresCreativity = promptLower.includes('generate') || 
                               promptLower.includes('create') ||
                               promptLower.includes('write') ||
                               promptLower.includes('design');

    // Also consider persona in task type determination
    if (node.persona) {
      const personaToTaskType = {
        'orchestrator': 'project_management',
        'developer': 'implementation',
        'reviewer': 'code_analysis',
        'researcher': 'research',
        'architect': 'system_design',
        'qa_engineer': 'testing'
      };
      if (personaToTaskType[node.persona]) {
        taskType = personaToTaskType[node.persona];
      }
    }

    return {
      taskType,
      complexity,
      priority: node.priority || 'normal',
      contextLength: prompt.length,
      requiresReasoning,
      requiresCreativity,
      nodeId: node.id
    };
  }

  async _writeStatus(stageDir, outcome) {
    const statusPath = path.join(stageDir, 'status.json');
    const statusData = {
      status: outcome.status,
      notes: outcome.notes,
      failure_reason: outcome.failure_reason,
      preferred_label: outcome.preferred_label,
      suggested_next_ids: outcome.suggested_next_ids,
      context_updates: outcome.context_updates,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(statusPath, JSON.stringify(statusData, null, 2));
  }

  _buildReadModifyPrompt(targetFile, existingContent, taskPrompt) {
    const ext = path.extname(targetFile).toLowerCase();
    const language = this._getLanguage(ext);
    
    return `You are modifying an existing file: ${targetFile}

Here is the current content of the file:
\`\`\`${language}
${existingContent}
\`\`\`

Now, perform the following task:
${taskPrompt}

IMPORTANT: Respond with the complete, modified file content. Include ALL code - do not summarize or use placeholders. The response should be the full file that will replace the existing content.`;
  }

  _buildNewFilePrompt(targetFile, taskPrompt) {
    const ext = path.extname(targetFile).toLowerCase();
    const language = this._getLanguage(ext);
    
    return `You are creating a new file: ${targetFile}

Task:
${taskPrompt}

IMPORTANT: Respond with the complete file content. Include ALL code - do not summarize or use placeholders.`;
  }

  _getLanguage(ext) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bash': 'bash'
    };
    return languageMap[ext] || 'text';
  }

  _extractCodeFromResponse(responseText, targetFile) {
    const ext = path.extname(targetFile).toLowerCase();
    const language = this._getLanguage(ext);
    
    const backtick = String.fromCharCode(96); // backtick character
    const codeBlockRegex = new RegExp(backtick + backtick + backtick + language + '\\s*([\\s\\S]*?)' + backtick + backtick + backtick, 'i');
    let match = responseText.match(codeBlockRegex);
    
    if (!match) {
      const anyCodeBlockRegex = new RegExp(backtick + '(\\w*)' + '\\s*([\\s\\S]*?)' + backtick + backtick + backtick, 'g');
      let blocks = [];
      let blockMatch;
      while ((blockMatch = anyCodeBlockRegex.exec(responseText)) !== null) {
        blocks.push(blockMatch[2]);
      }
      if (blocks.length > 0) {
        match = { 1: blocks.reduce((a, b) => a.length > b.length ? a : b) };
      }
    }
    
    if (!match) {
      const fileMentionRegex = new RegExp(targetFile + '[\\s\\S]*?(?:^|\\n)([\\s\\S]+)', 'm');
      match = responseText.match(fileMentionRegex);
    }
    
    if (match && match[1]) {
      let code = match[1].trim();
      code = code.replace(/^(?:Here is|Here is|Here\'s|This is|The|Updated)[\s\S]*?:\s*/i, '');
      return code;
    }
    
    const lines = responseText.split('\n');
    if (lines.length > 5 && (lines[0].includes('{') || lines[0].includes('<'))) {
      return responseText.trim();
    }
    
    console.warn('[codergen] Could not extract code for ' + targetFile);
    return null;
  }

  async _extractAndWriteFiles(responseText, stageDir) {
    const filesWritten = [];
    const projectRoot = process.cwd();

    // Pattern 1: FILE: path/to/file.js (at start of line)
    const fileDirectiveRegex = /^FILE:\s*(.+)$/gm;
    let match;
    while ((match = fileDirectiveRegex.exec(responseText)) !== null) {
      const filePath = match[1].trim();
      const code = this._extractCodeAfterDirective(responseText, match.index);
      if (code) {
        const fullPath = path.resolve(projectRoot, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, code, 'utf-8');
        filesWritten.push(filePath);
      }
    }

    // Pattern 2: // FILE: path (inside code blocks)
    if (filesWritten.length === 0) {
      const inlineFileRegex = /\/\/\s*FILE:\s*(.+?)$/gm;
      while ((match = inlineFileRegex.exec(responseText)) !== null) {
        const filePath = match[1].trim();
        const codeBlockMatch = responseText.match(new RegExp('```[\\s\\S]*?' + match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?```'));
        if (codeBlockMatch) {
          const code = codeBlockMatch[0]
            .replace(/```(?:\w+)?/, '')
            .replace(/```$/, '')
            .replace(/^\s*\/\/\s*FILE:.+$/m, '')
            .trim();
          if (code) {
            const fullPath = path.resolve(projectRoot, filePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, code, 'utf-8');
            filesWritten.push(filePath);
          }
        }
      }
    }

    // Pattern 3: // path/to/file.js (just a path as comment in code block)
    if (filesWritten.length === 0) {
      const commentPathRegex = /```(?:\w+)?\s*\n\s*\/\/\s*(.+?\.(?:js|ts|jsx|tsx|py|go|rs|java|c|cpp|h|html|css|json|yaml|yml|md|sql|sh|bash))\s*\n([\s\S]*?)```/g;
      while ((match = commentPathRegex.exec(responseText)) !== null) {
        const filePath = match[1].trim();
        const code = match[2].trim();
        if (code && code.length > 10) {
          const fullPath = path.resolve(projectRoot, filePath);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, code, 'utf-8');
          filesWritten.push(filePath);
        }
      }
    }

    // Pattern 4: e.g., ```javascript:src/utils.js
    if (filesWritten.length === 0) {
      const codeBlockWithPathRegex = /```(\w+)?:?\s*([^\s]+)\s*\n([\s\S]*?)```/g;
      while ((match = codeBlockWithPathRegex.exec(responseText)) !== null) {
        const possiblePath = match[2].trim();
        if (possiblePath.includes('.') && !possiblePath.includes(' ') && !possiblePath.startsWith('```')) {
          const code = match[3].trim();
          if (code.length > 20) {
            const fullPath = path.resolve(projectRoot, possiblePath);
            try {
              await fs.mkdir(path.dirname(fullPath), { recursive: true });
              await fs.writeFile(fullPath, code, 'utf-8');
              filesWritten.push(possiblePath);
            } catch (e) {
              // Ignore errors
            }
          }
        }
      }
    }

    // Pattern 5: Single code block - try to infer filename from exports
    if (filesWritten.length === 0) {
      const codeBlocks = this._findAllCodeBlocks(responseText);
      if (codeBlocks.length === 1) {
        const code = codeBlocks[0].code;
        const inferredPath = this._inferFilename(code);
        if (inferredPath) {
          const fullPath = path.resolve(projectRoot, inferredPath);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, code, 'utf-8');
          filesWritten.push(inferredPath);
        }
      }
    }

    if (filesWritten.length > 0) {
      console.log('[codergen] Auto-wrote files: ' + filesWritten.join(', '));
    }
    return filesWritten;
  }

  _extractCodeAfterDirective(responseText, directiveIndex) {
    const afterDirective = responseText.slice(directiveIndex);
    const lines = afterDirective.split('\n');
    let codeStart = -1;
    let inCodeBlock = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          break;
        } else {
          inCodeBlock = true;
          codeStart = i + 1;
        }
      }
    }

    if (codeStart > 0) {
      const codeLines = lines.slice(codeStart, lines.findIndex((l, idx) => idx > codeStart && l.trim().startsWith('```')));
      return codeLines.join('\n').trim();
    }

    // No code block - try to get content after blank lines
    const content = afterDirective.slice(afterDirective.indexOf('\n')).trim();
    return content || null;
  }

  _findAllCodeBlocks(responseText) {
    const blocks = [];
    const backtick = String.fromCharCode(96);
    const regex = new RegExp(backtick + '{3}(\\w*)\\s*\\n([\\s\\S]*?)' + backtick + '{3}', 'g');
    let match;
    while ((match = regex.exec(responseText)) !== null) {
      blocks.push({ language: match[1], code: match[2].trim() });
    }
    return blocks;
  }

  _inferFilename(code) {
    const trimmed = code.trim();
    
    // Try to infer filename from module.exports = { ... }
    const moduleExportMatch = trimmed.match(/^module\.exports\s*=\s*{([^}]+)}/m);
    if (moduleExportMatch) {
      const exportsObj = moduleExportMatch[1];
      const firstExport = exportsObj.split(',')[0].split(':')[0].trim();
      if (firstExport) {
        const ext = this._guessExtension(trimmed);
        return `generated/${firstExport}.${ext}`;
      }
    }

    // Try to infer filename from export default function
    const exportDefaultFnMatch = trimmed.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    if (exportDefaultFnMatch) {
      const ext = this._guessExtension(trimmed);
      return `generated/${exportDefaultFnMatch[1]}.${ext}`;
    }

    // Try to infer filename from export function
    const exportFnMatch = trimmed.match(/export\s+(?:async\s+)?function\s+(\w+)/);
    if (exportFnMatch) {
      const ext = this._guessExtension(trimmed);
      return `generated/${exportFnMatch[1]}.${ext}`;
    }

    // Try to infer filename from export const/let/class
    const exportConstMatch = trimmed.match(/export\s+(?:const|let|var|class)\s+(\w+)/);
    if (exportConstMatch) {
      const ext = this._guessExtension(trimmed);
      return `generated/${exportConstMatch[1]}.${ext}`;
    }

    // Try from import { ... } from
    const importMatch = trimmed.match(/import\s+{[^}]+}\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const name = path.basename(importMatch[1], path.extname(importMatch[1]));
      const ext = this._guessExtension(trimmed);
      return `generated/${name}.${ext}`;
    }

    return null;
  }

  _guessExtension(code) {
    if (code.includes('function') || code.includes('const ') || code.includes('let ') || code.includes('module.exports') || code.includes('exports.')) {
      if (code.includes(': ') && !code.includes('interface ') && !code.includes('type ')) {
        return 'ts';
      }
      return 'js';
    }
    if (code.includes('def ') || (code.includes('import ') && code.includes(':'))) return 'py';
    if (code.includes('def ') || code.includes('import ')) return 'py';
    if (code.includes('func ') || code.includes('package ')) return 'go';
    if (code.includes('fn ') && code.includes('let mut')) return 'rs';
    if (code.includes('public class') || code.includes('public static void')) return 'java';
    return 'txt';
  }
}

// CodergenBackend interface for reference
export class CodergenBackend {
  async run(node, prompt, context) {
    throw new Error('CodergenBackend.run() must be implemented');
  }
}

// Example backend implementation that uses the Coding Agent Session
export class SessionBackend extends CodergenBackend {
  constructor(session) {
    super();
    this.session = session;
  }

  async run(node, prompt, context, selectedModel = null) {
    // Configure model if provided
    if (selectedModel && this.session.llmClient) {
      // Update the session's provider profile to use the selected model
      this.session.providerProfile.model = selectedModel;
    }

    // Use the coding agent session to process the prompt
    await this.session.processInput(prompt);
    
    // Extract the final response text
    const lastAssistantTurn = this.session.history
      .filter(turn => turn.type === 'assistant')
      .pop();
    
    return lastAssistantTurn ? lastAssistantTurn.content : '[No response generated]';
  }
}
