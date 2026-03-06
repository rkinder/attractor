/**
 * Kilo AI Gateway Adapter for the Unified LLM Client
 * 
 * Provides OpenAI-compatible interface to Kilo Gateway's hundreds of models
 * Base URL: https://api.kilo.ai/api/gateway
 * Authentication: Bearer token
 */

import { ProviderAdapter } from '../client.js';
import { 
  Response, 
  Message, 
  ContentPart, 
  FinishReason, 
  Usage, 
  StreamEvent,
  Role,
  ContentKind,
  FinishReasonType,
  StreamEventType
} from '../types.js';

export class KiloAdapter extends ProviderAdapter {
  constructor(options = {}) {
    super('kilo');
    this.api_key = options.api_key;
    this.base_url = options.base_url || 'https://api.kilo.ai/api/gateway';
    this.default_model = options.default_model || 'anthropic/claude-sonnet-4.5';
    this.organization_id = options.organization_id;
    this.task_id = options.task_id;
    this.timeout = options.timeout || 30000;
    
    // Model routing strategy for optimal performance and cost
    this.modelStrategies = {
      'code_analysis': 'anthropic/claude-sonnet-4.5',
      'security_review': 'anthropic/claude-opus-4-6', 
      'documentation': 'openai/gpt-4o',
      'quick_tasks': 'openai/gpt-4o-mini',
      'performance_analysis': 'anthropic/claude-sonnet-4.5',
      'test_generation': 'openai/gpt-4o',
      'general': 'anthropic/claude-sonnet-4.5'
    };
  }

  async initialize() {
    if (!this.api_key) {
      throw new Error('Kilo API key is required');
    }
    
    // Validate API key by making a test request
    try {
      const response = await fetch(`${this.base_url}/models`, {
        headers: { 'Authorization': `Bearer ${this.api_key}` }
      });
      
      if (!response.ok) {
        throw new Error(`Kilo API key validation failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to Kilo Gateway: ${error.message}`);
    }
  }

  async complete(request) {
    const kiloRequest = this._buildKiloRequest(request);
    
    const response = await fetch(`${this.base_url}/chat/completions`, {
      method: 'POST',
      headers: this._getHeaders(request),
      body: JSON.stringify(kiloRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw this._handleKiloError(response.status, errorText);
    }

    const data = await response.json();
    return this._parseResponse(data, request);
  }

  async *stream(request) {
    const kiloRequest = { 
      ...this._buildKiloRequest(request), 
      stream: true 
    };
    
    const response = await fetch(`${this.base_url}/chat/completions`, {
      method: 'POST',
      headers: this._getHeaders(request),
      body: JSON.stringify(kiloRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw this._handleKiloError(response.status, errorText);
    }

    yield new StreamEvent(StreamEventType.STREAM_START);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              yield* this._parseStreamEvent(event);
            } catch (e) {
              // Skip malformed events
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield new StreamEvent(StreamEventType.STREAM_END);
  }

  _buildKiloRequest(request) {
    // Convert to Kilo/OpenAI-compatible format
    return {
      model: this._selectOptimalModel(request),
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      tools: request.tools,
      tool_choice: request.tool_choice,
      response_format: request.response_format,
      user: request.user,
      seed: request.seed,
      stream: false
    };
  }

  _selectOptimalModel(request) {
    // If model is explicitly specified, use it
    if (request.model) {
      return this._validateKiloModel(request.model);
    }

    // If default_model is set (via KILO_MODEL env), use it
    if (this.default_model) {
      return this._validateKiloModel(this.default_model);
    }

    // Auto-select based on context hints or use general strategy
    const contextHint = request.context_hint || 'general';
    return this.modelStrategies[contextHint] || this.default_model;
  }

  _validateKiloModel(model) {
    // Validate that model follows Kilo format (provider/model-name)
    if (!model.includes('/')) {
      throw new Error(`Invalid Kilo model format: ${model}. Expected format: provider/model-name`);
    }
    return model;
  }

  _getHeaders(request) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.api_key}`,
      ...request.headers
    };

    // Add Kilo-specific headers
    if (this.organization_id) {
      headers['X-KiloCode-OrganizationId'] = this.organization_id;
    }
    if (this.task_id) {
      headers['X-KiloCode-TaskId'] = this.task_id;
    }

    return headers;
  }

  _parseResponse(data, request) {
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No choices returned from Kilo Gateway');
    }

    const message = new Message(
      Role.ASSISTANT,
      choice.message?.content || '',
      ContentKind.TEXT
    );

    const finishReason = this._mapFinishReason(choice.finish_reason);
    
    const usage = new Usage(
      data.usage?.prompt_tokens || 0,
      data.usage?.completion_tokens || 0,
      data.usage?.total_tokens || 0
    );

    return new Response([message], finishReason, usage, {
      model: data.model,
      provider: 'kilo',
      id: data.id,
      created: data.created
    });
  }

  *_parseStreamEvent(event) {
    if (event.choices && event.choices.length > 0) {
      const choice = event.choices[0];
      const delta = choice.delta;
      
      if (delta.content) {
        yield new StreamEvent(StreamEventType.CONTENT_DELTA, {
          content: delta.content,
          index: choice.index
        });
      }

      if (choice.finish_reason) {
        yield new StreamEvent(StreamEventType.STREAM_END, {
          finish_reason: choice.finish_reason,
          usage: event.usage
        });
      }
    }
  }

  _mapFinishReason(reason) {
    const mapping = {
      'stop': FinishReasonType.STOP,
      'length': FinishReasonType.MAX_TOKENS,
      'content_filter': FinishReasonType.CONTENT_FILTER,
      'tool_calls': FinishReasonType.TOOL_CALLS
    };
    return new FinishReason(mapping[reason] || FinishReasonType.OTHER, reason);
  }

  _handleKiloError(status, errorText) {
    let errorObj;
    try {
      errorObj = JSON.parse(errorText);
    } catch {
      errorObj = { error: { message: errorText } };
    }

    const message = errorObj.error?.message || 'Unknown Kilo Gateway error';
    
    switch (status) {
      case 400:
        throw new Error(`Bad request: ${message}`);
      case 401:
        throw new Error(`Unauthorized: Invalid Kilo API key - ${message}`);
      case 402:
        throw new Error(`Payment required: Insufficient Kilo balance - ${message}`);
      case 403:
        throw new Error(`Forbidden: Model not allowed by organization policy - ${message}`);
      case 429:
        throw new Error(`Rate limited: Too many requests - ${message}`);
      case 500:
        throw new Error(`Kilo Gateway internal error - ${message}`);
      case 502:
        throw new Error(`Provider error: ${message}`);
      case 503:
        throw new Error(`Service unavailable: Provider temporarily unavailable - ${message}`);
      default:
        throw new Error(`Kilo Gateway error ${status}: ${message}`);
    }
  }

  supportsStreaming() {
    return true;
  }

  getModelStrategies() {
    return this.modelStrategies;
  }

  setModelStrategy(taskType, model) {
    this.modelStrategies[taskType] = this._validateKiloModel(model);
  }
}

/**
 * Predefined Kilo Gateway configurations for common use cases
 */
export const KiloConfigs = {
  // Code-focused configuration
  codeFocused: {
    default_model: 'anthropic/claude-sonnet-4.5',
    modelStrategies: {
      'code_analysis': 'anthropic/claude-sonnet-4.5',
      'security_review': 'anthropic/claude-opus-4-6',
      'performance_analysis': 'anthropic/claude-sonnet-4.5',
      'documentation': 'openai/gpt-4o',
      'test_generation': 'openai/gpt-4o',
      'quick_tasks': 'openai/gpt-4o-mini'
    }
  },

  // Cost-optimized configuration
  costOptimized: {
    default_model: 'openai/gpt-4o-mini',
    modelStrategies: {
      'code_analysis': 'openai/gpt-4o-mini',
      'security_review': 'anthropic/claude-sonnet-4.5',  // Only use expensive models for critical tasks
      'performance_analysis': 'openai/gpt-4o-mini',
      'documentation': 'openai/gpt-4o-mini',
      'test_generation': 'openai/gpt-4o-mini',
      'quick_tasks': 'openai/gpt-4o-mini'
    }
  },

  // High-performance configuration
  highPerformance: {
    default_model: 'anthropic/claude-opus-4-6',
    modelStrategies: {
      'code_analysis': 'anthropic/claude-opus-4-6',
      'security_review': 'anthropic/claude-opus-4-6',
      'performance_analysis': 'anthropic/claude-opus-4-6',
      'documentation': 'openai/gpt-4o',
      'test_generation': 'openai/gpt-4o',
      'quick_tasks': 'openai/gpt-4o'
    }
  },

  // Balanced configuration (recommended default)
  balanced: {
    default_model: 'anthropic/claude-sonnet-4.5',
    modelStrategies: {
      'code_analysis': 'anthropic/claude-sonnet-4.5',
      'security_review': 'anthropic/claude-opus-4-6',
      'performance_analysis': 'anthropic/claude-sonnet-4.5', 
      'documentation': 'openai/gpt-4o',
      'test_generation': 'openai/gpt-4o',
      'quick_tasks': 'openai/gpt-4o-mini'
    }
  }
};

/**
 * Popular Kilo model collections
 */
export const KiloModels = {
  // Anthropic Claude models
  claude: {
    opus: 'anthropic/claude-opus-4-6',
    sonnet: 'anthropic/claude-sonnet-4.5',
    haiku: 'anthropic/claude-haiku-4-2'
  },

  // OpenAI GPT models  
  openai: {
    gpt4o: 'openai/gpt-4o',
    gpt4oMini: 'openai/gpt-4o-mini',
    gpt4Turbo: 'openai/gpt-4-turbo'
  },

  // Google Gemini models
  google: {
    gemini3Pro: 'google/gemini-3-pro',
    gemini3Flash: 'google/gemini-3-flash'
  },

  // xAI Grok models
  xai: {
    grok2: 'xai/grok-2',
    grok2Mini: 'xai/grok-2-mini'
  }
};

/**
 * Utility function to create a Kilo adapter with a predefined configuration
 */
export function createKiloAdapter(config = 'balanced', options = {}) {
  const presetConfig = KiloConfigs[config];
  if (!presetConfig) {
    throw new Error(`Unknown Kilo configuration: ${config}. Available: ${Object.keys(KiloConfigs).join(', ')}`);
  }

  return new KiloAdapter({
    ...presetConfig,
    ...options,
    modelStrategies: {
      ...presetConfig.modelStrategies,
      ...(options.modelStrategies || {})
    }
  });
}