/**
 * Anthropic provider adapter for the Unified LLM Client
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

export class AnthropicAdapter extends ProviderAdapter {
  constructor(options = {}) {
    super('anthropic');
    this.api_key = options.api_key;
    this.base_url = options.base_url || 'https://api.anthropic.com';
    this.default_headers = options.default_headers || {};
    this.timeout = options.timeout || 30000;
  }

  async initialize() {
    if (!this.api_key) {
      throw new Error('Anthropic API key is required');
    }
  }

  async complete(request) {
    const anthropicRequest = this._buildAnthropicRequest(request);
    const response = await this._makeRequest('/v1/messages', anthropicRequest);
    return this._parseResponse(response, request);
  }

  async *stream(request) {
    const anthropicRequest = { 
      ...this._buildAnthropicRequest(request), 
      stream: true 
    };
    
    const response = await fetch(`${this.base_url}/v1/messages`, {
      method: 'POST',
      headers: this._getHeaders(request),
      body: JSON.stringify(anthropicRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
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
  }

  _buildAnthropicRequest(request) {
    const { messages, systemMessage } = this._convertMessages(request.messages);
    
    const anthropicRequest = {
      model: request.model,
      messages,
      max_tokens: request.max_tokens || 4000,
    };

    if (systemMessage) {
      anthropicRequest.system = systemMessage;
    }

    if (request.temperature !== null) {
      anthropicRequest.temperature = request.temperature;
    }

    if (request.top_p !== null) {
      anthropicRequest.top_p = request.top_p;
    }

    if (request.stop_sequences) {
      anthropicRequest.stop_sequences = request.stop_sequences;
    }

    if (request.tools && request.tools.length > 0) {
      anthropicRequest.tools = request.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters
      }));

      if (request.tool_choice && request.tool_choice !== 'auto') {
        if (request.tool_choice === 'required' || request.tool_choice === 'any') {
          anthropicRequest.tool_choice = { type: 'any' };
        } else if (typeof request.tool_choice === 'object') {
          anthropicRequest.tool_choice = {
            type: 'tool',
            name: request.tool_choice.name
          };
        }
      }
    }

    // Handle provider-specific options
    if (request.provider_options?.anthropic) {
      const options = request.provider_options.anthropic;
      
      if (options.thinking) {
        anthropicRequest.thinking = options.thinking;
      }
    }

    return anthropicRequest;
  }

  _convertMessages(messages) {
    const anthropicMessages = [];
    let systemMessage = null;

    for (const message of messages) {
      if (message.role === Role.SYSTEM) {
        systemMessage = message.text;
        continue;
      }

      if (message.role === Role.DEVELOPER) {
        // Merge developer messages into system
        systemMessage = systemMessage ? 
          `${systemMessage}\n\n${message.text}` : 
          message.text;
        continue;
      }

      if (message.role === Role.TOOL) {
        // Tool results go into user messages
        const lastMessage = anthropicMessages[anthropicMessages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
          lastMessage.content.push({
            type: 'tool_result',
            tool_use_id: message.tool_call_id,
            content: message.content[0].tool_result.content,
            is_error: message.content[0].tool_result.is_error
          });
        } else {
          anthropicMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: message.tool_call_id,
              content: message.content[0].tool_result.content,
              is_error: message.content[0].tool_result.is_error
            }]
          });
        }
        continue;
      }

      const anthropicMessage = {
        role: message.role === Role.USER ? 'user' : 'assistant',
        content: []
      };

      for (const part of message.content) {
        if (part.kind === ContentKind.TEXT) {
          anthropicMessage.content.push({
            type: 'text',
            text: part.text
          });
        } else if (part.kind === ContentKind.IMAGE) {
          if (part.image.url) {
            anthropicMessage.content.push({
              type: 'image',
              source: { type: 'url', url: part.image.url }
            });
          } else if (part.image.data) {
            anthropicMessage.content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: part.image.media_type || 'image/png',
                data: Buffer.from(part.image.data).toString('base64')
              }
            });
          }
        } else if (part.kind === ContentKind.TOOL_CALL) {
          anthropicMessage.content.push({
            type: 'tool_use',
            id: part.tool_call.id,
            name: part.tool_call.name,
            input: part.tool_call.arguments
          });
        } else if (part.kind === ContentKind.THINKING) {
          anthropicMessage.content.push({
            type: 'thinking',
            text: part.thinking.text
          });
        }
      }

      anthropicMessages.push(anthropicMessage);
    }

    return { messages: anthropicMessages, systemMessage };
  }

  _parseResponse(response, request) {
    const message = new Message(Role.ASSISTANT);
    
    for (const content of response.content) {
      if (content.type === 'text') {
        message.content.push(ContentPart.text(content.text));
      } else if (content.type === 'tool_use') {
        message.content.push(ContentPart.toolCall({
          id: content.id,
          name: content.name,
          arguments: content.input
        }));
      } else if (content.type === 'thinking') {
        message.content.push(ContentPart.thinking(content.text));
      }
    }

    const finishReason = new FinishReason(
      this._mapFinishReason(response.stop_reason),
      response.stop_reason
    );

    const usage = new Usage({
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_tokens: response.usage.cache_read_input_tokens,
      cache_write_tokens: response.usage.cache_creation_input_tokens
    });

    return new Response({
      id: response.id,
      model: response.model,
      provider: 'anthropic',
      message,
      finish_reason: finishReason,
      usage,
      raw: response
    });
  }

  _mapFinishReason(stopReason) {
    switch (stopReason) {
      case 'end_turn':
      case 'stop_sequence':
        return FinishReasonType.STOP;
      case 'max_tokens':
        return FinishReasonType.LENGTH;
      case 'tool_use':
        return FinishReasonType.TOOL_CALLS;
      default:
        return FinishReasonType.OTHER;
    }
  }

  async *_parseStreamEvent(event) {
    switch (event.type) {
      case 'message_start':
        yield new StreamEvent(StreamEventType.STREAM_START, { raw: event });
        break;
        
      case 'content_block_start':
        if (event.content_block.type === 'text') {
          yield new StreamEvent(StreamEventType.TEXT_START, {
            text_id: event.index,
            raw: event
          });
        } else if (event.content_block.type === 'tool_use') {
          yield new StreamEvent(StreamEventType.TOOL_CALL_START, {
            tool_call: {
              id: event.content_block.id,
              name: event.content_block.name
            },
            raw: event
          });
        }
        break;
        
      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          yield new StreamEvent(StreamEventType.TEXT_DELTA, {
            delta: event.delta.text,
            text_id: event.index,
            raw: event
          });
        } else if (event.delta.type === 'input_json_delta') {
          yield new StreamEvent(StreamEventType.TOOL_CALL_DELTA, {
            tool_call: { arguments: event.delta.partial_json },
            raw: event
          });
        }
        break;
        
      case 'message_delta':
        if (event.delta.stop_reason) {
          const finishReason = new FinishReason(
            this._mapFinishReason(event.delta.stop_reason),
            event.delta.stop_reason
          );
          
          const usage = event.usage ? new Usage({
            input_tokens: event.usage.input_tokens,
            output_tokens: event.usage.output_tokens
          }) : null;

          yield new StreamEvent(StreamEventType.FINISH, {
            finish_reason: finishReason,
            usage,
            raw: event
          });
        }
        break;
    }
  }

  async _makeRequest(endpoint, data) {
    const response = await fetch(`${this.base_url}${endpoint}`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(data)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseData.error?.message || response.statusText}`);
    }

    return responseData;
  }

  _getHeaders(request = null) {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.api_key,
      'anthropic-version': '2023-06-01',
      ...this.default_headers
    };

    // Add beta headers if specified
    if (request?.provider_options?.anthropic?.beta_headers) {
      headers['anthropic-beta'] = request.provider_options.anthropic.beta_headers.join(',');
    }

    return headers;
  }

  supportsToolChoice(mode) {
    return ['auto', 'required', 'any'].includes(mode) || typeof mode === 'object';
  }
}