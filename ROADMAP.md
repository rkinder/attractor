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
**Phase 5: Production Infrastructure - Complete** ✅

---

## Phases Overview

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundational | ✅ Complete |
| Phase 2 | Reliability | ✅ Complete |
| Phase 3 | Developer Experience | ✅ Complete |
| Phase 4 | Advanced Features | ✅ Complete |
| Phase 5 | Production Infrastructure | ✅ Complete |

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
**Priority:** Medium | **Status:** ✅ Complete

**Status**: Complete (March 2026):

Fixed:
- ✅ `runFromString()` method - verified
- ✅ `resume()` method - fixed signature (runId, options)
- ✅ `listCheckpoints()` static method - verified
- ✅ Error classes exported - verified
- ✅ OutputExtractor exported - verified
- ✅ Event documentation - fixed payloads to match actual implementation
- ✅ Fixed event name: node_execution_failed (was failure)
- ✅ Removed fictional methods: validate(), once(), off(), emit()
- ✅ Removed fictional events: checkpoint_saved, checkpoint_loaded, context_updated
- ✅ Fixed Outcome class: fail() method, notes property
- ✅ Fixed Context class: removed clear(), toJSON()
- ✅ Documented all 9 handler types with shape mapping
- ✅ Verified code examples work

See: `specs/documentation-fix/`

#### 8. State Management
**Priority:** Medium | **Status:** ✅ Complete

**Status**: Complete! Enhanced with new features (implemented March 2026):

Implemented:
- ✅ Context key-value store
- ✅ Checkpoint/resume for persistence
- ✅ Type-safe getters (getString, getNumber, getBoolean)
- ✅ Environment variable injection ($env.VAR)
- ✅ getObject(key, defaultValue) - returns object or default
- ✅ getArray(key, defaultValue) - returns array or default
- ✅ exportSession() - exports full session state to JSON
- ✅ importSession(sessionData) - imports session state
- ✅ Secret masking in logs - masks *_SECRET, *_KEY, *_TOKEN, *_PASSWORD values

Note: Global cross-workflow context moved to Phase 5a (requires Redis infrastructure).

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

All major features implemented! ✅

| Item | Spec | Status |
|------|------|--------|
| Documentation Audit | specs/documentation-fix/ | ✅ Complete |

### Phase 5a: Infrastructure (Prerequisite)
| Item | Spec | Status |
|------|------|--------|
| Redis Integration | Part of server-expansion | ✅ Complete |
| Global Context | Part of server-expansion | ✅ Complete |

### Phase 5b: Production Features
| Item | Spec | Status |
|------|------|--------|
| Coordinator Service | specs/server-expansion/ | ✅ Complete |
| Containerization | specs/containerization/ | ✅ Complete |
| Distributed Deployment | specs/distributed-deployment/ | ✅ Complete |

---

## Phase 5: Production Infrastructure

### Phase 5a: Shared Infrastructure (Redis)
**Priority:** Critical | **Status:** ✅ Complete

Implemented (March 2026):
- ✅ Config module (`src/server/config.js`) with environment variable support
- ✅ Redis storage (`src/server/storage/redis.js`) with fallback to in-memory
- ✅ CoordinatorService (`src/server/coordinator.js`) for workflow chaining
- ✅ Human intervention API endpoints (/clarify, /approve, /context, /questions)
- ✅ Coordinator WebSocket events for real-time updates
- ✅ Pipeline state persistence in Redis
- ✅ Decision history in Redis
- ✅ Pub/sub for event distribution
- ✅ Pipeline ownership management
- ✅ Instance heartbeat and discovery
- ✅ Coordinator election via Redis locks

---

### 12. Coordinator Service
**Priority:** Critical | **Status:** ✅ Complete

Workflow coordination and chaining based on pipeline completion.

Implemented:
- Coordinator service that responds to pipeline completion events
- Queue-based triggers for async workflow initiation
- Human intervention API for external clarifications/approvals
- WebSocket events for real-time coordinator visibility

See: `specs/server-expansion/`

### 13. Containerization
**Priority:** Critical | **Status:** ✅ Complete

Deploy Attractor in containerized environments.

Implemented:
- Dockerfile with multi-stage build (node:20-alpine)
- Docker Compose with Redis and named volumes
- Health checks for container readiness
- Graceful shutdown handling
- Persistent volumes for logs and artifacts
- .dockerignore and .env.example
- docker-compose.override.yml for development

See: `specs/containerization/`

### 14. Distributed Deployment
**Priority:** High | **Status:** ✅ Complete

Scale Attractor horizontally with multiple instances.

Implemented:
- Redis pub/sub for event distribution across instances
- Pipeline ownership to prevent duplicate execution
- Coordinator election via Redis locks
- Shared filesystem for cross-instance artifact access
- Nginx load balancer configuration
- Health-based routing and failover
- docker-compose.distributed.yml for scaling

See: `specs/distributed-deployment/`

---

### Future Enhancements (Not Required for MVP)
- Sandbox Execution (Docker-based)
- Human Approval Gate
- Execution Auditing
- Session Encryption

---

## Quick Win: Minimal Viable Agent

To enable basic code development, implement in order:

1. **Variable Expansion** → Enables chaining: analyze → generate → execute → refine
2. **Checkpointing** → Survive failures
3. **Code Execution** → Actually run generated code

With these three, you have: "Generate code → run it → use output to refine → repeat"

✅ **All phases complete!**

---

## File Locations

- Core: `src/index.js`, `src/pipeline/engine.js`
- Handlers: `src/handlers/codergen.js`, `parallel.js`, `fanin.js`
- LLM: `src/llm/adapters/`, `src/llm/types.js`
- Server: `src/server/index.js`, `pipeline-manager.js`
- Examples: `examples/*.dot`
- Specs: `specs/server-expansion/`, `specs/containerization/`, `specs/distributed-deployment/`
