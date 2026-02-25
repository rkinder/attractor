/**
 * Coding Agent Session - Core agentic loop implementation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Message, Role, ContentKind, ToolResult } from '../llm/types.js';

export const SessionState = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  AWAITING_INPUT: 'awaiting_input',
  CLOSED: 'closed'
};

export const SessionEventType = {
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  USER_INPUT: 'user_input',
  ASSISTANT_TEXT_START: 'assistant_text_start',
  ASSISTANT_TEXT_DELTA: 'assistant_text_delta',
  ASSISTANT_TEXT_END: 'assistant_text_end',
  TOOL_CALL_START: 'tool_call_start',
  TOOL_CALL_OUTPUT_DELTA: 'tool_call_output_delta',
  TOOL_CALL_END: 'tool_call_end',
  STEERING_INJECTED: 'steering_injected',
  TURN_LIMIT: 'turn_limit',
  LOOP_DETECTION: 'loop_detection',
  ERROR: 'error'
};

export class Turn {
  constructor(type, content, timestamp = null) {
    this.type = type;
    this.content = content;
    this.timestamp = timestamp || new Date();
  }
}

export class UserTurn extends Turn {
  constructor(content) {
    super('user', content);
  }
}

export class AssistantTurn extends Turn {
  constructor(content, tool_calls = [], reasoning = null, usage = null, response_id = null) {
    super('assistant', content);
    this.tool_calls = tool_calls;
    this.reasoning = reasoning;
    this.usage = usage;
    this.response_id = response_id;
  }
}

export class ToolResultsTurn extends Turn {
  constructor(results) {
    super('tool_results', results);
    this.results = results;
  }
}

export class SystemTurn extends Turn {
  constructor(content) {
    super('system', content);
  }
}

export class SteeringTurn extends Turn {
  constructor(content) {
    super('steering', content);
  }
}

export class SessionConfig {
  constructor(options = {}) {
    this.max_turns = options.max_turns || 0; // 0 = unlimited
    this.max_tool_rounds_per_input = options.max_tool_rounds_per_input || 0; // 0 = unlimited
    this.default_command_timeout_ms = options.default_command_timeout_ms || 10000; // 10 seconds
    this.max_command_timeout_ms = options.max_command_timeout_ms || 600000; // 10 minutes
    this.reasoning_effort = options.reasoning_effort || null;
    this.tool_output_limits = options.tool_output_limits || this._getDefaultOutputLimits();
    this.enable_loop_detection = options.enable_loop_detection !== false;
    this.loop_detection_window = options.loop_detection_window || 10;
    this.max_subagent_depth = options.max_subagent_depth || 1;
  }

  _getDefaultOutputLimits() {
    return {
      read_file: 50000,
      shell: 30000,
      grep: 20000,
      glob: 20000,
      edit_file: 10000,
      apply_patch: 10000,
      write_file: 1000,
      spawn_agent: 20000
    };
  }
}

export class Session extends EventEmitter {
  constructor(providerProfile, executionEnv, config = new SessionConfig(), llmClient = null) {
    super();
    this.id = uuidv4();
    this.provider_profile = providerProfile;
    this.execution_env = executionEnv;
    this.history = [];
    this.config = config;
    this.state = SessionState.IDLE;
    this.llm_client = llmClient;
    this.steering_queue = [];
    this.followup_queue = [];
    this.subagents = new Map();
    this.abort_signal = false;
    this.tool_call_signatures = [];
  }

  async processInput(userInput) {
    this.state = SessionState.PROCESSING;
    this.history.push(new UserTurn(userInput));
    this.emit('event', { type: SessionEventType.USER_INPUT, content: userInput });

    // Drain any pending steering messages
    this._drainSteering();

    let roundCount = 0;

    while (true) {
      // Check limits
      if (this.config.max_tool_rounds_per_input > 0 && roundCount >= this.config.max_tool_rounds_per_input) {
        this.emit('event', { type: SessionEventType.TURN_LIMIT, round: roundCount });
        break;
      }

      if (this.config.max_turns > 0 && this.history.length >= this.config.max_turns) {
        this.emit('event', { type: SessionEventType.TURN_LIMIT, total_turns: this.history.length });
        break;
      }

      if (this.abort_signal) {
        break;
      }

      // Build LLM request
      const systemPrompt = await this.provider_profile.buildSystemPrompt(
        this.execution_env,
        this._discoverProjectDocs()
      );

      const messages = this._convertHistoryToMessages(systemPrompt);
      const toolDefs = this.provider_profile.tools();

      const request = {
        model: this.provider_profile.model,
        messages,
        tools: toolDefs,
        tool_choice: 'auto',
        reasoning_effort: this.config.reasoning_effort,
        provider: this.provider_profile.id,
        provider_options: this.provider_profile.providerOptions()
      };

      // Call LLM
      const response = await this.llm_client.complete(request);

      // Record assistant turn
      const assistantTurn = new AssistantTurn(
        response.text,
        response.tool_calls,
        response.reasoning,
        response.usage,
        response.id
      );
      this.history.push(assistantTurn);
      
      this.emit('event', { 
        type: SessionEventType.ASSISTANT_TEXT_END, 
        text: response.text, 
        reasoning: response.reasoning 
      });

      // If no tool calls, natural completion
      if (!response.tool_calls || response.tool_calls.length === 0) {
        break;
      }

      // Execute tool calls
      roundCount++;
      const results = await this._executeToolCalls(response.tool_calls);
      this.history.push(new ToolResultsTurn(results));

      // Drain steering messages injected during tool execution
      this._drainSteering();

      // Loop detection
      if (this.config.enable_loop_detection) {
        if (this._detectLoop()) {
          const warning = `Loop detected: the last ${this.config.loop_detection_window} tool calls follow a repeating pattern. Try a different approach.`;
          this.history.push(new SteeringTurn(warning));
          this.emit('event', { type: SessionEventType.LOOP_DETECTION, message: warning });
        }
      }
    }

    // Process follow-up messages
    if (this.followup_queue.length > 0) {
      const nextInput = this.followup_queue.shift();
      return await this.processInput(nextInput);
    }

    this.state = SessionState.IDLE;
    this.emit('event', { type: SessionEventType.SESSION_END });
  }

  steer(message) {
    this.steering_queue.push(message);
  }

  followUp(message) {
    this.followup_queue.push(message);
  }

  abort() {
    this.abort_signal = true;
    this.state = SessionState.CLOSED;
  }

  _drainSteering() {
    while (this.steering_queue.length > 0) {
      const msg = this.steering_queue.shift();
      this.history.push(new SteeringTurn(msg));
      this.emit('event', { type: SessionEventType.STEERING_INJECTED, content: msg });
    }
  }

  async _executeToolCalls(toolCalls) {
    const results = [];

    // Execute tool calls (parallel if profile supports it)
    if (this.provider_profile.supportsParallelToolCalls && toolCalls.length > 1) {
      const promises = toolCalls.map(tc => this._executeSingleTool(tc));
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      for (const toolCall of toolCalls) {
        const result = await this._executeSingleTool(toolCall);
        results.push(result);
      }
    }

    return results;
  }

  async _executeSingleTool(toolCall) {
    this.emit('event', { 
      type: SessionEventType.TOOL_CALL_START, 
      tool_name: toolCall.name, 
      call_id: toolCall.id 
    });

    const registered = this.provider_profile.toolRegistry.get(toolCall.name);
    if (!registered) {
      const errorMsg = `Unknown tool: ${toolCall.name}`;
      this.emit('event', { 
        type: SessionEventType.TOOL_CALL_END, 
        call_id: toolCall.id, 
        error: errorMsg 
      });
      return new ToolResult({
        tool_call_id: toolCall.id,
        content: errorMsg,
        is_error: true
      });
    }

    try {
      // Execute via execution environment
      const rawOutput = await registered.execute(toolCall.arguments, this.execution_env);

      // Record tool call signature for loop detection
      this._recordToolCallSignature(toolCall);

      // Truncate output for LLM
      const truncatedOutput = this._truncateToolOutput(rawOutput, toolCall.name);

      // Emit full output via event stream
      this.emit('event', { 
        type: SessionEventType.TOOL_CALL_END, 
        call_id: toolCall.id, 
        output: rawOutput 
      });

      return new ToolResult({
        tool_call_id: toolCall.id,
        content: truncatedOutput,
        is_error: false
      });

    } catch (error) {
      const errorMsg = `Tool error (${toolCall.name}): ${error.message}`;
      this.emit('event', { 
        type: SessionEventType.TOOL_CALL_END, 
        call_id: toolCall.id, 
        error: errorMsg 
      });
      return new ToolResult({
        tool_call_id: toolCall.id,
        content: errorMsg,
        is_error: true
      });
    }
  }

  _recordToolCallSignature(toolCall) {
    const signature = `${toolCall.name}:${this._hashArguments(toolCall.arguments)}`;
    this.tool_call_signatures.push(signature);
    
    // Keep only the last N signatures for loop detection
    const maxHistory = this.config.loop_detection_window * 2;
    if (this.tool_call_signatures.length > maxHistory) {
      this.tool_call_signatures = this.tool_call_signatures.slice(-maxHistory);
    }
  }

  _hashArguments(args) {
    // Simple hash of arguments for loop detection
    const str = JSON.stringify(args);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  _detectLoop() {
    const recent = this.tool_call_signatures.slice(-this.config.loop_detection_window);
    if (recent.length < this.config.loop_detection_window) {
      return false;
    }

    // Check for repeating patterns of length 1, 2, or 3
    for (let patternLen = 1; patternLen <= 3; patternLen++) {
      if (this.config.loop_detection_window % patternLen !== 0) continue;
      
      const pattern = recent.slice(0, patternLen);
      let allMatch = true;
      
      for (let i = patternLen; i < recent.length; i += patternLen) {
        const segment = recent.slice(i, i + patternLen);
        if (JSON.stringify(segment) !== JSON.stringify(pattern)) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) return true;
    }

    return false;
  }

  _truncateToolOutput(output, toolName) {
    const limit = this.config.tool_output_limits[toolName] || 10000;
    
    if (output.length <= limit) {
      return output;
    }

    const half = Math.floor(limit / 2);
    const removed = output.length - limit;
    
    return output.slice(0, half) +
      `\n\n[WARNING: Tool output was truncated. ${removed} characters were removed from the middle. ` +
      `The full output is available in the event stream. ` +
      `If you need to see specific parts, re-run the tool with more targeted parameters.]\n\n` +
      output.slice(-half);
  }

  _convertHistoryToMessages(systemPrompt) {
    const messages = [Message.system(systemPrompt)];

    for (const turn of this.history) {
      if (turn instanceof UserTurn) {
        messages.push(Message.user(turn.content));
      } else if (turn instanceof AssistantTurn) {
        const content = [];
        
        if (turn.content) {
          content.push({ kind: ContentKind.TEXT, text: turn.content });
        }
        
        if (turn.reasoning) {
          content.push({ kind: ContentKind.THINKING, thinking: { text: turn.reasoning } });
        }
        
        for (const toolCall of turn.tool_calls) {
          content.push({ 
            kind: ContentKind.TOOL_CALL, 
            tool_call: toolCall 
          });
        }
        
        messages.push(new Message(Role.ASSISTANT, content));
      } else if (turn instanceof ToolResultsTurn) {
        for (const result of turn.results) {
          messages.push(Message.toolResult(result.tool_call_id, result.content, result.is_error));
        }
      } else if (turn instanceof SteeringTurn) {
        messages.push(Message.user(turn.content));
      } else if (turn instanceof SystemTurn) {
        messages.push(Message.system(turn.content));
      }
    }

    return messages;
  }

  _discoverProjectDocs() {
    // Placeholder - would walk filesystem to find AGENTS.md, CLAUDE.md, etc.
    return [];
  }
}