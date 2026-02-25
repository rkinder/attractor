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

## 📋 **Implementation Priority Recommendation**

### **Phase 1: Quick Wins (1-2 days)**
1. Fix ValidationEngine export
2. Implement resume() method  
3. Complete variable expansion ($last_response, $current_node)

### **Phase 2: Core Features (1-2 weeks)**  
1. Implement parallel execution (major feature)
2. Complete goal gate retry logic
3. Add performance caching system

### **Phase 3: Polish (1 week)**
1. Context lifecycle events
2. WebInterviewer implementation
3. Advanced routing algorithms
4. Concurrent execution (if needed)

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

## 📝 **Documentation Accuracy**

This TODO list was created by comparing the documented features in `docs/advanced-features.md` with the actual implementation in the codebase. All features listed here are either missing or incomplete compared to their documentation.

**Last Updated:** February 24, 2026  
**Codebase Version:** Latest master branch  
**Analysis Method:** Comprehensive source code review vs. documentation claims