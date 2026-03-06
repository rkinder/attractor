/**
 * LM Studio Adapter for the Unified LLM Client
 * 
 * Provides OpenAI-compatible interface to locally running LM Studio models
 * Base URL: http://localhost:1234/v1 (default LM Studio port)
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

export class LMStudioAdapter extends ProviderAdapter {
  constructor(options = {}) {
    super('lmstudio');
    this.api_key = options.api_key || 'lm-studio';  // LM Studio doesn't require API key
    this.base_url = options.base_url || 'http://172.24.144.1:1234/v1';
    this.model = options.model || 'local-model';     // Model name from LM Studio
    this.timeout = options.timeout || 300000;         // Longer timeout for local models
  }

  async initialize() {
    // Test connection to LM Studio
    try {
      const response = await fetch(`${this.base_url}/models`, {
        headers: { 'Authorization': `Bearer ${this.api_key}` }
      });
      
      if (!response.ok) {
        throw new Error(`LM Studio connection failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[LM Studio] Connected. Available models: ${data.data?.map(m => m.id).join(', ') || 'none'}`);
    } catch (error) {
      throw new Error(`Failed to connect to LM Studio: ${error.message}. Make sure LM Studio is running and API is enabled.`);
    }
  }

  async complete(request) {
    const lmStudioRequest = this._buildRequest(request);
    
    const response = await fetch(`${this.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.api_key}`
      },
      body: JSON.stringify(lmStudioRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return this._parseResponse(data, request);
  }

  async *stream(request) {
    const lmStudioRequest = {
      ...this._buildRequest(request),
      stream: true
    };
    
    const response = await fetch(`${this.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.api_key}`
      },
      body: JSON.stringify(lmStudioRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio error (${response.status}): ${errorText}`);
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
            if (data === '[DONE]') {
              yield new StreamEvent(StreamEventType.STREAM_END);
              return;
            }

            try {
              const chunk = JSON.parse(data);
              const parsed = this._parseChunk(chunk);
              if (parsed.content) {
                yield new StreamEvent(StreamEventType.CONTENT, parsed.content, parsed.finishReason);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield new StreamEvent(StreamEventType.STREAM_END);
  }

  _buildRequest(request) {
    return {
      model: this.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || ''
      })),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      stream: false
    };
  }

  _parseResponse(data, request) {
    const choice = data.choices[0];
    const response = new Response();
    
    response.id = data.id || `lm-${Date.now()}`;
    response.object = 'chat.completion';
    response.created = data.created || Math.floor(Date.now() / 1000);
    response.model = data.model || this.model;
    
    if (choice) {
      const message = choice.message;
      const content = message.content || '';
      response.message = { role: message.role || Role.ASSISTANT, text: content };
      response.choices = [{
        index: choice.index || 0,
        message: {
          role: message.role || Role.ASSISTANT,
          content: content,
        },
        finish_reason: this._mapFinishReason(choice.finish_reason)
      }];
    }
    
    if (data.usage) {
      response.usage = new Usage(
        data.usage.prompt_tokens || 0,
        data.usage.completion_tokens || 0,
        data.usage.total_tokens || 0
      );
    } else {
      response.usage = new Usage(0, 0, 0);
    }
    
    return response;
  }

  _parseChunk(chunk) {
    const choice = chunk.choices?.[0];
    if (!choice) return { content: '', finishReason: null };
    
    return {
      content: choice.delta?.content || '',
      finishReason: choice.finish_reason ? this._mapFinishReason(choice.finish_reason) : null
    };
  }

  _mapFinishReason(reason) {
    const mapping = {
      'stop': FinishReasonType.STOP,
      'length': FinishReasonType.LENGTH,
      'content_filter': FinishReasonType.CONTENT_FILTER,
      'null': null
    };
    return mapping[reason] || FinishReasonType.STOP;
  }
}

export function createLMStudioAdapter(options = {}) {
  return new LMStudioAdapter(options);
}
