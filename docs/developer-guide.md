# Developer Guide

This guide covers Attractor's architecture, extension points, and contribution guidelines for developers.

## Architecture Overview

Attractor is built on three foundational layers that work together to provide a complete AI workflow orchestration system.

### 1. Unified LLM Client (`src/llm/`)

Provider-agnostic interface supporting multiple AI providers through a common API.

**Core Components:**
- **Types** (`types.js`): Message, Request, Response, Usage, StreamEvent definitions
- **Client** (`client.js`): Main client with middleware support and provider routing
- **Model Router** (`model-router.js`): Intelligent model selection based on task complexity
- **Adapters**: Provider-specific implementations
  - `adapters/anthropic.js` - Anthropic Messages API
  - `adapters/kilo.js` - Kilo Gateway (100+ models)
  - `adapters/gateway.js` - Generic gateway adapter

**Key Features:**
- Native API usage (no compatibility shims)
- Streaming and completion modes
- Tool calling support
- Automatic prompt caching
- Cost tracking and budget management
- Smart model routing

### 2. Coding Agent Loop (`src/agent/`)

Autonomous agentic session management with tool execution and LLM coordination.

**Core Components:**
- **Session** (`session.js`): Main agentic loop implementation
- **Turn Management**: UserTurn, AssistantTurn, ToolResultsTurn, SystemTurn, SteeringTurn
- **Tool Integration**: File operations, code execution, external tool calls
- **Context Management**: Conversation history and state management

**Key Features:**
- Provider-aligned toolsets
- Configurable reasoning effort and timeouts
- Concurrent tool execution
- Loop detection and prevention
- Output truncation with head/tail split
- Real-time event streaming
- Mid-execution steering capabilities

### 3. Pipeline Orchestration (`src/pipeline/`)

DOT-based workflow engine that parses and executes directed graph workflows.

**Core Components:**
- **Parser** (`parser.js`): Full Graphviz DOT subset parser with BNF grammar
- **Engine** (`engine.js`): Graph traversal with sophisticated edge selection
- **Context** (`context.js`): Thread-safe key-value store with variable expansion
- **Outcome** (`outcome.js`): Success/failure/retry/skip status handling

**Key Features:**
- Declarative pipeline definition using DOT syntax
- Edge-based routing with conditions, labels, and weights
- Goal gate enforcement for critical path validation
- Retry policies with exponential backoff
- Checkpointing and crash recovery
- Real-time event emission
- Variable expansion and context sharing

### 4. Node Handlers (`src/handlers/`)

Pluggable execution handlers for different node types based on shape.

**Core Components:**
- **Registry** (`registry.js`): Shape-to-handler-type mapping system
- **Basic Handlers** (`basic.js`): Start, Exit, Conditional node implementations
- **Codergen Handler** (`codergen.js`): LLM task execution with model routing
- **Human Handler** (`human.js`): Human-in-the-loop gate implementation

**Handler Types:**
- `start` - Pipeline entry point (shape: Mdiamond)
- `exit` - Pipeline termination (shape: Msquare)
- `codergen` - LLM task execution (shape: box, default)
- `wait.human` - Human approval gates (shape: hexagon)
- `conditional` - Branching logic (shape: diamond)
- `parallel` - Fan-out execution (shape: component)
- `parallel.fan_in` - Fan-in merge (shape: tripleoctagon)
- `tool` - External tool execution (shape: parallelogram)

### 5. Human Interaction System (`src/human/`)

Flexible human-in-the-loop implementation with multiple backend support.

**Core Components:**
- **Interviewer Interface** (`interviewer.js`): Pluggable human interaction backends
- **Console Interviewer**: Terminal-based interaction
- **Web Interviewer**: HTTP-based interaction for web UIs
- **Mock Interviewer**: Automated responses for testing

**Features:**
- Multiple choice questions with accelerator keys
- Configurable timeouts with default responses
- Question type support (yes/no, text input, multiple choice)
- Integration with pipeline context system

### 6. Validation System (`src/validation/`)

Comprehensive rule-based validation for DOT files and pipeline configuration.

**Core Components:**
- **Linter** (`linter.js`): Rule-based validation engine
- **Validation Rules**: 12+ comprehensive validation checks
- **Severity Levels**: Error, Warning, Info with actionable suggestions

**Validation Coverage:**
- Graph structure (start/exit nodes, connectivity)
- Node configuration (handlers, attributes)
- Edge conditions and syntax
- Goal gate validation
- Human gate configuration
- Cycle and deadlock detection
- Orphan node detection
- Handler type validation

### 7. Model Stylesheet System (`src/styling/`)

CSS-like configuration system for AI model selection and parameters.

**Core Components:**
- **Stylesheet Engine** (`stylesheet.js`): CSS parser and rule application
- **Selector Support**: Classes, IDs, shapes, attributes
- **Property System**: Model, provider, reasoning_effort, temperature, etc.
- **Predefined Stylesheets**: Balanced, Performance, Quality configurations

**Features:**
- Familiar CSS syntax for configuration
- Cascading rules with proper specificity
- Runtime style application during execution
- Integration with model router

### 8. Monitoring System (`src/monitoring/`)

Advanced usage tracking and analytics for cost control and performance optimization.

**Core Components:**
- **Usage Tracker** (`usage-tracker.js`): Detailed cost and performance tracking
- **Analytics Engine**: Success rates, efficiency metrics, recommendations
- **Budget Management**: Real-time cost monitoring and limits
- **Reporting**: Automated usage reports and forecasting

## Extension Points

### Creating Custom Handlers

Implement the Handler interface to create custom node types:

```javascript
import { Handler, Outcome } from 'attractor';

class CustomHandler extends Handler {
    async execute(node, context, graph, logsRoot) {
        // Access node attributes
        const config = node.attributes;
        
        // Read/write context
        const inputData = context.get('previous_result');
        
        try {
            // Your custom logic here
            const result = await this.performCustomOperation(config, inputData);
            
            // Update context
            context.set('custom_result', result);
            
            return Outcome.success('Custom operation completed', {
                result: result,
                metadata: { timestamp: Date.now() }
            });
        } catch (error) {
            return Outcome.failure(`Custom operation failed: ${error.message}`, {
                error: error.message,
                config: config
            });
        }
    }
    
    async performCustomOperation(config, inputData) {
        // Implement your custom logic
        return { processed: inputData, config: config };
    }
}

// Register the handler
const attractor = await Attractor.create();
attractor.registerHandler('custom_type', new CustomHandler());
```

### Creating Custom LLM Adapters

Implement the LLM adapter interface for new providers:

```javascript
import { LLMAdapter } from 'attractor/llm';

class CustomProviderAdapter extends LLMAdapter {
    constructor(config) {
        super();
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL;
    }
    
    async complete(request) {
        // Implement completion API
        const response = await this.callProviderAPI(request);
        
        return {
            id: response.id,
            content: response.text,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.total_tokens
            },
            finishReason: response.finish_reason
        };
    }
    
    async *stream(request) {
        // Implement streaming API
        const stream = await this.callProviderStreamAPI(request);
        
        for await (const chunk of stream) {
            yield {
                type: 'content',
                content: chunk.text,
                usage: chunk.usage
            };
        }
    }
    
    async callProviderAPI(request) {
        // Your provider-specific HTTP calls
    }
}

// Register the adapter
const client = await Client.create();
client.registerAdapter('custom_provider', new CustomProviderAdapter({
    apiKey: process.env.CUSTOM_API_KEY,
    baseURL: 'https://api.customprovider.com'
}));
```

### Creating Custom Interviewers

Implement custom human interaction backends:

```javascript
import { Interviewer } from 'attractor/human';

class SlackInterviewer extends Interviewer {
    constructor(config) {
        super();
        this.slackClient = new SlackWebClient(config.token);
        this.channelId = config.channelId;
    }
    
    async ask(question) {
        // Send question to Slack
        const message = await this.slackClient.chat.postMessage({
            channel: this.channelId,
            text: question.question,
            blocks: this.formatQuestionBlocks(question)
        });
        
        // Wait for response
        return new Promise((resolve) => {
            this.slackClient.events.on('message', (event) => {
                if (event.channel === this.channelId && 
                    event.thread_ts === message.ts) {
                    resolve(this.parseAnswer(event.text, question));
                }
            });
        });
    }
    
    formatQuestionBlocks(question) {
        // Format question as Slack blocks
    }
    
    parseAnswer(text, question) {
        // Parse Slack response into answer
    }
}

// Use custom interviewer
const attractor = await Attractor.create({
    human: {
        interviewer: new SlackInterviewer({
            token: process.env.SLACK_TOKEN,
            channelId: process.env.SLACK_CHANNEL
        })
    }
});
```

## Testing

### Unit Testing

Test individual components in isolation:

```javascript
import { describe, it, expect } from 'vitest';
import { Parser } from '../src/pipeline/parser.js';

describe('DOT Parser', () => {
    it('should parse simple graph', async () => {
        const parser = new Parser();
        const dot = `
            digraph Test {
                start [shape=Mdiamond]
                exit [shape=Msquare]
                start -> exit
            }
        `;
        
        const graph = await parser.parse(dot);
        
        expect(graph.nodes).toHaveLength(2);
        expect(graph.edges).toHaveLength(1);
    });
});
```

### Integration Testing

Test complete workflows:

```javascript
import { Attractor } from '../src/index.js';

describe('Pipeline Execution', () => {
    it('should execute simple workflow', async () => {
        const attractor = await Attractor.create({
            llm: { simulation: true }  // Use mock LLM
        });
        
        const result = await attractor.run('./test/fixtures/simple.dot');
        
        expect(result.success).toBe(true);
        expect(result.finalOutcome.status).toBe('success');
    });
});
```

### Mock Testing

Use simulation mode for testing without API calls:

```javascript
const attractor = await Attractor.create({
    llm: {
        simulation: true,
        simulationResponses: {
            'analyze_code': 'Code analysis complete',
            'generate_tests': 'Test cases generated'
        }
    },
    human: {
        interviewer: new MockInterviewer({
            'review_gate': 'approve',
            'deployment_gate': 'deploy'
        })
    }
});
```

## Contributing

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/strongdm/attractor.git
cd attractor
```

2. **Install dependencies**
```bash
npm install
```

3. **Run tests**
```bash
npm test
```

4. **Run examples**
```bash
# Basic example
node examples/demo.js

# With Kilo integration  
export KILO_API_KEY="your-key"
node run-with-kilo.js examples/simple-linear.dot
```

### Code Style

- Use ES modules (`import`/`export`)
- Follow ESLint configuration
- Write JSDoc comments for public APIs
- Use TypeScript-style type annotations in comments
- Prefer async/await over Promises

### Pull Request Guidelines

1. **Create focused PRs** that address single features or fixes
2. **Add tests** for new functionality
3. **Update documentation** for user-facing changes
4. **Follow commit message format**: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Scope: `llm`, `pipeline`, `handlers`, `human`, `validation`, etc.

### Architecture Principles

**Follow the specification's design principles:**

- **Declarative pipelines** over imperative scripts
- **Pluggable handlers** for extensibility
- **Edge-based routing** for sophisticated control flow
- **Provider-agnostic** LLM integration
- **Event-driven** architecture for observability
- **Validation-first** approach to prevent runtime errors

### Performance Considerations

- **Lazy loading** - Load components only when needed
- **Efficient parsing** - Cache parsed DOT graphs when possible
- **Memory management** - Clean up resources in long-running workflows
- **Concurrent execution** - Support parallel node execution where safe
- **Rate limiting** - Respect API provider rate limits

### Security Guidelines

- **Input validation** - Validate all external inputs
- **Safe evaluation** - Use secure expression evaluation for conditions
- **Credential management** - Use environment variables, never hardcode secrets
- **Audit logging** - Log security-relevant events
- **Principle of least privilege** - Minimize required permissions

## API Design Patterns

### Event-Driven Architecture

All major operations emit events for observability:

```javascript
// Pipeline events
attractor.on('pipeline_start', handler);
attractor.on('pipeline_complete', handler);

// Node events  
attractor.on('node_execution_start', handler);
attractor.on('node_execution_success', handler);
attractor.on('node_execution_failure', handler);

// System events
attractor.on('checkpoint_saved', handler);
attractor.on('context_updated', handler);
```

### Builder Pattern

Use fluent APIs for configuration:

```javascript
const attractor = await Attractor.create()
    .withProvider('kilo')
    .withStylesheet(PredefinedStylesheets.balanced())
    .withValidation(true)
    .withCheckpointing('./checkpoints')
    .build();
```

### Plugin Architecture

Support extensibility through plugin registration:

```javascript
// Handler plugins
attractor.registerHandler('custom_type', new CustomHandler());

// LLM adapter plugins
attractor.registerAdapter('custom_provider', new CustomAdapter());

// Interviewer plugins
attractor.registerInterviewer('custom_ui', new CustomInterviewer());
```

## Debugging

### Debug Mode

Enable verbose logging:

```javascript
const attractor = await Attractor.create({
    engine: {
        logLevel: 'debug',
        verbose: true
    }
});
```

### Event Tracing

Track execution flow:

```javascript
attractor.on('*', (eventName, data) => {
    console.log(`Event: ${eventName}`, data);
});
```

### Context Inspection

Monitor context changes:

```javascript
attractor.on('context_updated', ({ key, value, nodeId }) => {
    console.log(`Context[${key}] = ${JSON.stringify(value)} (from ${nodeId})`);
});
```

### Checkpoint Analysis

Examine saved state:

```javascript
import { CheckpointManager } from 'attractor/pipeline';

const manager = new CheckpointManager('./checkpoints');
const checkpoint = await manager.load('pipeline-abc123.json');
console.log('Saved context:', checkpoint.context);
console.log('Execution path:', checkpoint.executionPath);
```

This developer guide provides the foundation for understanding, extending, and contributing to Attractor. The modular architecture and extensive plugin system make it easy to customize for specific use cases while maintaining compatibility with the core specification.