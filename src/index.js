/**
 * Attractor - DOT-based pipeline runner for AI workflows
 */

export { Client as LLMClient, SDKError } from './llm/client.js';
export { 
  Message, 
  Request, 
  Response, 
  ToolDefinition, 
  ToolCall, 
  ToolResult,
  Role,
  ContentKind,
  Usage
} from './llm/types.js';

export { AnthropicAdapter } from './llm/adapters/anthropic.js';
export { 
  KiloAdapter, 
  KiloConfigs, 
  KiloModels, 
  createKiloAdapter 
} from './llm/adapters/kilo.js';

export {
  ModelRouter,
  createModelRouter,
  TaskHints
} from './llm/model-router.js';

export {
  UsageTracker,
  UsageReporter
} from './monitoring/usage-tracker.js';

export { 
  Session,
  SessionConfig,
  SessionState,
  SessionEventType,
  UserTurn,
  AssistantTurn,
  ToolResultsTurn,
  SystemTurn,
  SteeringTurn
} from './agent/session.js';

export { 
  DOTParser,
  ParseError,
  Node,
  Edge,
  Graph
} from './pipeline/parser.js';

export { Context } from './pipeline/context.js';

export { 
  Outcome,
  StageStatus
} from './pipeline/outcome.js';

export { OutputExtractor } from './pipeline/output-extractor.js';

export {
  AttractorError,
  ValidationError,
  WorkflowError,
  ExecutionError,
  LLMError,
  ProviderError,
  TimeoutError,
  CheckpointError,
  HandlerError,
  ConfigurationError
} from './pipeline/errors.js';

export { PipelineEngine } from './pipeline/engine.js';

export { 
  HandlerRegistry,
  Handler,
  SHAPE_TO_TYPE
} from './handlers/registry.js';

export {
  StartHandler,
  ExitHandler,
  ConditionalHandler
} from './handlers/basic.js';

export {
  CodergenHandler,
  CodergenBackend,
  SessionBackend
} from './handlers/codergen.js';

export { WaitForHumanHandler } from './handlers/human.js';

export {
  ToolHandler
} from './handlers/tool.js';

export {
  CommandValidator,
  DEFAULT_ALLOWED_COMMANDS,
  DEFAULT_BLOCKED_PATTERNS
} from './handlers/command-validator.js';

export {
  ParallelHandler
} from './handlers/parallel.js';

export {
  FanInHandler
} from './handlers/fanin.js';

export {
  MCPHandler
} from './handlers/mcp.js';

export {
  Interviewer,
  ConsoleInterviewer,
  WebInterviewer,
  Question,
  Option,
  Choice,
  Answer,
  QuestionType,
  AcceleratorParser
} from './human/interviewer.js';

export {
  PipelineLinter,
  ValidationResult,
  ValidationMessage,
  Severity
} from './validation/linter.js';

export {
  ModelStylesheet,
  StyleRule,
  StylesheetApplicator,
  PredefinedStylesheets
} from './styling/stylesheet.js';

export { DirectoryWorkflowLoader } from './workflow/directory-loader.js';

export { StackManagerLoopHandler } from './handlers/stack-manager-loop.js';

export { MCPClient } from './mcp/client.js';

// Import classes for internal use
import { HandlerRegistry } from './handlers/registry.js';
import { PipelineEngine } from './pipeline/engine.js';

// Main Attractor class - the primary interface
export class Attractor {
  constructor(options = {}) {
    this.handlerRegistry = new HandlerRegistry();
    this.engine = new PipelineEngine(this.handlerRegistry, options.engine || {});
    this.llmClient = null;
  }

  static async create(options = {}) {
    const attractor = new Attractor(options);
    await attractor._setupDefaultHandlers();
    
    // Initialize LLM client if not provided
    let llmClient = null;
    if (!options.llmClient) {
      const { Client } = await import('./llm/client.js');
      const client = await Client.fromEnv();
      // Only use client if it has valid providers
      if (client.providers && Object.keys(client.providers).length > 0) {
        llmClient = client;
      }
    } else {
      llmClient = options.llmClient;
    }
    
    attractor.llmClient = llmClient;
    
    // Setup codergen handler with LLM backend
    // Use simulation mode if no valid client is available
    const { CodergenHandler, SessionBackend } = await import('./handlers/codergen.js');
    
    if (llmClient) {
      const { Session, SessionConfig } = await import('./agent/session.js');
      
      // Get the default model from the LLM client if available
      let defaultModel = 'claude-sonnet-4.5';
      const providerName = llmClient.default_provider;
      if (providerName && llmClient.providers?.[providerName]?.default_model) {
        defaultModel = llmClient.providers[providerName].default_model;
      }
      
      // Create provider profile based on available client
      const providerId = providerName || 'anthropic';
      const providerProfile = {
        id: providerId,
        model: defaultModel,
        buildSystemPrompt: async () => 'You are a helpful coding assistant.',
        tools: () => [],
        providerOptions: () => ({}),
        supportsParallelToolCalls: false,
        toolRegistry: { get: () => null }
      };
      
      const executionEnv = {
        workingDirectory: () => process.cwd(),
        platform: () => process.platform
      };
      
      const session = new Session(
        providerProfile,
        executionEnv,
        new SessionConfig(),
        llmClient
      );
      
      const backend = new SessionBackend(session);
      attractor.handlerRegistry.register('codergen', new CodergenHandler(backend));
    } else {
      // No LLM client - use simulation mode
      attractor.handlerRegistry.register('codergen', new CodergenHandler(null));
    }
    
    return attractor;
  }

  async _setupDefaultHandlers() {
    const { StartHandler, ExitHandler, ConditionalHandler } = await import('./handlers/basic.js');
    const { CodergenHandler } = await import('./handlers/codergen.js');
    const { WaitForHumanHandler } = await import('./handlers/human.js');
    const { ToolHandler } = await import('./handlers/tool.js');
    const { ParallelHandler } = await import('./handlers/parallel.js');
    const { FanInHandler } = await import('./handlers/fanin.js');
    const { StackManagerLoopHandler } = await import('./handlers/stack-manager-loop.js');
    const { MCPHandler } = await import('./handlers/mcp.js');
    const { FilesystemHandler } = await import('./handlers/filesystem.js');
    const { MCPClient } = await import('./mcp/client.js');
    
    // Create MCP client and load configuration
    const mcpClient = new MCPClient();
    await mcpClient.loadConfig();
    
    this.handlerRegistry.register('start', new StartHandler());
    this.handlerRegistry.register('exit', new ExitHandler());
    this.handlerRegistry.register('conditional', new ConditionalHandler());
    this.handlerRegistry.register('wait.human', new WaitForHumanHandler());
    this.handlerRegistry.register('tool', new ToolHandler());
    this.handlerRegistry.register('parallel', new ParallelHandler(this.handlerRegistry));
    this.handlerRegistry.register('parallel.fan_in', new FanInHandler());
    this.handlerRegistry.register('stack.manager_loop', new StackManagerLoopHandler());
    this.handlerRegistry.register('mcp', new MCPHandler(mcpClient));
    this.handlerRegistry.register('filesystem', new FilesystemHandler());
    
    // Store MCP client for cleanup
    this.mcpClient = mcpClient;
    
    // Set codergen as default for untyped nodes
    this.handlerRegistry.setDefault(new CodergenHandler());
  }

  async runFromString(dotText, options = {}) {
    try {
      return await this.engine.runFromString(dotText, options);
    } finally {
      if (this.mcpClient) {
        await this.mcpClient.cleanup();
      }
    }
  }

  async run(dotFilePath, options = {}) {
    try {
      return await this.engine.run(dotFilePath, options);
    } finally {
      // Cleanup MCP servers after pipeline completes
      if (this.mcpClient) {
        await this.mcpClient.cleanup();
      }
    }
  }

  async resume(runId, options = {}) {
    try {
      return await this.engine.resume(runId, options);
    } finally {
      if (this.mcpClient) {
        await this.mcpClient.cleanup();
      }
    }
  }

  static async listCheckpoints(options = {}) {
    const logsRoot = options.logsRoot || './logs';
    return await PipelineEngine.listCheckpoints(logsRoot);
  }

  on(event, listener) {
    return this.engine.on(event, listener);
  }

  registerHandler(type, handler) {
    this.handlerRegistry.register(type, handler);
  }
}