# API Reference

Complete API documentation for the Attractor workflow orchestration system.

## Attractor Class

The main entry point for creating and running workflows.

### Constructor

```javascript
import { Attractor } from 'attractor';

const attractor = await Attractor.create(options);
```

**Options:**
```javascript
{
  // LLM configuration
  llm: {
    provider: 'anthropic' | 'openai' | 'kilo' | 'gateway',
    model: 'claude-3-5-sonnet-20241022',
    simulation: false,
    enableCaching: true,
    cacheDir: './cache',
    cacheTTL: 3600
  },
  
  // Engine configuration
  engine: {
    enableValidation: true,
    enableCheckpointing: false,
    checkpointDir: './checkpoints',
    enableStylesheet: true,
    stylesheet: 'balanced',
    maxConcurrentNodes: 1,
    logLevel: 'info',
    verbose: false
  },
  
  // Human interaction
  human: {
    interviewer: new ConsoleInterviewer(),
    defaultTimeout: 300000,
    enableMocking: false
  }
}
```

### Methods

#### `run(dotFilePath, options?)`

Execute a workflow from a DOT file.

**Parameters:**
- `dotFilePath` (string): Path to the DOT workflow file
- `options` (object, optional): Execution options

**Returns:** Promise<ExecutionResult>

```javascript
const result = await attractor.run('./my-workflow.dot', {
  context: { 
    project_path: './my-project',
    environment: 'production'
  },
  timeout: 3600000  // 1 hour timeout
});

console.log('Success:', result.success);
console.log('Final outcome:', result.finalOutcome);
```

#### `runFromString(dotContent, options?)`

Execute a workflow from DOT content string.

**Parameters:**
- `dotContent` (string): DOT workflow content
- `options` (object, optional): Execution options

**Returns:** Promise<ExecutionResult>

#### `resume(checkpointPath)`

Resume execution from a checkpoint file.

**Parameters:**
- `checkpointPath` (string): Path to checkpoint file

**Returns:** Promise<ExecutionResult>

#### `validate(dotFilePath)`

Validate a DOT workflow file without executing it.

**Parameters:**
- `dotFilePath` (string): Path to DOT file to validate

**Returns:** Promise<ValidationIssue[]>

```javascript
const issues = await attractor.validate('./workflow.dot');
for (const issue of issues) {
  console.log(`${issue.severity}: ${issue.message}`);
}
```

#### `registerHandler(type, handler)`

Register a custom node handler.

**Parameters:**
- `type` (string): Handler type identifier
- `handler` (Handler): Handler instance implementing the Handler interface

```javascript
import { Handler, Outcome } from 'attractor';

class CustomHandler extends Handler {
  async execute(node, context, graph, logsRoot) {
    // Implementation
    return Outcome.success('Custom operation completed');
  }
}

attractor.registerHandler('custom_type', new CustomHandler());
```

#### Event Methods

##### `on(event, listener)`

Listen for pipeline events.

##### `once(event, listener)`

Listen for a single occurrence of an event.

##### `off(event, listener)`

Remove an event listener.

##### `emit(event, data)`

Emit an event (advanced usage).

## Events

### Pipeline Events

#### `pipeline_start`
Emitted when pipeline execution begins.

**Data:**
```javascript
{
  runId: 'uuid-string',
  dotFile: './path/to/workflow.dot',
  timestamp: 1634567890123,
  context: PipelineContext
}
```

#### `pipeline_complete`
Emitted when pipeline execution finishes.

**Data:**
```javascript
{
  runId: 'uuid-string',
  success: true,
  result: ExecutionResult,
  duration: 45230,  // milliseconds
  timestamp: 1634567935353
}
```

#### `pipeline_error`
Emitted when pipeline execution encounters an error.

**Data:**
```javascript
{
  runId: 'uuid-string',
  error: Error,
  nodeId: 'failed-node',
  timestamp: 1634567890123
}
```

### Node Events

#### `node_execution_start`
Emitted when a node begins execution.

**Data:**
```javascript
{
  runId: 'uuid-string',
  nodeId: 'my-node',
  node: GraphNode,
  timestamp: 1634567890123
}
```

#### `node_execution_success`
Emitted when a node completes successfully.

**Data:**
```javascript
{
  runId: 'uuid-string',
  nodeId: 'my-node',
  outcome: Outcome,
  duration: 5430,
  timestamp: 1634567895553
}
```

#### `node_execution_failure`
Emitted when a node fails.

**Data:**
```javascript
{
  runId: 'uuid-string',
  nodeId: 'my-node',
  outcome: Outcome,
  error: Error,
  willRetry: true,
  timestamp: 1634567890123
}
```

#### `edge_traversed`
Emitted when moving from one node to another.

**Data:**
```javascript
{
  runId: 'uuid-string',
  from: 'node1',
  to: 'node2',
  edge: GraphEdge,
  condition: 'outcome=success',
  timestamp: 1634567890123
}
```

### Context Events

#### `context_updated`
Emitted when pipeline context is modified.

**Data:**
```javascript
{
  runId: 'uuid-string',
  key: 'variable_name',
  value: 'new_value',
  nodeId: 'updating-node',
  timestamp: 1634567890123
}
```

### Checkpoint Events

#### `checkpoint_saved`
Emitted when state is checkpointed.

**Data:**
```javascript
{
  runId: 'uuid-string',
  nodeId: 'current-node',
  checkpointFile: './checkpoints/run-abc123.json',
  timestamp: 1634567890123
}
```

#### `checkpoint_loaded`
Emitted when resuming from checkpoint.

**Data:**
```javascript
{
  runId: 'uuid-string',
  nodeId: 'resume-node',
  checkpointFile: './checkpoints/run-abc123.json',
  timestamp: 1634567890123
}
```

## Core Types

### ExecutionResult

Result object returned by `run()` method.

```javascript
{
  success: boolean,
  runId: string,
  finalOutcome: Outcome,
  executionPath: string[],
  context: PipelineContext,
  duration: number,
  checkpointFile?: string
}
```

### Outcome

Represents the result of node execution.

```javascript
// Success outcome
Outcome.success(message, data?)

// Failure outcome  
Outcome.failure(message, data?)

// Retry outcome
Outcome.retry(message, data?)

// Skip outcome
Outcome.skip(message, data?)
```

**Properties:**
- `status`: 'success' | 'failure' | 'retry' | 'skip'
- `message`: string
- `data`: any (optional additional data)
- `timestamp`: number

### PipelineContext

Thread-safe key-value store for sharing data between nodes.

#### Methods

##### `set(key, value)`
Set a context value.

```javascript
context.set('user_input', 'Hello world');
context.set('analysis.sentiment', 'positive');
```

##### `get(key, defaultValue?)`
Get a context value.

```javascript
const input = context.get('user_input');
const sentiment = context.get('analysis.sentiment', 'neutral');
```

##### `has(key)`
Check if a key exists.

```javascript
if (context.has('previous_result')) {
  // Use previous result
}
```

##### `delete(key)`
Remove a key.

```javascript
context.delete('temporary_data');
```

##### `clear()`
Clear all context data.

##### `toJSON()`
Serialize context to JSON.

##### Built-in Context Keys

- `outcome`: Last node's execution status
- `graph.goal`: Pipeline goal from DOT file
- `current_node`: Currently executing node ID
- `last_response`: Truncated last LLM response
- `run_id`: Unique pipeline execution ID
- `start_time`: Pipeline start timestamp

## LLM Client API

### Client Class

Provider-agnostic interface for LLM operations.

```javascript
import { Client } from 'attractor/llm';

const client = await Client.create({
  provider: 'kilo',
  model: 'anthropic/claude-3-5-sonnet-20241022'
});
```

#### Methods

##### `complete(request)`

Generate a completion.

**Request:**
```javascript
{
  messages: Message[],
  model?: string,
  maxTokens?: number,
  temperature?: number,
  tools?: Tool[],
  systemPrompt?: string
}
```

**Response:**
```javascript
{
  id: string,
  content: string,
  usage: Usage,
  finishReason: FinishReason,
  toolCalls?: ToolCall[]
}
```

##### `stream(request)`

Generate a streaming completion.

**Returns:** AsyncGenerator<StreamEvent>

```javascript
for await (const event of client.stream(request)) {
  if (event.type === 'content') {
    process.stdout.write(event.content);
  }
}
```

### Message Types

```javascript
// User message
{
  role: 'user',
  content: 'Hello, world!'
}

// Assistant message
{
  role: 'assistant',
  content: 'Hello! How can I help you?'
}

// System message
{
  role: 'system',
  content: 'You are a helpful assistant.'
}

// Tool result
{
  role: 'tool',
  content: 'File contents...',
  toolCallId: 'call-123'
}
```

### Usage Tracking

```javascript
{
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  cost?: 0.0023  // USD if available
}
```

## Handler Interface

Base class for creating custom node handlers.

```javascript
import { Handler, Outcome } from 'attractor';

class CustomHandler extends Handler {
  /**
   * Execute the node
   * @param {GraphNode} node - The node being executed
   * @param {PipelineContext} context - Pipeline context
   * @param {ParsedGraph} graph - Complete graph
   * @param {string} logsRoot - Logging directory
   * @returns {Promise<Outcome>} - Execution result
   */
  async execute(node, context, graph, logsRoot) {
    // Implementation
  }
  
  /**
   * Validate node configuration (optional)
   * @param {GraphNode} node - Node to validate
   * @returns {ValidationIssue[]} - Any issues found
   */
  validate(node) {
    return [];
  }
}
```

### Built-in Handlers

- **StartHandler**: Pipeline entry point
- **ExitHandler**: Pipeline termination  
- **CodergenHandler**: LLM task execution
- **ConditionalHandler**: Branching logic
- **HumanHandler**: Human approval gates
- **ToolHandler**: External tool execution

## Validation API

### ValidationEngine

Rule-based validation for DOT workflows.

```javascript
import { ValidationEngine } from 'attractor/validation';

const validator = new ValidationEngine();
const issues = await validator.validateFile('./workflow.dot');
```

#### Validation Rules

1. **Graph Structure**: Start/exit nodes, connectivity
2. **Node Validation**: Handler types, required attributes
3. **Edge Validation**: Conditions, syntax, reachability  
4. **Goal Gates**: Retry target validation
5. **Human Gates**: Edge labeling, timeout configuration
6. **Cycles**: Deadlock detection
7. **Orphans**: Unreachable node detection
8. **Syntax**: DOT parser compliance
9. **Handlers**: Registered handler availability
10. **Stylesheets**: CSS syntax validation
11. **Timeouts**: Valid duration formats
12. **References**: Valid node/edge references

### ValidationIssue

```javascript
{
  severity: 'error' | 'warning' | 'info',
  message: string,
  nodeId?: string,
  rule: string,
  suggestion?: string,
  line?: number,
  column?: number
}
```

## Human Interaction API

### Interviewer Interface

Base class for human interaction backends.

```javascript
import { Interviewer, Question } from 'attractor/human';

class CustomInterviewer extends Interviewer {
  async ask(question) {
    // Implementation
    return 'user_answer';
  }
}
```

### Question Types

```javascript
// Multiple choice
{
  type: 'choice',
  question: 'Select an option:',
  choices: ['Option A', 'Option B', 'Option C'],
  defaultChoice: 0,
  timeout: 30000
}

// Yes/No
{
  type: 'yesno',
  question: 'Continue?',
  defaultChoice: 'yes',
  timeout: 10000
}

// Text input  
{
  type: 'text',
  question: 'Enter your name:',
  defaultValue: '',
  timeout: 60000
}
```

### Built-in Interviewers

- **ConsoleInterviewer**: Terminal-based interaction
- **WebInterviewer**: HTTP-based interaction  
- **MockInterviewer**: Automated responses for testing

## Stylesheet API

### Stylesheet System

CSS-like configuration for AI model selection.

```javascript
import { StylesheetEngine, PredefinedStylesheets } from 'attractor/styling';

// Use predefined stylesheet
const stylesheet = PredefinedStylesheets.balanced();

// Create custom stylesheet
const engine = new StylesheetEngine();
const rules = engine.parse(`
  .analysis { 
    model: claude-3-5-sonnet-20241022;
    reasoning_effort: high;
  }
  #critical { 
    model: claude-opus-4-6;
  }
`);
```

### Stylesheet Properties

- `model`: AI model identifier
- `provider`: LLM provider name
- `reasoning_effort`: low | medium | high | maximum
- `temperature`: 0.0 - 2.0
- `max_tokens`: Maximum response tokens
- `timeout`: Request timeout
- `max_retries`: Retry attempts

### Predefined Stylesheets

- **Balanced**: Good performance/cost ratio
- **Budget**: Cost-optimized model selection
- **Performance**: Maximum quality models
- **MultiProvider**: Route tasks to specialized providers

## Configuration

### Environment Variables

#### LLM Providers
```bash
# Anthropic
ANTHROPIC_API_KEY=your-key

# OpenAI  
OPENAI_API_KEY=your-key

# Kilo Gateway
KILO_API_KEY=your-key
KILO_CONFIG=balanced  # budget|balanced|performance
KILO_COST_BUDGET=10.00

# Custom Gateway
GATEWAY_API_KEY=your-key
GATEWAY_BASE_URL=https://gateway.com
```

#### Engine Settings
```bash
ATTRACTOR_LOG_LEVEL=info  # debug|info|warn|error
ATTRACTOR_VALIDATION=true
ATTRACTOR_CHECKPOINTING=false
ATTRACTOR_CACHE_DIR=./cache
```

### Configuration Files

Create `attractor.config.js` for project-specific settings:

```javascript
export default {
  llm: {
    provider: 'kilo',
    model: 'anthropic/claude-3-5-sonnet-20241022',
    enableCaching: true
  },
  engine: {
    enableValidation: true,
    enableCheckpointing: true,
    stylesheet: 'balanced'
  },
  human: {
    interviewer: 'console',
    defaultTimeout: 300000
  }
};
```

## Error Handling

### Error Types

```javascript
// Base error class
class AttractorError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'AttractorError';
    this.code = code;
    this.details = details;
  }
}

// Specific error types
class ValidationError extends AttractorError {}
class ExecutionError extends AttractorError {}
class ProviderError extends AttractorError {}
class TimeoutError extends AttractorError {}
class CheckpointError extends AttractorError {}
```

### Error Codes

- `VALIDATION_FAILED`: DOT file validation errors
- `NODE_EXECUTION_FAILED`: Node handler execution errors  
- `PROVIDER_ERROR`: LLM provider API errors
- `TIMEOUT_ERROR`: Operation timeout
- `CHECKPOINT_ERROR`: Checkpointing failures
- `CONTEXT_ERROR`: Context operation errors
- `HANDLER_NOT_FOUND`: Unknown handler type
- `GRAPH_PARSE_ERROR`: DOT parsing errors

### Error Handling Patterns

```javascript
try {
  const result = await attractor.run('./workflow.dot');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.details);
  } else if (error instanceof ProviderError) {
    console.log('LLM provider error:', error.message);
  } else {
    console.log('Unexpected error:', error);
  }
}
```

This API reference provides complete documentation for all public interfaces in the Attractor system. For examples and usage patterns, see the [Getting Started Guide](getting-started.md) and [Advanced Features Guide](advanced-features.md).