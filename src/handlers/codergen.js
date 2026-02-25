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
  }

  async execute(node, context, graph, logsRoot) {
    // 1. Build prompt
    let prompt = node.prompt;
    if (!prompt) {
      prompt = node.label;
    }
    prompt = this._expandVariables(prompt, graph, context);

    // 2. Determine optimal model if router available
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

    // 3. Write prompt and model info to logs
    const stageDir = path.join(logsRoot, node.id);
    await fs.mkdir(stageDir, { recursive: true });
    await fs.writeFile(path.join(stageDir, 'prompt.md'), prompt);
    
    if (modelInfo) {
      await fs.writeFile(
        path.join(stageDir, 'model-selection.json'), 
        JSON.stringify(modelInfo, null, 2)
      );
    }

    // 3. Call LLM backend with stylesheet support
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

    // 4. Write response to logs
    await fs.writeFile(path.join(stageDir, 'response.md'), responseText);

    // 5. Write status and return outcome
    const outcome = Outcome.success(`Stage completed: ${node.id}`, {
      [Context.LAST_STAGE]: node.id,
      [Context.LAST_RESPONSE]: this._truncate(responseText, 200)
    });
    
    await this._writeStatus(stageDir, outcome);
    return outcome;
  }

  _expandVariables(text, graph, context) {
    // Simple variable expansion for $goal
    return text.replace(/\$goal/g, graph.goal || '');
  }

  _truncate(text, maxLength) {
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
    const result = await this.session.processInput(prompt);
    
    // Extract the final response text
    const lastAssistantTurn = this.session.history
      .filter(turn => turn.type === 'assistant')
      .pop();
    
    return lastAssistantTurn ? lastAssistantTurn.content : '[No response generated]';
  }
}