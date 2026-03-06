# Attractor Roadmap: Agentic Code Development

## Vision

Transform Attractor into a capable tool for automatic and agentic code development, enabling AI-driven workflows that can generate, execute, and iterate on code.

---

## Current State

Attractor is a DOT-based AI workflow orchestration system with:
- Parallel execution and fan-in handlers
- LLM integration (Kilo, LM Studio)
- Event-driven pipeline engine
- Checkpointing infrastructure

**Critical gaps prevent meaningful agentic code development.**

---

## Hurdles & Roadmap

### Phase 1: Foundational (Must Have)

#### 1. Variable Expansion
**Priority:** Critical | **Status:** Not Implemented

Current state: Prompts cannot reference outputs from previous nodes (e.g., `$approach1.output` doesn't work).

Requirements:
- Support `$nodeId.output` to access previous node results
- Support `$last_response` for immediate previous response
- Support `$current_node.id` for current node metadata
- Implement in `CodergenHandler`

```
# Example needed:
nodeB [prompt="Based on: $nodeA.output, do X"]
```

#### 2. Checkpoint/Resume
**Priority:** Critical | **Status:** Infrastructure exists

Current state: `enableCheckpointing: true` exists but needs testing and completion.

Requirements:
- Persist workflow state to disk after each node
- Resume from last checkpoint on restart
- Handle partial parallel branch completion
- Store LLM response history for `$last_response`

#### 3. Code Execution
**Priority:** Critical | **Status:** Not Implemented

Requirements:
- Execute generated code in sandboxed environment
- Capture stdout/stderr
- Return execution results to workflow
- Support multiple languages (JavaShell, Python viasubprocess)
- Enable feedback loops: generate → execute → refine

---

### Phase 2: Reliability

#### 4. Safe Condition Evaluation
**Priority:** High | **Status:** Uses unsafe `eval()`

Current state: Branch conditions use `eval()` which is a security risk.

Requirements:
- Implement safe expression parser
- Support variables: `$node.output`, `$last_response`, `$env.VAR`
- Whitelist allowed operators (comparison, logical)
- Block dangerous functions

#### 5. Error Handling
**Priority:** High | **Status:** No proper hierarchy

Current state: Errors crash workflow, no recovery mechanisms.

Requirements:
- Create error class hierarchy:
  - `AttractorError` (base)
    - `WorkflowError`
    - `LLMError`
    - `HandlerError`
    - `ExecutionError`
- Add retry logic with exponential backoff
- Add fallback handlers
- Emit error events for monitoring

#### 6. Output Extraction
**Priority:** Medium | **Status:** Limited

Requirements:
- JSONPath or regex extraction from LLM responses
- Transform outputs before passing to next node
- Type coercion support

---

### Phase 3: Developer Experience

#### 7. Documentation
**Priority:** Medium | **Status:** ~40% APIs fictional

Requirements:
- Audit all documented APIs against implementation
- Remove or implement missing methods:
  - `runFromString()`, `resume()`, `validate()`, `emit()`
- Fix event payload definitions
- Document actual parallel execution behavior

#### 8. State Management
**Priority:** Medium | **Status:** Basic

Requirements:
- Global workflow context accessible to all nodes
- Session persistence across restarts
- Secret/variable injection

---

### Phase 4: Advanced Features

#### 9. Tool Integration
- Execute shell commands
- File read/write operations
- Git operations
- Web search/fetch

#### 10. Multi-LLM Coordination
- Route to different models based on task
- Consensus/voting across models
- Cost optimization

#### 11. Streaming Responses
- Real-time token-by-token output
- Progress indicators

---

## Quick Win: Minimal Viable Agent

To enable basic code development, implement in order:

1. **Variable Expansion** → Enables chaining: analyze → generate → execute → refine
2. **Checkpointing** → Survive failures
3. **Code Execution** → Actually run generated code

With these three, you have: "Generate code → run it → use output to refine → repeat"

---

## File Locations

- Core: `src/index.js`, `src/pipeline/engine.js`
- Handlers: `src/handlers/codergen.js`, `parallel.js`, `fanin.js`
- LLM: `src/llm/adapters/`, `src/llm/types.js`
- Examples: `examples/*.dot`
- Specs: `specs/variable-expansion/`, `specs/checkpoint-resume/`, etc.
