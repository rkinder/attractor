# Design: Critical Bug Fixes

## Overview

This spec addresses critical bugs in the Attractor codebase that prevent features from working as documented or cause runtime failures. These bugs were identified through code analysis and must be fixed before any new features are added.

## Problem Statement

The Attractor codebase has multiple bugs that:
1. Cause runtime failures (FanInHandler not registered)
2. Prevent examples from executing (entry point guards)
3. Break workflow execution (run-with-kilo.js missing handlers)
4. Cause incorrect behavior (run-workflow.js wrong property names)

## Bug Summary

| Bug ID | Severity | Description | Location |
|--------|----------|-------------|----------|
| BUG-001 | Critical | FanInHandler not registered in `_setupDefaultHandlers()` | `src/index.js:193-221` |
| BUG-002 | High | Example entry point guard missing `file://` prefix | `examples/run-*.js` |
| BUG-003 | High | run-with-kilo.js uses `new Attractor()` instead of `Attractor.create()` | `run-with-kilo.js` |
| BUG-004 | Medium | run-workflow.js references `outcome.message` (should be `outcome.notes`) | `run-workflow.js` |
| BUG-005 | Medium | run-workflow.js listens for non-existent `human_input_required` event | `run-workflow.js` |
| BUG-006 | Medium | Context key mismatch: ParallelHandler stores results differently than FanInHandler expects | `parallel.js` vs `fanin.js` |

## Functional Requirements

### FR-001: Register FanInHandler in Handler Registry
**Type**: Ubiquitous  
**Statement**: The system shall register the `FanInHandler` class in the handler registry during Attractor initialization so that `tripleoctagon` shaped nodes can be processed.  
**Rationale**: Without registration, workflows using `shape=tripleoctagon` for branch consolidation will fail at runtime.

### FR-002: Fix Example Entry Point Guards
**Type**: Ubiquitous  
**Statement**: The system shall use the correct entry point guard pattern `import.meta.url === \`file://${process.argv[1]}\`` in all example runner scripts to enable direct execution.  
**Rationale**: The current pattern `import.meta.url === process.argv[1]` never evaluates to true because `import.meta.url` always includes the `file://` prefix.

### FR-003: Fix run-with-kilo.js Handler Registration
**Type**: Ubiquitous  
**Statement**: The system shall use `Attractor.create()` or manually register all default handlers in `run-with-kilo.js` to ensure non-codergen node types work correctly.  
**Rationale**: Using `new Attractor()` directly skips `_setupDefaultHandlers()`, leaving only the codergen handler registered.

### FR-004: Fix run-workflow.js Property References
**Type**: Ubiquitous  
**Statement**: The system shall reference `outcome.notes` instead of `outcome.message` in `run-workflow.js` to correctly access the outcome notes.  
**Rationale**: The `Outcome` class uses `notes` property, not `message`.

### FR-005: Remove Non-existent Event Listener
**Type**: Ubiquitous  
**Statement**: The system shall remove the listener for `human_input_required` event from `run-workflow.js` since this event is never emitted by the engine.  
**Rationale**: Registering listeners for non-existent events creates confusion and potential memory leaks.

### FR-006: Align ParallelHandler and FanInHandler Context Keys
**Type**: Ubiquitous  
**Statement**: The system shall ensure ParallelHandler stores branch outputs in keys that FanInHandler can read, specifically `${nodeId}.output` format.  
**Rationale**: Currently ParallelHandler stores `parallel.branches.<id>.*` but FanInHandler looks for `<nodeId>.output`, causing consolidation to fail.

## Non-Functional Requirements

### NFR-001: Backward Compatibility
- Bug fixes must not break existing working functionality
- All existing tests must continue to pass

### NFR-002: Verification
- Each bug fix must be verified by running the affected code path
- Document expected behavior after fix

## Dependencies

- No external dependencies required
- All fixes are to existing source files

## Open Questions

None - all bugs have clear solutions identified.
