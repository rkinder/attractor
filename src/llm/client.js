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

  static async _loadEnvFile() {
    // Only load if env vars aren't already set
    if (process.env.KILO_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
      return;
    }
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      // Try multiple locations for .env file
      const envPaths = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '..', '.env'),
        path.resolve('.env')
      ];
      
      for (const envPath of envPaths) {
        try {
          const content = await fs.readFile(envPath, 'utf-8');
          const lines = content.split('\n');
          
          for (const line of lines) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
              const key = trimmed.slice(0, eqIndex).trim();
              let value = trimmed.slice(eqIndex + 1).trim();
              
              // Remove quotes if present
              if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
              
              // Only set if not already defined
              if (!process.env[key]) {
                process.env[key] = value;
              }
            }
          }
        } catch {
          // File doesn't exist, try next path
        }
      }
    } catch (error) {
      // Silently ignore - .env loading is optional
    }
  }

  static async fromEnv() {
    // Load .env file if present
    await this._loadEnvFile();
    
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
        
        // Use, or user-specified balanced configuration by default config
        const config = process.env.KILO_CONFIG || 'balanced';
        providers.kilo = createKiloAdapter(config, {
          api_key: process.env.KILO_API_KEY,
          organization_id: process.env.KILO_ORG_ID,
          task_id: process.env.KILO_TASK_ID,
          default_model: process.env.KILO_MODEL || undefined
        });
        
        // Kilo gets highest priority since it provides access to multiple providers
        defaultProvider = 'kilo';
      } catch (error) {
        console.warn('Kilo adapter failed to load:', error.message);
      }
    }

    // Check for LM Studio (local LLM)
    if (process.env.LMSTUDIO_API_KEY !== undefined || process.env.LMSTUDIO_MODEL) {
      try {
        const { LMStudioAdapter, createLMStudioAdapter } = await import('./adapters/lmstudio.js');
        
        providers.lmstudio = createLMStudioAdapter({
          base_url: process.env.LMSTUDIO_BASE_URL || 'http://172.24.144.1:1234/v1',
          model: process.env.LMSTUDIO_MODEL || 'local-model',
          api_key: process.env.LMSTUDIO_API_KEY || 'lm-studio'
        });
        
        if (!defaultProvider) defaultProvider = 'lmstudio';
      } catch (error) {
        console.warn('LM Studio adapter failed to load:', error.message);
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