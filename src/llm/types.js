/**
 * Core types for the Unified LLM Client
 */

// Roles for conversation messages
export const Role = {
  SYSTEM: 'system',
  USER: 'user', 
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  DEVELOPER: 'developer'
};

// Content types for multimodal messages
export const ContentKind = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  THINKING: 'thinking',
  REDACTED_THINKING: 'redacted_thinking'
};

// Finish reasons
export const FinishReasonType = {
  STOP: 'stop',
  LENGTH: 'length', 
  TOOL_CALLS: 'tool_calls',
  CONTENT_FILTER: 'content_filter',
  ERROR: 'error',
  OTHER: 'other'
};

// Stream event types
export const StreamEventType = {
  STREAM_START: 'stream_start',
  TEXT_START: 'text_start',
  TEXT_DELTA: 'text_delta',
  TEXT_END: 'text_end',
  REASONING_START: 'reasoning_start',
  REASONING_DELTA: 'reasoning_delta',
  REASONING_END: 'reasoning_end',
  TOOL_CALL_START: 'tool_call_start',
  TOOL_CALL_DELTA: 'tool_call_delta',
  TOOL_CALL_END: 'tool_call_end',
  FINISH: 'finish',
  ERROR: 'error',
  PROVIDER_EVENT: 'provider_event'
};

export class ContentPart {
  constructor(kind, data = {}) {
    this.kind = kind;
    this.text = data.text || null;
    this.image = data.image || null;
    this.audio = data.audio || null;
    this.document = data.document || null;
    this.tool_call = data.tool_call || null;
    this.tool_result = data.tool_result || null;
    this.thinking = data.thinking || null;
  }

  static text(content) {
    return new ContentPart(ContentKind.TEXT, { text: content });
  }

  static image(data) {
    return new ContentPart(ContentKind.IMAGE, { image: data });
  }

  static toolCall(data) {
    return new ContentPart(ContentKind.TOOL_CALL, { tool_call: data });
  }

  static toolResult(data) {
    return new ContentPart(ContentKind.TOOL_RESULT, { tool_result: data });
  }

  static thinking(text) {
    return new ContentPart(ContentKind.THINKING, { thinking: { text } });
  }
}

export class Message {
  constructor(role, content = [], options = {}) {
    this.role = role;
    this.content = Array.isArray(content) ? content : [ContentPart.text(content)];
    this.name = options.name || null;
    this.tool_call_id = options.tool_call_id || null;
  }

  get text() {
    return this.content
      .filter(part => part.kind === ContentKind.TEXT)
      .map(part => part.text)
      .join('');
  }

  static system(content) {
    return new Message(Role.SYSTEM, content);
  }

  static user(content) {
    return new Message(Role.USER, content);
  }

  static assistant(content, options = {}) {
    return new Message(Role.ASSISTANT, content, options);
  }

  static toolResult(toolCallId, content, isError = false) {
    const toolResultData = {
      tool_call_id: toolCallId,
      content,
      is_error: isError
    };
    return new Message(Role.TOOL, [ContentPart.toolResult(toolResultData)], {
      tool_call_id: toolCallId
    });
  }
}

export class FinishReason {
  constructor(reason, raw = null) {
    this.reason = reason;
    this.raw = raw;
  }
}

export class Usage {
  constructor(data = {}) {
    this.input_tokens = data.input_tokens || 0;
    this.output_tokens = data.output_tokens || 0;
    this.total_tokens = data.total_tokens || this.input_tokens + this.output_tokens;
    this.reasoning_tokens = data.reasoning_tokens || null;
    this.cache_read_tokens = data.cache_read_tokens || null;
    this.cache_write_tokens = data.cache_write_tokens || null;
    this.raw = data.raw || null;
  }

  add(other) {
    return new Usage({
      input_tokens: this.input_tokens + other.input_tokens,
      output_tokens: this.output_tokens + other.output_tokens,
      total_tokens: this.total_tokens + other.total_tokens,
      reasoning_tokens: this._addOptional(this.reasoning_tokens, other.reasoning_tokens),
      cache_read_tokens: this._addOptional(this.cache_read_tokens, other.cache_read_tokens),
      cache_write_tokens: this._addOptional(this.cache_write_tokens, other.cache_write_tokens)
    });
  }

  _addOptional(a, b) {
    if (a !== null && b !== null) return a + b;
    if (a !== null) return a;
    if (b !== null) return b;
    return null;
  }
}

export class Request {
  constructor(options = {}) {
    this.model = options.model;
    this.messages = options.messages || [];
    this.provider = options.provider || null;
    this.tools = options.tools || null;
    this.tool_choice = options.tool_choice || null;
    this.response_format = options.response_format || null;
    this.temperature = options.temperature || null;
    this.top_p = options.top_p || null;
    this.max_tokens = options.max_tokens || null;
    this.stop_sequences = options.stop_sequences || null;
    this.reasoning_effort = options.reasoning_effort || null;
    this.metadata = options.metadata || null;
    this.provider_options = options.provider_options || null;
  }
}

export class Response {
  constructor(data = {}) {
    this.id = data.id;
    this.model = data.model;
    this.provider = data.provider;
    this.message = data.message;
    this.finish_reason = data.finish_reason;
    this.usage = data.usage;
    this.raw = data.raw || null;
    this.warnings = data.warnings || [];
    this.rate_limit = data.rate_limit || null;
  }

  get text() {
    if (!this.message) return '';
    if (typeof this.message === 'string') return this.message;
    if (typeof this.message.text === 'string') return this.message.text;
    return '';
  }

  get tool_calls() {
    if (!this.message) return [];
    // Handle case where message.content is a string or plain object (not an array of parts)
    if (typeof this.message.content === 'string' || !Array.isArray(this.message.content)) return [];
    return this.message.content
      .filter(part => part.kind === ContentKind.TOOL_CALL)
      .map(part => part.tool_call);
  }

  get reasoning() {
    if (!this.message) return null;
    // Handle case where message.content is a string or plain object (not an array of parts)
    if (typeof this.message.content === 'string' || !Array.isArray(this.message.content)) return null;
    return this.message.content
      .filter(part => part.kind === ContentKind.THINKING)
      .map(part => part.thinking.text)
      .join('') || null;
  }
}

export class ToolDefinition {
  constructor(name, description, parameters) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }
}

export class ToolCall {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.arguments = data.arguments;
    this.type = data.type || 'function';
  }
}

export class ToolResult {
  constructor(data = {}) {
    this.tool_call_id = data.tool_call_id;
    this.content = data.content;
    this.is_error = data.is_error || false;
    this.image_data = data.image_data || null;
    this.image_media_type = data.image_media_type || null;
  }
}

export class StreamEvent {
  constructor(type, data = {}) {
    this.type = type;
    this.delta = data.delta || null;
    this.text_id = data.text_id || null;
    this.reasoning_delta = data.reasoning_delta || null;
    this.tool_call = data.tool_call || null;
    this.finish_reason = data.finish_reason || null;
    this.usage = data.usage || null;
    this.response = data.response || null;
    this.error = data.error || null;
    this.raw = data.raw || null;
  }
}