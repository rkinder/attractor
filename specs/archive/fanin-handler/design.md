# Design: FanIn Handler

## Overview

The FanIn Handler consolidates results from multiple parallel branches using LLM-powered analysis. This feature enables pipelines to collect outputs from concurrent operations and synthesize them into a unified summary, making it the natural complement to the Parallel Handler.

**Problem Statement**: After executing multiple branches in parallel (e.g., analyzing different data sources, running multiple experiments, gathering diverse perspectives), pipelines need a way to consolidate these disparate results into a coherent, unified output. Without a fan-in mechanism, parallel execution results remain fragmented and difficult to use in downstream processing.

**Solution**: Implement a `FanInHandler` class that collects outputs from all incoming edges, constructs a consolidation prompt containing all branch results, invokes an LLM to synthesize the information, and returns a unified outcome. This mirrors the Python implementation while leveraging the existing JavaScript LLM backend infrastructure.

## Architecture

### Components

1. **FanInHandler** (`src/handlers/fanin.js`)
   - Extends `Handler` base class
   - Collects results from all incoming edges
   - Builds consolidation prompt with branch outputs
   - Invokes LLM backend for synthesis
   - Returns unified outcome with consolidated result

2. **Backend Integration**
   - Reuses existing LLM backend from CodergenHandler
   - Supports same model selection and stylesheet features
   - Simulation mode for testing without LLM

3. **Handler Registry Integration** (`src/handlers/registry.js`)
   - Already maps `tripleoctagon` shape to `parallel.fan_in` type (line 12)
   - No changes needed - registry is ready

4. **Graph Integration**
   - Uses existing `graph.getIncomingEdges(node.id)` method
   - Reads branch outputs from context using node-specific keys

### Data Flow

```
Parallel Execution:
  Branch 1 → Context['branch1.output'] = "Result A"
  Branch 2 → Context['branch2.output'] = "Result B"
  Branch 3 → Context['branch3.output'] = "Result C"
                    ↓
            FanIn Node (tripleoctagon)
                    ↓
         Collect incoming edge sources
                    ↓
         Extract outputs from context:
           - branch1.output: "Result A"
           - branch2.output: "Result B"
           - branch3.output: "Result C"
                    ↓
         Build consolidation prompt:
           "Consolidate the following results:
            ## Result 1 (from branch1)
            Result A
            ## Result 2 (from branch2)
            Result B
            ## Result 3 (from branch3)
            Result C"
                    ↓
            Call LLM Backend
                    ↓
         Unified Response: "Consolidated summary..."
                    ↓
         Store in Context['fanin_node.output']
                    ↓
         Return SUCCESS outcome
```

### Integration with Parallel Handler

**Typical Pattern**:
```dot
parallel [shape=component]
  → branch1 [shape=box]
  → branch2 [shape=box]
  → branch3 [shape=box]
    → fanin [shape=tripleoctagon]
      → next_step
```

The FanIn node serves as a convergence point where parallel paths reunite.

## Functional Requirements

### FR-001: Incoming Edge Discovery
**Type**: Ubiquitous  
**Statement**: The system shall identify all incoming edges to a fanin node and extract the source node IDs.  
**Rationale**: Core functionality - must know which branches to consolidate.

### FR-002: Branch Output Collection
**Type**: Ubiquitous  
**Statement**: The system shall collect outputs from all source nodes by reading context keys in the format `<source_node_id>.output`.  
**Rationale**: Branch results must be gathered before consolidation.

### FR-003: Empty Incoming Edge Handling
**Type**: Unwanted Behavior  
**Statement**: IF a fanin node has no incoming edges, THEN the system shall immediately return Outcome.success() without LLM invocation.  
**Rationale**: Degenerate case - no inputs means no consolidation needed.

### FR-004: Missing Branch Output Handling
**Type**: Unwanted Behavior  
**Statement**: IF a source node's output key is missing from context, THEN the system shall skip that branch and log a warning, continuing with available outputs.  
**Rationale**: Partial data is better than complete failure; allows graceful degradation.

### FR-005: Consolidation Prompt Construction
**Type**: Ubiquitous  
**Statement**: The system shall construct a consolidation prompt containing the node's prompt (or default), goal substitution, and all branch results formatted with headers.  
**Rationale**: LLM needs structured input with all branch information.

### FR-006: Default Prompt Injection
**Type**: Optional Feature  
**Statement**: WHERE the node's prompt does not contain the word "consolidate", the system shall append the instruction "Consolidate these results into a unified summary."  
**Rationale**: Ensures LLM understands consolidation intent even with minimal prompts.

### FR-007: Variable Expansion in Prompt
**Type**: Ubiquitous  
**Statement**: The system shall expand variables in the fanin prompt using the same variable substitution mechanism as CodergenHandler (e.g., `$goal`, `$last_response`).  
**Rationale**: Consistency with other handlers and dynamic prompt construction.

### FR-008: LLM Backend Invocation
**Type**: Ubiquitous  
**Statement**: The system shall invoke the LLM backend with the consolidation prompt and node attributes to generate a unified summary.  
**Rationale**: LLM performs the actual consolidation analysis.

### FR-009: Success Outcome Generation
**Type**: Event-driven  
**Statement**: WHEN the LLM backend returns successfully, the system shall return Outcome.success() with the consolidated response stored in context key `<fanin_node_id>.output`.  
**Rationale**: Consolidated result must be available to downstream nodes.

### FR-010: Backend Error Handling
**Type**: Unwanted Behavior  
**Statement**: IF the LLM backend throws an exception, THEN the system shall return Outcome.fail() with the error message as failure reason.  
**Rationale**: LLM failures should not crash the handler but should halt pipeline gracefully.

### FR-011: Simulation Mode Support
**Type**: Optional Feature  
**Statement**: WHERE no LLM backend is configured, the system shall generate a simulated consolidation message and return success for testing purposes.  
**Rationale**: Enables pipeline validation without requiring LLM access.

### FR-012: Consolidation Logging
**Type**: Ubiquitous  
**Statement**: The system shall write the consolidation prompt to `<stage_dir>/prompt.md` and the LLM response to `<stage_dir>/response.md`.  
**Rationale**: Enables debugging and auditing of consolidation operations.

### FR-013: Branch Count Tracking
**Type**: Ubiquitous  
**Statement**: The system shall include the number of consolidated branches in the outcome notes (e.g., "Consolidated 3 branch results").  
**Rationale**: Provides visibility into consolidation scope for monitoring.

### FR-014: Output Context Storage
**Type**: Ubiquitous  
**Statement**: The system shall store the consolidated response in context with key `<fanin_node_id>.output` for use by downstream nodes.  
**Rationale**: Standard pattern for storing node outputs.

## Non-Functional Requirements

### NFR-001: Performance
- **Prompt Construction**: Must build consolidation prompt within 20ms (excluding branch output reads)
- **LLM Latency**: Consolidation time depends on LLM backend (typically 1-5 seconds)

### NFR-002: Prompt Size Limits
- **Branch Count**: Should support consolidating up to 50 branches
- **Output Size**: Should handle branch outputs up to 10KB each (total prompt < 500KB)
- **LLM Context**: Must respect model context window limits (warn if exceeded)

### NFR-003: Error Resilience
- **Missing Outputs**: Must handle missing branch outputs gracefully (skip with warning)
- **Backend Failures**: Must capture and report LLM errors without crashing
- **Empty Results**: Must handle case where no branch outputs are available

### NFR-004: Observability
- **Branch Tracking**: Logs must show which branches were consolidated
- **Missing Data**: Warnings must identify branches with missing outputs
- **Consolidation Quality**: Response must be logged for manual review

### NFR-005: Consistency
- **Backend Reuse**: Must use same backend interface as CodergenHandler
- **Variable Expansion**: Must support same variable syntax as CodergenHandler
- **Log Format**: Must follow same logging conventions as other handlers

## Dependencies

### Internal
- `src/handlers/registry.js` - Handler base class
- `src/handlers/codergen.js` - Variable expansion method (may extract to utility)
- `src/pipeline/outcome.js` - Outcome construction
- `src/pipeline/context.js` - Context key reading
- `src/pipeline/graph.js` - Incoming edge discovery
- `fs/promises` - Log file writing
- `path` - Log path construction

### External
- LLM Backend - Same as CodergenHandler (Kilo, Anthropic, OpenAI, etc.)
- Node.js built-ins only (no new dependencies)

### Similar Implementations
- Python version: `src/attractor/advanced_handlers.py:112-182`
- Uses same pattern: collect → prompt → LLM → store

### Shared Code Opportunities
- Variable expansion logic from CodergenHandler
- Backend interface (already shared)
- Logging utilities (already shared)

## Open Questions

1. **Should we support custom consolidation templates?**
   - Current: Fixed format "## Result N (from nodeX)"
   - Alternative: Allow customizable format in node attributes
   - **Decision**: Fixed format for MVP, add template support later if requested

2. **How do we handle very large branch outputs?**
   - Option A: Truncate outputs to fit context window
   - Option B: Fail with error if prompt too large
   - Option C: Split into multiple consolidation passes
   - **Decision**: Option B for MVP - fail fast, document limits

3. **Should we support selective branch consolidation?**
   - Could add attribute to filter which branches to include
   - Python version consolidates all incoming edges
   - **Decision**: Consolidate all for MVP, add filtering later

4. **What if branch outputs have different formats (JSON vs text)?**
   - Should we normalize or preserve formats?
   - Current: Pass through as-is to LLM
   - **Decision**: LLM can handle mixed formats, no normalization needed

5. **Should we support weighted consolidation?**
   - Could prioritize some branch results over others
   - Edge labels could indicate weights
   - **Decision**: Equal weight for MVP, defer to future enhancement

6. **Do we need explicit ordering of branch results?**
   - Python version preserves edge order
   - Important for deterministic prompts
   - **Decision**: Yes, preserve edge order for consistency

7. **Should fanin nodes support optional branches?**
   - Continue if some branches missing (current: yes, with warning)
   - Or require all branches present?
   - **Decision**: Current approach is correct (graceful degradation)

8. **Should we cache consolidation results?**
   - Same inputs → same consolidation (deterministic if LLM is)
   - Could reduce costs for pipeline retries
   - **Decision**: Defer to future enhancement (caching is complex)

9. **How do we handle structured outputs (JSON) from branches?**
   - Should we parse and format specially?
   - Or pass raw to LLM?
   - **Decision**: Pass raw for MVP, LLM can parse JSON

10. **Should consolidation be optional (pass-through mode)?**
    - Could add `consolidate=false` to skip LLM and just merge
    - Python version always calls LLM
    - **Decision**: Always consolidate for MVP, matches Python behavior
