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
    if (!options.llmClient) {
      const { Client } = await import('./llm/client.js');
      attractor.llmClient = await Client.fromEnv();
    } else {
      attractor.llmClient = options.llmClient;
    }
    
    // Setup codergen handler with LLM backend if not provided
    if (!attractor.handlerRegistry.has('codergen')) {
      const { CodergenHandler, SessionBackend } = await import('./handlers/codergen.js');
      const { Session, SessionConfig } = await import('./agent/session.js');
      
      // Create a simple provider profile for demonstration
      const providerProfile = {
        id: 'anthropic',
        model: 'claude-opus-4-6',
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
        attractor.llmClient
      );
      
      const backend = new SessionBackend(session);
      attractor.handlerRegistry.register('codergen', new CodergenHandler(backend));
    }
    
    return attractor;
  }

  async _setupDefaultHandlers() {
    const { StartHandler, ExitHandler, ConditionalHandler } = await import('./handlers/basic.js');
    const { CodergenHandler } = await import('./handlers/codergen.js');
    const { WaitForHumanHandler } = await import('./handlers/human.js');
    
    this.handlerRegistry.register('start', new StartHandler());
    this.handlerRegistry.register('exit', new ExitHandler());
    this.handlerRegistry.register('conditional', new ConditionalHandler());
    this.handlerRegistry.register('wait.human', new WaitForHumanHandler());
    
    // Set codergen as default for untyped nodes
    this.handlerRegistry.setDefault(new CodergenHandler());
  }

  async run(dotFilePath, options = {}) {
    return await this.engine.run(dotFilePath, options);
  }

  on(event, listener) {
    return this.engine.on(event, listener);
  }

  registerHandler(type, handler) {
    this.handlerRegistry.register(type, handler);
  }
}