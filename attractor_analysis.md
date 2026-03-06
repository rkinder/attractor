---
# Attractor Project Analysis Report
## Project Overview
Attractor is a JavaScript/Node.js DOT-based pipeline runner for orchestrating multi-stage AI workflows. It uses Graphviz DOT syntax to define directed graphs where nodes are AI tasks (LLM calls, human reviews, tool execution, parallel branches) and edges define control flow. The project is at **v1.0.0** with approximately 6,500 lines of source code across 30+ modules.
---
Documentation Accuracy Issues
The documentation has significant discrepancies between what is described and what the code actually implements. These fall into three severity tiers:
Critical: Completely Fictional API Surface
These are documented features/APIs that do not exist in the code at all:
1. Attractor.create() options structure (docs/api-reference.md:17-48) -- The documented llm: { provider, model, simulation, enableCaching } and human: { interviewer, timeout } sub-objects are not read by the constructor. The actual constructor accepts options.engine and options.llmClient only (src/index.js:140-156).
2. Non-existent methods on Attractor -- runFromString(), resume(), validate(), once(), off(), emit() are all documented but do not exist. The class only has run(), on(), and registerHandler() (src/index.js:223-240).
3. ValidationEngine class -- Referenced in getting-started.md and api-reference.md but the actual class is PipelineLinter (src/validation/linter.js). The documented validateFile() method does not exist either.
4. Error class hierarchy -- AttractorError, ValidationError, ExecutionError, ProviderError, TimeoutError, CheckpointError (api-reference.md:720-751) -- none exist. The codebase uses ParseError and standard Error.
5. attractor.config.js config file (api-reference.md:698-717) -- No code reads this file.
6. Environment variables -- ATTRACTOR_LOG_LEVEL, ATTRACTOR_VALIDATION, ATTRACTOR_CHECKPOINTING, ATTRACTOR_CACHE_DIR (api-reference.md:690-694) are documented but never read.
High: Significant Inaccuracies
7. Outcome method names -- Docs say Outcome.failure() and Outcome.skip(), actual methods are Outcome.fail() and Outcome.skipped() (src/pipeline/outcome.js:47,55).
8. Outcome properties -- Docs say message, data, timestamp. Actual: status, preferred_label, suggested_next_ids, context_updates, notes, failure_reason (src/pipeline/outcome.js:14-20).
9. Event data shapes are all wrong -- Every documented event payload has extra/wrong fields vs what the engine actually emits. For example, pipeline_start emits { runId, dotFilePath, logsDir } but the docs say { runId, dotFile, timestamp, context } (engine.js:39).
10. Event name mismatch -- node_execution_failure in docs vs node_execution_failed in code (engine.js:217).
11. Events that don't exist -- context_updated, checkpoint_saved, checkpoint_loaded are documented but never emitted.
12. run() return value -- Docs say { success, runId, executionPath, context, duration, checkpointFile }. Actual: { success, finalNode, completedNodes, finalOutcome } (engine.js:170-176).
13. Context class name -- Docs call it PipelineContext, actual name is Context. Methods clear() and toJSON() are documented but don't exist (src/pipeline/context.js).
14. Parallel execution marked "Not Implemented" in advanced-features.md:224 -- but ParallelHandler (284 lines) and FanInHandler (197 lines) are fully implemented and registered.
15. $last_response in README example (line 55) -- shown in a codergen node prompt, but CodergenHandler._expandVariables() only expands $goal. The $last_response expansion only works in FanInHandler.
Medium: Missing/Incomplete Documentation
16. house shape -> stack.manager_loop handler is omitted from all node type tables (README, getting-started.md).
17. FanInHandler is not registered as parallel.fan_in in _setupDefaultHandlers() (src/index.js:193-221) despite being in SHAPE_TO_TYPE at registry.js:12. This is a bug -- tripleoctagon shaped nodes will fail at runtime.
18. Secrets are not exported from the main package entry point (src/index.js), so import { resolveSecret } from 'attractor' shown in secrets-management.md would fail.
19. "10 concurrent MCP servers" limit claimed in mcp-integration.md:140 -- no such limit exists in the code.
20. Predefined stylesheet .budget() -- documented but doesn't exist. The actual methods are .balanced(), .performance(), .quality(), .multiProvider() (src/styling/stylesheet.js:268-372).
---
Example Coverage Gaps
Features with ZERO examples
Feature	Code Location
HTTP Server	src/server/
Secrets Management	src/secrets/
Stack Manager Loops	src/handlers/stack-manager-loop.js
Coding Agent Session (standalone)	src/agent/session.js
Edge Weight Routing	src/pipeline/engine.js:314-319
Examples with bugs
- run-parallel-example.js, run-fanin-example.js, run-tool-example.js -- Entry point guard uses import.meta.url === process.argv[1] which is missing the file:// prefix (compare with comprehensive-demo.js:257 which does it correctly). These scripts won't auto-execute when run directly.
- run-with-kilo.js -- Uses new Attractor() instead of Attractor.create(), so _setupDefaultHandlers() is never called. Only the codergen handler is registered; any non-codergen node will fail.
- run-workflow.js -- References outcome.message (should be outcome.notes) and listens for human_input_required event which is never emitted.
Added Example
I created examples/http-server-demo.js which demonstrates the complete HTTP server feature:
- Starting an Attractor server programmatically
- Health check endpoint (GET /health)
- Pipeline submission via REST (POST /pipelines)
- Real-time WebSocket event streaming (ws://*/pipelines/:id/events)
- Pipeline status polling (GET /pipelines/:id)
- Pipeline listing (GET /pipelines)
- Cancel endpoint with terminal state validation (POST /pipelines/:id/cancel)
- Graceful shutdown
The example is fully self-contained, requires no API keys (uses simulation mode), and runs to completion.
---
Maturity Assessment
The project is not mature -- it is in active early development despite the v1.0.0 version number. Here is the evidence:
What works well:
- DOT parser is solid and well-tested
- Pipeline engine's graph traversal, retry logic, and edge selection are well-implemented
- Handler architecture is clean and extensible
- LLM adapter layer (Anthropic, Kilo, Gateway) is comprehensive
- Validation/linting with 12 rules is thorough
- Model stylesheets (CSS-like syntax) are a clever design
- Test coverage is reasonable (~15 test files, including integration tests)
What is incomplete or broken:
- Variable expansion only works for $goal in the main handler
- FanInHandler is never registered (bug in _setupDefaultHandlers)
- Resume from checkpoint is not implemented (save only)
- WebInterviewer is a stub
- Documentation describes an API surface that is ~40% fictional
- Several examples have bugs that prevent execution
- No caching system
- No concurrent node execution (maxConcurrentNodes)
- The coding agent session (src/agent/session.js) is powerful but completely undocumented and has no examples
---
Recommended Enhancements
Given the current state, the project should not be treated as mature. Here is a prioritized list of enhancements:
P0 -- Fix What's Broken (before any new features)
1. Register FanInHandler in _setupDefaultHandlers() -- add this.handlerRegistry.register('parallel.fan_in', new FanInHandler()); to src/index.js
2. Fix the 3 example entry point bugs -- change import.meta.url === process.argv[1] to import.meta.url === \file://${process.argv1}\` in run-parallel-example.js, run-fanin-example.js, run-tool-example.js`
3. Fix run-workflow.js -- outcome.message -> outcome.notes, remove human_input_required listener
4. Fix run-with-kilo.js -- use Attractor.create() or manually register all handlers
P1 -- Documentation Rewrite
5. Rewrite api-reference.md from scratch based on actual source code -- every class, method, property, event, and return type needs to be verified
6. Fix getting-started.md -- correct the node types table (add component, tripleoctagon, house), fix configuration options, reference the CLI
7. Fix advanced-features.md -- remove "Not Implemented" from parallel execution, correct predefined stylesheet names
8. Export secrets from src/index.js
P2 -- Complete Core Features
9. Variable expansion -- extend CodergenHandler._expandVariables() to support $last_response, $current_node, and arbitrary $context.key references (matching what FanInHandler already does)
10. Implement resume() -- the checkpoint saving infrastructure exists; add a public method to load a checkpoint and restart from the saved node
11. Condition evaluator safety -- replace eval() in engine.js:350 with a proper expression parser (security risk and reliability issue)
12. WebInterviewer -- complete the stub so the HTTP server can serve human approval gates via the browser
P3 -- New Capabilities
13. Add examples for all undocumented features -- secrets management, stack manager loops, edge weight routing, standalone coding agent session
14. Structured logging -- replace ad-hoc console.warn calls with a proper logger that respects log levels
15. Plugin system -- formalize the handler extension point with lifecycle hooks, so third-party handlers can participate in validation and checkpointing
16. Pipeline composition -- allow one DOT workflow to invoke another as a sub-pipeline (the StackManagerLoopHandler hints at this but it's simulation-only)
P4 -- Production Readiness
17. Error class hierarchy -- implement the documented error types (AttractorError, ValidationError, etc.) for proper error handling
18. Budget enforcement -- the UsageTracker can calculate costs but isn't wired into the engine; add automatic budget checking per-pipeline
19. Telemetry/observability -- emit OpenTelemetry spans for pipeline/node execution
20. Rate limiting in the HTTP server -- currently unprotected against abuse