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
- HTTP server for remote execution

**Phase 1-4 features implemented!** ✅
**Phase 5: Production Infrastructure - In Progress** 🚧

---

## Phases Overview

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundational | ✅ Complete |
| Phase 2 | Reliability | ✅ Complete |
| Phase 3 | Developer Experience | ⚠️ Partial |
| Phase 4 | Advanced Features | ✅ Complete |
| Phase 5 | Production Infrastructure | 🚧 In Progress |

---

## Hurdles & Roadmap

### Phase 1: Foundational (Must Have)

#### 1. Variable Expansion
**Priority:** Critical | **Status:** ✅ Implemented

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
**Priority:** Critical | **Status:** ✅ Implemented

Current state: `enableCheckpointing: true` exists but needs testing and completion.

Requirements:
- Persist workflow state to disk after each node
- Resume from last checkpoint on restart
- Handle partial parallel branch completion
- Store LLM response history for `$last_response`

#### 3. Code Execution
**Priority:** Critical | **Status:** ✅ Implemented (ToolHandler)

Requirements:
- Execute generated code in sandboxed environment
- Capture stdout/stderr
- Return execution results to workflow
- Support multiple languages (JavaShell, Python viasubprocess)
- Enable feedback loops: generate → execute → refine

---

### Phase 2: Reliability

#### 4. Safe Condition Evaluation
**Priority:** High | **Status:** ✅ Implemented

- Implemented safe expression parser (ConditionEvaluator)
- Supports comparison operators (=, !=, >, <, >=, <=)
- Supports logical operators (AND, OR, &&, ||)
- Supports context variables and parentheses
- Replaced unsafe eval() in engine.js

#### 5. Error Handling
**Priority:** High | **Status:** ✅ Implemented

- Created error class hierarchy in src/pipeline/errors.js:
  - `AttractorError` (base)
    - `ValidationError`
    - `WorkflowError`
    - `ExecutionError`
    - `HandlerError`
    - `LLMError`
    - `ProviderError`
    - `TimeoutError`
    - `CheckpointError`
    - `ConfigurationError`
- All errors exported from src/index.js
- Error events emitted for monitoring

#### 6. Output Extraction
**Priority:** Medium | **Status:** ✅ Implemented

- Created OutputExtractor class in src/pipeline/output-extractor.js
- Supports regex pattern extraction
- Supports JSON extraction
- Supports key-value extraction
- Type coercion support (number, boolean, string, array, object)

---

### Phase 3: Developer Experience

#### 7. Documentation
**Priority:** Medium | **Status:** ⚠️ Partial - See spec

**Status**: Partially complete. Key methods implemented but docs not yet audited.

Implemented:
- ✅ `runFromString()` method
- ✅ `resume()` method  
- ✅ `listCheckpoints()` static method
- ✅ Error classes exported
- ✅ OutputExtractor exported
- ⚠️ Event documentation needs updating

Remaining:
- [ ] Audit api-reference.md against implementation
- [ ] Update event documentation with actual payloads
- [ ] Verify code examples work
- [ ] Update README examples

See: `specs/documentation-fix/`

#### 8. State Management
**Priority:** Medium | **Status:** ⚠️ Partial - See spec

**Status**: Partially complete - core done, enhancements remaining.

Implemented:
- ✅ Context key-value store
- ✅ Checkpoint/resume for persistence
- ✅ Type-safe getters (getString, getNumber, getBoolean)
- ✅ Environment variable injection ($env.VAR)

Remaining (Phase 3 Enhancement):
- [ ] Global cross-workflow context
- [ ] Session export/import
- [ ] Secret masking in logs
- [ ] getObject/getArray accessors

See: `specs/state-management/`

---

### Phase 4: Advanced Features

#### 9. Tool Integration
**Priority:** High | **Status:** ✅ Implemented

- Execute shell commands via ToolHandler
- File read/write via workflow nodes
- Git operations via tool nodes
- ✅ Security: Command whitelist/blacklist available (opt-in via env vars)

#### 10. Multi-LLM Coordination
**Priority:** Medium | **Status:** ✅ Implemented

- ModelRouter supports task-based routing
- Supports multiple providers (Anthropic, Kilo, LM Studio)
- Cost optimization via model selection

#### 11. Streaming Responses
**Priority:** Medium | **Status:** ✅ Implemented (Already Existed)

- Streaming already built into LLM adapters
- Supports Anthropic, Kilo, LM Studio streaming
- Real-time token output available

---

## Remaining Work for Complete Implementation

### High Priority
| Item | Spec | Status |
|------|------|--------|
| Documentation Audit | specs/documentation-fix/ | ⚠️ Partial |
| Server Expansion | specs/server-expansion/ | 📋 Planned |
| Containerization | specs/containerization/ | 📋 Planned |
| Distributed Deployment | specs/distributed-deployment/ | 📋 Planned |

### Medium Priority (Phase 3 Enhancement)
| Item | Spec | Status |
|------|------|--------|
| State Management Enhancements | specs/state-management/ | ⚠️ Partial |

---

## Phase 5: Production Infrastructure

### 12. Server Expansion
**Priority:** Critical | **Status:** 📋 Planned

Enable Attractor to run as a long-running service with workflow coordination.

Requirements:
- Coordinator service that responds to pipeline completion events
- Redis for state persistence (fast reads/writes, TTL)
- Queue-based triggers for async workflow initiation
- Human intervention API for external clarifications/approvals
- WebSocket events for real-time coordinator visibility

See: `specs/server-expansion/`

### 13. Containerization
**Priority:** Critical | **Status:** 📋 Planned

Deploy Attractor in containerized environments.

Requirements:
- Dockerfile with multi-stage build (node:20-alpine)
- Docker Compose with Redis and named volumes
- Health checks for container readiness
- Graceful shutdown handling
- Persistent volumes for logs and artifacts

See: `specs/containerization/`

### 14. Distributed Deployment
**Priority:** High | **Status:** 📋 Planned

Scale Attractor horizontally with multiple instances.

Requirements:
- Redis pub/sub for event distribution across instances
- Pipeline ownership to prevent duplicate execution
- Coordinator election via Redis locks
- Shared filesystem for cross-instance artifact access
- Nginx load balancer configuration
- Health-based routing and failover

See: `specs/distributed-deployment/`

---

### Future Enhancements (Not Required for MVP)
- Sandbox Execution (Docker-based)
- Human Approval Gate
- Execution Auditing
- Session Encryption
- Global Cross-Workflow Context

---

## Quick Win: Minimal Viable Agent

To enable basic code development, implement in order:

1. **Variable Expansion** → Enables chaining: analyze → generate → execute → refine
2. **Checkpointing** → Survive failures
3. **Code Execution** → Actually run generated code

With these three, you have: "Generate code → run it → use output to refine → repeat"

✅ **Phases 1-4 complete. Phase 5 in progress!**

---

## File Locations

- Core: `src/index.js`, `src/pipeline/engine.js`
- Handlers: `src/handlers/codergen.js`, `parallel.js`, `fanin.js`
- LLM: `src/llm/adapters/`, `src/llm/types.js`
- Server: `src/server/index.js`, `pipeline-manager.js`
- Examples: `examples/*.dot`
- Specs: `specs/server-expansion/`, `specs/containerization/`, `specs/distributed-deployment/`
