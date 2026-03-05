# Design: Parallel Handler

## Overview

The Parallel Handler enables Attractor pipelines to execute multiple branches concurrently, allowing for parallel processing of independent tasks. This feature dramatically improves pipeline execution time when multiple operations can run simultaneously without dependencies on each other.

**Problem Statement**: Currently, the JavaScript Attractor executes nodes sequentially. When a pipeline has multiple independent paths (e.g., running tests in parallel, processing multiple data sources, executing multiple LLM calls), these operations run one after another, wasting time and resources.

**Solution**: Implement a `ParallelHandler` class that spawns concurrent worker threads for each outgoing branch, executes them in parallel with configurable concurrency limits, aggregates results, and determines overall success/failure status. This mirrors the mature Python implementation while adapting to Node.js asynchronous patterns.

## Architecture

### Components

1. **ParallelHandler** (`src/handlers/parallel.js`)
   - Extends `Handler` base class
   - Manages concurrent branch execution using Worker threads or async tasks
   - Enforces `max_parallel` concurrency limit
   - Aggregates results from all branches
   - Determines aggregate success status (SUCCESS/PARTIAL_SUCCESS/FAIL)

2. **Branch Executor** (internal to ParallelHandler)
   - Executes a single branch from parallel node to terminal or next convergence point
   - Creates isolated context snapshot for each branch
   - Handles branch failures gracefully
   - Returns outcome for aggregation

3. **Handler Registry Integration** (`src/handlers/registry.js`)
   - Already maps `component` shape to `parallel` type (line 11)
   - No changes needed - registry is ready

4. **Context Isolation** (`src/pipeline/context.js`)
   - Uses existing `snapshot()` method to create isolated contexts
   - May need `merge()` method to consolidate results

### Data Flow

```
DOT Pipeline → Parser → Graph (Node with shape=component)
                           ↓
                    Engine.executeNode()
                           ↓
                    Registry.resolve('parallel')
                           ↓
                    ParallelHandler.execute()
                           ↓
                    Get outgoing edges (branches)
                           ↓
         ┌──────────────────┴──────────────────┐
         ↓                  ↓                   ↓
    Branch 1           Branch 2            Branch 3
    (isolated ctx)     (isolated ctx)      (isolated ctx)
         ↓                  ↓                   ↓
    Outcome 1          Outcome 2           Outcome 3
         └──────────────────┬──────────────────┘
                           ↓
                Aggregate results (SUCCESS/PARTIAL/FAIL)
                           ↓
                    Update main context
                           ↓
                Continue to next convergence node
```

### Concurrency Strategy

**Option 1: Async/Await Concurrency (Recommended)**
- Use `Promise.all()` or `Promise.allSettled()` for concurrent execution
- No worker threads needed - Node.js event loop handles concurrency
- Simpler implementation, less overhead
- Best for I/O-bound tasks (LLM calls, HTTP requests)

**Option 2: Worker Threads**
- Use Node.js `worker_threads` module
- True parallelism for CPU-bound tasks
- More complex (requires serializable data)
- Better matches Python's ThreadPoolExecutor

**Decision**: Start with Option 1 (async/await) as most pipeline operations are I/O-bound. Add worker thread support later if CPU-bound tasks are common.

## Functional Requirements

### FR-001: Parallel Branch Detection
**Type**: Ubiquitous  
**Statement**: The system shall identify all outgoing edges from a parallel node and execute each target node as an independent branch.  
**Rationale**: Core functionality - parallel nodes must fan out to all downstream paths.

### FR-002: Context Isolation
**Type**: Ubiquitous  
**Statement**: The system shall create an isolated context snapshot for each branch using `context.snapshot()`, preventing branches from interfering with each other's state.  
**Rationale**: Branch independence - changes in one branch must not affect others during execution.

### FR-003: Concurrent Execution
**Type**: Ubiquitous  
**Statement**: The system shall execute all branches concurrently up to the `max_parallel` concurrency limit.  
**Rationale**: Performance - parallel execution reduces total pipeline time.

### FR-004: Concurrency Limit Enforcement
**Type**: State-driven  
**Statement**: WHILE branches are executing, the system shall ensure no more than `max_parallel` branches run simultaneously (default: 4).  
**Rationale**: Resource management - prevents overwhelming system resources.

### FR-005: Branch Success Aggregation
**Type**: Event-driven  
**Statement**: WHEN all branches complete successfully (status=SUCCESS), the system shall return Outcome.success() with aggregate status SUCCESS.  
**Rationale**: All branches must succeed for parallel operation to be considered successful.

### FR-006: Partial Success Detection
**Type**: Event-driven  
**Statement**: WHEN some but not all branches succeed, the system shall return Outcome with status PARTIAL_SUCCESS and details of which branches failed.  
**Rationale**: Enables conditional handling of partial failures (e.g., "continue if 2/3 succeed").

### FR-007: Complete Failure Detection
**Type**: Event-driven  
**Statement**: WHEN all branches fail, the system shall return Outcome.fail() with aggregate status FAIL.  
**Rationale**: Total failure should halt pipeline or trigger error handling.

### FR-008: Branch Exception Handling
**Type**: Unwanted Behavior  
**Statement**: IF a branch throws an exception during execution, THEN the system shall capture it as a FAIL outcome for that branch without canceling other branches.  
**Rationale**: One failing branch should not crash the entire parallel operation.

### FR-009: Empty Branch Handling
**Type**: Unwanted Behavior  
**Statement**: IF a parallel node has no outgoing edges, THEN the system shall immediately return Outcome.success() without spawning workers.  
**Rationale**: Degenerate case - no work to do means success.

### FR-010: Result Aggregation in Context
**Type**: Ubiquitous  
**Statement**: The system shall store aggregated results from all branches in context key `parallel.results` as a JSON structure containing branch IDs and their outcomes.  
**Rationale**: Enables downstream nodes to inspect individual branch results.

### FR-011: Branch Execution Logging
**Type**: Ubiquitous  
**Statement**: The system shall create separate log directories for each branch under the parallel node's stage directory.  
**Rationale**: Enables debugging and auditing of parallel executions.

### FR-012: Branch Termination
**Type**: State-driven  
**Statement**: WHILE branches are executing, the system shall allow each branch to run until completion (no early termination on first failure).  
**Rationale**: All branches provide valuable information even if some fail; enables PARTIAL_SUCCESS status.

### FR-013: Result Ordering
**Type**: Optional Feature  
**Statement**: WHERE branches complete at different times, the system shall preserve branch execution order based on edge definition order (deterministic aggregation).  
**Rationale**: Enables predictable result ordering for debugging and testing.

## Non-Functional Requirements

### NFR-001: Performance
- **Overhead**: Parallel handler setup and teardown must complete within 50ms (excluding branch execution)
- **Speedup**: For N independent branches, execution time should approach T/min(N, max_parallel) where T is sequential time

### NFR-002: Memory Management
- **Context Snapshots**: Each branch context must be isolated (deep copy where necessary)
- **Memory Limit**: Total memory for all branch contexts must not exceed 10x single context size
- **Cleanup**: Branch contexts must be garbage collected after aggregation

### NFR-003: Scalability
- **Max Branches**: Must support up to 100 concurrent branches
- **Max Parallelism**: Must support `max_parallel` values from 1 to 50
- **Resource Throttling**: Must respect `max_parallel` limit regardless of branch count

### NFR-004: Reliability
- **Error Isolation**: One branch failure must not crash handler or cancel other branches
- **Completion Guarantee**: Must wait for all branches to complete or timeout
- **Timeout Support**: Should respect individual node timeouts within branches

### NFR-005: Observability
- **Event Emission**: Must emit events for parallel start, branch start, branch complete, parallel complete
- **Result Tracking**: Must track success/failure counts for all branches
- **Error Details**: Must capture and report all branch failures with context

## Dependencies

### Internal
- `src/handlers/registry.js` - Handler base class
- `src/pipeline/outcome.js` - Outcome construction, PARTIAL_SUCCESS status
- `src/pipeline/context.js` - Context snapshot/clone
- `src/pipeline/engine.js` - May need `_executeSubgraph()` or branch execution logic
- `fs/promises` - Branch log directory creation
- `path` - Log path construction

### External
- Node.js built-in `events` - Event emission (if using EventEmitter pattern)
- Node.js built-in `worker_threads` - Optional, for true parallelism

### Similar Implementations
- Python version: `src/attractor/advanced_handlers.py:11-67`
- Uses `ThreadPoolExecutor` with `as_completed()` for result gathering

### New Status Type
- Need to add `PARTIAL_SUCCESS` to `StageStatus` enum in `src/pipeline/outcome.js`

## Open Questions

1. **How do branches know when to terminate?**
   - Option A: Execute until hitting terminal node (Msquare)
   - Option B: Execute until hitting next parallel/convergence node
   - Option C: Execute only immediate child node
   - **Decision**: Option C for MVP - execute only direct child nodes, defer graph traversal to separate handler (FanIn)

2. **Should we support branch timeouts?**
   - Python version doesn't have explicit branch timeout
   - Could add `branch_timeout` attribute
   - **Decision**: Defer to future enhancement, rely on node-level timeouts

3. **How do we handle context merging after parallel execution?**
   - Option A: Keep main context unchanged (branches are isolated)
   - Option B: Merge all branch contexts back (conflict resolution needed)
   - Option C: Store branch contexts in `parallel.branches.<id>` keys
   - **Decision**: Option C - store branch results in structured context keys

4. **Should parallel nodes support conditional branching?**
   - Could respect edge labels/weights for selective execution
   - Python version executes all outgoing edges
   - **Decision**: Execute all edges for MVP, add conditional support later

5. **How do we visualize parallel execution in logs?**
   - Create subdirectories: `logs/<parallel_node_id>/branch_<node_id>/`
   - Or flat structure: `logs/<parallel_node_id>_branch_<node_id>/`
   - **Decision**: Subdirectory structure for better organization

6. **Should we support wait-for-all vs wait-for-any semantics?**
   - wait-for-all: Succeed only if all branches succeed (current design)
   - wait-for-any: Succeed if any branch succeeds
   - **Decision**: wait-for-all for MVP, add `parallel_mode` attribute later

7. **Do we need PARTIAL_SUCCESS status?**
   - Python version has it, JavaScript doesn't
   - Useful for "continue if most succeed" patterns
   - **Decision**: Add PARTIAL_SUCCESS to StageStatus enum (breaking change but valuable)

8. **How do branches access main context values?**
   - Branches get snapshot at parallel node execution time
   - No live updates from main context during execution
   - **Decision**: Snapshot provides point-in-time isolation (correct behavior)
