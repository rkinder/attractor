/**
 * Core LLM Client implementation
 */

import { Request, Response } from './types.js';

export class SDKError extends Error {
  constructor(message, code = null, provider = null, raw = null) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.provider = provider;
    this.raw = raw;
  }
}

export class Client {
  constructor(options = {}) {
    this.providers = options.providers || {};
    this.default_provider = options.default_provider || null;
    this.middleware = options.middleware || [];
  }

  static async fromEnv() {
    const providers = {};
    let defaultProvider = null;

    // Check for OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const { OpenAIAdapter } = await import('./adapters/openai.js');
        providers.openai = new OpenAIAdapter({
          api_key: process.env.OPENAI_API_KEY,
          base_url: process.env.OPENAI_BASE_URL,
          org_id: process.env.OPENAI_ORG_ID,
          project_id: process.env.OPENAI_PROJECT_ID
        });
        if (!defaultProvider) defaultProvider = 'openai';
      } catch (error) {
        // OpenAI adapter not available, skip
      }
    }

    // Check for Kilo Gateway (highest priority due to multi-provider support)
    if (process.env.KILO_API_KEY) {
      try {
        const { KiloAdapter, createKiloAdapter } = await import('./adapters/kilo.js');
        
        // Use balanced configuration by default, or user-specified config
        const config = process.env.KILO_CONFIG || 'balanced';
        providers.kilo = createKiloAdapter(config, {
          api_key: process.env.KILO_API_KEY,
          organization_id: process.env.KILO_ORG_ID,
          task_id: process.env.KILO_TASK_ID
        });
        
        // Kilo gets highest priority since it provides access to multiple providers
        defaultProvider = 'kilo';
      } catch (error) {
        console.warn('Kilo adapter failed to load:', error.message);
      }
    }

    // Check for Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { AnthropicAdapter } = await import('./adapters/anthropic.js');
        providers.anthropic = new AnthropicAdapter({
          api_key: process.env.ANTHROPIC_API_KEY,
          base_url: process.env.ANTHROPIC_BASE_URL
        });
        if (!defaultProvider) defaultProvider = 'anthropic';
      } catch (error) {
        // Anthropic adapter not available, skip
      }
    }

    // Check for Gemini
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      try {
        const { GeminiAdapter } = await import('./adapters/gemini.js');
        providers.gemini = new GeminiAdapter({
          api_key: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
          base_url: process.env.GEMINI_BASE_URL
        });
        if (!defaultProvider) defaultProvider = 'gemini';
      } catch (error) {
        // Gemini adapter not available, skip
      }
    }

    return new Client({ providers, default_provider: defaultProvider });
  }

  async complete(request) {
    const provider = this._resolveProvider(request);
    const adapter = this.providers[provider];

    if (!adapter) {
      throw new SDKError(`Provider '${provider}' is not registered`);
    }

    // Apply middleware (request phase)
    let processedRequest = request;
    for (const middleware of this.middleware) {
      processedRequest = await this._applyMiddleware(middleware, processedRequest, adapter);
    }

    try {
      let response = await adapter.complete(processedRequest);
      
      // Apply middleware (response phase) in reverse order
      for (const middleware of [...this.middleware].reverse()) {
        if (middleware.onResponse) {
          response = await middleware.onResponse(response, processedRequest);
        }
      }

      return response;
    } catch (error) {
      throw new SDKError(`Provider '${provider}' error: ${error.message}`, null, provider, error);
    }
  }

  async stream(request) {
    const provider = this._resolveProvider(request);
    const adapter = this.providers[provider];

    if (!adapter) {
      throw new SDKError(`Provider '${provider}' is not registered`);
    }

    // Apply middleware for streaming
    let processedRequest = request;
    for (const middleware of this.middleware) {
      processedRequest = await this._applyMiddleware(middleware, processedRequest, adapter);
    }

    try {
      const stream = await adapter.stream(processedRequest);
      
      // Apply streaming middleware
      return this._applyStreamingMiddleware(stream, processedRequest);
    } catch (error) {
      throw new SDKError(`Provider '${provider}' error: ${error.message}`, null, provider, error);
    }
  }

  _resolveProvider(request) {
    if (request.provider) {
      return request.provider;
    }
    if (this.default_provider) {
      return this.default_provider;
    }
    throw new SDKError('No provider specified and no default provider set');
  }

  async _applyMiddleware(middleware, request, adapter) {
    if (typeof middleware === 'function') {
      return await middleware(request, async (req) => req);
    }
    if (middleware.onRequest) {
      return await middleware.onRequest(request, adapter);
    }
    return request;
  }

  async *_applyStreamingMiddleware(stream, request) {
    for (const middleware of [...this.middleware].reverse()) {
      if (middleware.onStream) {
        stream = middleware.onStream(stream, request);
      }
    }

    for await (const event of stream) {
      yield event;
    }
  }

  close() {
    for (const adapter of Object.values(this.providers)) {
      if (adapter.close) {
        adapter.close();
      }
    }
  }
}

// Provider Adapter interface (for reference)
export class ProviderAdapter {
  constructor(name) {
    this.name = name;
  }

  async initialize() {
    // Override in subclasses
  }

  async complete(request) {
    throw new Error('Not implemented');
  }

  async stream(request) {
    throw new Error('Not implemented');
  }

  supportsToolChoice(mode) {
    return false; // Override in subclasses
  }

  close() {
    // Override in subclasses if needed
  }
}