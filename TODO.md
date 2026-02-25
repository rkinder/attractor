# Attractor Development Roadmap

This document tracks features that are documented but not yet fully implemented, as well as planned enhancements.

## 🔄 **Incomplete Features** (Partially Implemented)

These features have basic implementations but need completion to match the documented functionality.

### 1. Variable Expansion (30% Complete)
**Current Status:** Only `$goal` expansion is implemented  
**Missing:**
- `$last_response` - Previous node's response (truncated)
- `$current_node` - Currently executing node ID  
- `$key_name` - Arbitrary context variable expansion

**Implementation Notes:**
- Basic expansion exists in `src/pipeline/context.js` 
- Need to enhance `expandVariables()` method
- Add support for built-in variables and context key expansion

**Priority:** High - Core workflow functionality

### 2. Goal Gate Retry Logic (70% Complete)
**Current Status:** Goal gates are parsed and validated but retry logic is basic  
**Missing:**
- Full retry target validation and routing
- Sophisticated retry policies with exponential backoff
- Proper goal gate failure handling that respects retry targets

**Implementation Notes:**
- Goal gate attributes (`goal_gate`, `max_retries`, `retry_target`) are parsed
- Basic retry counting exists but needs enhancement
- Need proper retry target validation in execution engine

**Priority:** Medium - Important for production workflows

### 3. Advanced Context Management (70% Complete)  
**Current Status:** Basic key-value store with dot notation support  
**Missing:**
- Context lifecycle events (`context_updated`, `context_accessed`)
- Proper scoped access patterns
- Context event emission integration

**Implementation Notes:**
- Core context system in `src/pipeline/context.js` is solid
- Need to add event emission for context operations
- Enhance scoped key access patterns

**Priority:** Low - Nice to have for monitoring

### 4. Edge Weight Routing (80% Complete)
**Current Status:** Weight parsing and basic preference routing implemented  
**Missing:**
- Complex routing algorithms beyond weight + lexical
- Advanced edge selection strategies
- Performance optimization for large graphs

**Implementation Notes:**
- Basic weight-based routing in `src/pipeline/engine.js`
- `_bestByWeightThenLexical()` method exists
- Could benefit from more sophisticated routing algorithms

**Priority:** Low - Current implementation sufficient for most use cases

### 5. Checkpointing Resume (20% Complete)
**Current Status:** Automatic checkpointing works, but no resume API  
**Missing:**
- Public `resume()` method in main Attractor class
- Checkpoint file loading and state restoration
- Resume from arbitrary checkpoint functionality

**Implementation Notes:**
- Checkpoint saving implemented in `src/pipeline/engine.js`
- Need to expose resume functionality in `src/index.js`
- State restoration logic needs implementation

**Priority:** Medium - Important for long-running workflows

## 🚀 **High-Value Features from Python Implementation** (New Discoveries)

The following features were discovered in anishkny/attractor Python implementation and would add significant value to our JavaScript version:

### 1. HTTP Server Mode (0% Complete)
**Source Reference:** [Python server.py](https://github.com/anishkny/attractor/blob/main/src/attractor/server.py)
**Value:** Enables web-based pipeline management and remote execution

**What's Missing:**
- Flask/Express-based HTTP server for pipeline management
- REST API endpoints for pipeline submission and monitoring  
- Server-Sent Events (SSE) for real-time pipeline updates
- Background pipeline execution with thread management
- Pipeline status tracking and context exposure

**API Endpoints to Implement:**
- `POST /pipelines` - Submit DOT source and start execution
- `GET /pipelines/{id}` - Get pipeline status and progress
- `GET /pipelines/{id}/events` - SSE stream of real-time events
- `POST /pipelines/{id}/cancel` - Cancel running pipeline  
- `GET /pipelines/{id}/context` - Get current context
- `GET /health` - Health check

**Priority:** High - Enables web integration and remote management

**Estimated Effort:** Medium (1-2 weeks)

### 2. Comprehensive Event System (10% Complete)
**Source Reference:** [Python events.py](https://github.com/anishkny/attractor/blob/main/src/attractor/events.py)
**Value:** Rich observability for monitoring, logging, and UI integration

**What's Missing:**
- Typed event system with 14+ event types
- Event emitter with observer pattern
- Pipeline lifecycle events (started, completed, failed)
- Stage lifecycle events (started, completed, failed, retrying)
- Parallel execution events
- Human interaction events (interview started/completed/timeout)
- Checkpoint events

**Implementation Notes:**
- Our current implementation has basic events but lacks comprehensive typing
- Python version has detailed event classes with rich metadata
- Integrates seamlessly with HTTP server for SSE streaming

**Priority:** High - Critical for production monitoring and web UI

**Estimated Effort:** Small-Medium (3-5 days)

### 3. Tool Handler for Shell Commands (0% Complete)
**Source Reference:** [Python handlers.py ToolHandler](https://github.com/anishkny/attractor/blob/main/src/attractor/handlers.py#L300-400)
**Value:** Execute external commands, scripts, and integrations

**What's Missing:**
- ToolHandler for `parallelogram` shape nodes
- Shell command execution with timeout support
- Stdout/stderr capture and logging
- Return code evaluation for success/failure
- Context updates with command results

**Features:**
- Execute shell commands from DOT workflows
- Capture and log command output
- Configurable timeouts
- Proper error handling and status reporting

**Priority:** High - Enables integration with external tools

**Estimated Effort:** Small (2-3 days)

### 4. Manager Loop Handler (0% Complete)
**Source Reference:** [Python handlers.py ManagerLoopHandler](https://github.com/anishkny/attractor/blob/main/src/attractor/handlers.py#L600-800)
**Value:** Supervisor pattern for orchestrating child pipelines

**What's Missing:**
- ManagerLoopHandler for `house` shape nodes
- Child pipeline supervision with observe/steer/wait cycle
- Automatic child process management  
- Telemetry ingestion from child checkpoints
- Configurable polling intervals and stop conditions

**Use Cases:**
- Sprint-based development workflows
- Hierarchical pipeline management
- Long-running supervision tasks
- Multi-stage project management

**Priority:** Medium - Advanced orchestration feature

**Estimated Effort:** Medium (1 week)

### 5. Enhanced Validation System (30% Complete)
**Source Reference:** [Python validation.py](https://github.com/anishkny/attractor/blob/main/src/attractor/validation.py)
**Value:** More comprehensive validation with better error reporting

**Current vs Python:**
- Our implementation: Basic validation exists but API naming issues
- Python implementation: 7 comprehensive lint rules with detailed diagnostics

**Missing Enhancements:**
- Diagnostic severity levels (ERROR, WARNING, INFO)
- More detailed error messages with suggestions
- `validate_or_raise()` convenience method
- Extensible lint rule system

**Priority:** Low-Medium - Quality of life improvement

**Estimated Effort:** Small (1-2 days)

## ❌ **Not Implemented Features** (Missing)

These features are documented but completely missing from the codebase.

### 1. Parallel Execution (0% Complete)
**Documentation Claims:**
- Fan-out nodes with `shape=component`
- Fan-in nodes with `shape=tripleoctagon`
- Parallel task orchestration
- Conditional parallel paths

**What's Missing:**
- `ParallelHandler` and `ParallelFanInHandler` classes
- Parallel execution orchestration in engine
- Thread/worker management for parallel tasks
- Result aggregation from parallel branches

**Implementation Notes:**
- Shape mappings exist in `src/handlers/registry.js` but no handlers
- Would require significant engine changes for parallel orchestration
- Need to design task synchronization and result merging

**Priority:** High - Major documented feature that's completely missing

**Estimated Effort:** Large (2-3 weeks)

### 2. Performance Caching System (0% Complete)
**Documentation Claims:**
- LLM response caching with TTL
- Cache directory configuration  
- `enableCaching`, `cacheDir`, `cacheTTL` options

**What's Missing:**
- Pipeline-level caching implementation
- Cache management system
- TTL and cache invalidation logic
- Integration with LLM client for response caching

**Implementation Notes:**
- Some cache-related code exists in LLM adapters but not exposed
- Need centralized cache manager
- Should integrate with existing LLM client architecture

**Priority:** Medium - Performance optimization feature

**Estimated Effort:** Medium (1 week)

### 3. Concurrent Node Execution (0% Complete)
**Documentation Claims:**
- `maxConcurrentNodes` configuration
- `enableParallelToolCalls` option
- Concurrent execution of independent nodes

**What's Missing:**
- Concurrent execution engine implementation
- Node dependency analysis for safe parallelization
- Thread/worker pool management
- Configuration options in main API

**Implementation Notes:**
- Current engine is strictly sequential
- Would require major architectural changes
- Need careful consideration of context sharing between concurrent nodes

**Priority:** Medium - Performance feature, but complex to implement safely

**Estimated Effort:** Large (2-3 weeks)

### 4. ValidationEngine Class (10% Complete)
**Documentation Claims:**
- `ValidationEngine` class with `validateFile()` method
- Standalone validation API separate from pipeline execution

**What's Missing:**
- Public `ValidationEngine` class (only internal `PipelineLinter` exists)
- `validateFile()` method as documented
- Integration with main Attractor API

**Implementation Notes:**
- `PipelineLinter` class exists in `src/validation/linter.js` with full functionality
- Just need to expose it as `ValidationEngine` in public API
- Very easy fix - mostly API surface issue

**Priority:** High - Easy fix for documented API

**Estimated Effort:** Small (1 day)

### 5. WebInterviewer Implementation (30% Complete)
**Documentation Claims:**
- `WebInterviewer` class for HTTP-based human interaction
- Port and baseURL configuration
- Web UI integration

**What's Missing:**
- Complete `WebInterviewer` implementation
- HTTP server for handling questions/responses
- Web UI components for human gates

**Implementation Notes:**
- Basic interviewer infrastructure exists
- `ConsoleInterviewer` is fully implemented
- Need HTTP-based version for web integration

**Priority:** Low - Alternative interface, ConsoleInterviewer works

**Estimated Effort:** Medium (1 week)

## 🔧 **API Inconsistencies** (Quick Fixes)

These are documentation/API surface issues that are easy to fix.

### 1. ValidationEngine Export
**Issue:** Documentation shows `ValidationEngine` import, but only `PipelineLinter` exists  
**Fix:** Add export alias in `src/index.js`  
**Effort:** 5 minutes

### 2. Resume Method
**Issue:** `attractor.resume()` documented but not exposed  
**Fix:** Add resume method to Attractor class that calls engine's checkpoint loading  
**Effort:** 1 hour

### 3. PredefinedStylesheets Import
**Issue:** Documentation shows import from main package, but may not be exported  
**Fix:** Verify and add to main exports if missing  
**Effort:** 5 minutes

## 📋 **Updated Implementation Priority Recommendation**

### **Phase 1: Quick Wins (1-2 days)**
1. Fix ValidationEngine export
2. Implement resume() method  
3. Complete variable expansion ($last_response, $current_node)
4. **NEW: Tool Handler** - High value, easy implementation

### **Phase 2: High-Impact Web Features (1-2 weeks)**  
1. **NEW: HTTP Server Mode** - Enables web integration and remote management
2. **NEW: Comprehensive Event System** - Critical for production monitoring
3. Complete goal gate retry logic

### **Phase 3: Core Orchestration (2-3 weeks)**
1. Implement parallel execution (major feature)
2. **NEW: Manager Loop Handler** - Advanced pipeline supervision
3. Add performance caching system

### **Phase 4: Polish & Performance (1 week)**
1. Context lifecycle events
2. WebInterviewer implementation
3. Advanced routing algorithms
4. Concurrent execution (if needed)

## 🎯 **Feature Value Assessment**

**Highest ROI Features from Python Analysis:**
1. **HTTP Server Mode** - Transforms Attractor into a service (web apps, CI/CD, remote management)
2. **Tool Handler** - Enables external integrations (shell commands, APIs, file operations)  
3. **Event System** - Production monitoring, logging, UI integration
4. **Manager Loop Handler** - Advanced orchestration for complex workflows

**Why These Features Are Valuable:**
- **HTTP Server:** Enables web applications, remote execution, team collaboration
- **Tool Handler:** Bridges gap between AI workflows and existing toolchains
- **Event System:** Essential for production deployments and monitoring
- **Manager Loop:** Enables sophisticated multi-stage project management workflows

## 🏗️ **Implementation Notes for Contributors**

### Parallel Execution Architecture
The parallel execution system will need:
- **ParallelHandler**: Manages fan-out to multiple child nodes
- **ParallelFanInHandler**: Collects and merges results from parallel branches  
- **Engine Changes**: Modify execution loop to handle concurrent node execution
- **Context Safety**: Ensure thread-safe context access during parallel execution
- **Error Handling**: Aggregate errors from parallel branches appropriately

### Variable Expansion Enhancement
Enhance `src/pipeline/context.js` to support:
- Dynamic variable resolution at runtime
- Built-in variable providers ($last_response, $current_node)
- Recursive expansion for nested variables
- Performance optimization for frequently accessed variables

### Caching System Design
Implement a multi-layer cache:
- **LLM Response Cache**: Cache based on prompt + model + parameters
- **Node Result Cache**: Cache node outcomes for identical inputs
- **Context Cache**: Cache expensive context computations
- **TTL Management**: Automatic cleanup of expired cache entries

## 🔍 **Analysis Sources**

This TODO list was created through multiple analysis phases:

1. **Documentation vs Implementation:** Comparing `docs/advanced-features.md` with actual codebase
2. **Python Implementation Analysis:** Reviewing [anishkny/attractor](https://github.com/anishkny/attractor) Python implementation for valuable features
3. **Feature Gap Assessment:** Identifying high-value features that exist in Python but missing in our JavaScript implementation

## 📊 **Key Findings from Python Analysis**

The Python implementation by anishkny has several production-ready features that would significantly enhance our JavaScript version:

- **HTTP Server Mode:** Full REST API with SSE events for web integration
- **Tool Handler:** Shell command execution for external tool integration  
- **Manager Loop Handler:** Advanced pipeline supervision and orchestration
- **Comprehensive Events:** 14 typed event classes for rich observability
- **Enhanced Validation:** Better error reporting and diagnostic system

These features are **implementable in JavaScript** and would provide immediate value for:
- Web application integration
- CI/CD pipeline automation  
- Production monitoring and observability
- External tool integration
- Advanced workflow orchestration

**Last Updated:** February 24, 2026  
**Codebase Version:** Latest master branch  
**Analysis Sources:** 
- Our codebase implementation review
- [anishkny/attractor Python implementation](https://github.com/anishkny/attractor)
- StrongDM Attractor specification compliance