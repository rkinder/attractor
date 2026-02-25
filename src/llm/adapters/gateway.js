/**
 * Custom Gateway Adapter for the Unified LLM Client
 * 
 * This adapter can work with any OpenAI-compatible gateway that provides:
 * - POST /v1/chat/completions endpoint
 * - Standard OpenAI message format
 * - Custom authentication headers
 */

import { ProviderAdapter } from '../client.js';
import { 
  Response, 
  Message, 
  ContentPart, 
  FinishReason, 
  Usage, 
  Role,
  ContentKind,
  FinishReasonType
} from '../types.js';

export class GatewayAdapter extends ProviderAdapter {
  constructor(options = {}) {
    super('gateway');
    
    // Gateway configuration
    this.base_url = options.base_url || 'https://your-gateway.com';
    this.api_key = options.api_key || process.env.GATEWAY_API_KEY;
    this.default_model = options.default_model || 'gpt-4';
    
    // Custom headers for your gateway
    this.auth_header = options.auth_header || 'Authorization';
    this.auth_prefix = options.auth_prefix || 'Bearer ';
    this.custom_headers = options.custom_headers || {};
    
    this.timeout = options.timeout || 30000;
  }

  async initialize() {
    if (!this.api_key) {
      throw new Error('Gateway API key is required');
    }
  }

  async complete(request) {
    const gatewayRequest = this._buildGatewayRequest(request);
    
    const response = await fetch(`${this.base_url}/v1/chat/completions`, {
      method: 'POST',
      headers: this._getHeaders(request),
      body: JSON.stringify(gatewayRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return this._parseResponse(data, request);
  }

  _buildGatewayRequest(request) {
    // Convert to OpenAI-compatible format
    return {
      model: request.model || this.default_model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      stream: false
    };
  }

  _getHeaders(request) {
    return {
      'Content-Type': 'application/json',
      [this.auth_header]: `${this.auth_prefix}${this.api_key}`,
      ...this.custom_headers,
      ...request.headers
    };
  }

  _parseResponse(data, request) {
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No choices returned from gateway');
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
      provider: 'gateway'
    });
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

  supportsStreaming() {
    return false; // Can be implemented if your gateway supports streaming
  }

  async *stream(request) {
    throw new Error('Streaming not implemented for gateway adapter');
  }
}

/**
 * Common gateway configurations
 */
export const GatewayConfigs = {
  // Example: Generic OpenAI-compatible gateway
  generic: (baseUrl, apiKey) => ({
    base_url: baseUrl,
    api_key: apiKey,
    default_model: 'gpt-4'
  }),
  
  // Example: Azure OpenAI
  azure: (endpoint, apiKey, deploymentName) => ({
    base_url: `https://${endpoint}.openai.azure.com/openai/deployments/${deploymentName}`,
    api_key: apiKey,
    auth_header: 'api-key',
    auth_prefix: '',
    default_model: deploymentName
  }),
  
  // Example: Custom enterprise gateway
  enterprise: (baseUrl, token, orgId) => ({
    base_url: baseUrl,
    api_key: token,
    auth_header: 'X-API-Token',
    auth_prefix: '',
    custom_headers: {
      'X-Organization-ID': orgId,
      'X-Client': 'attractor'
    }
  })
};