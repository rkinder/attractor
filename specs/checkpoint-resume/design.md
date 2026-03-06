# Design: Checkpoint Resume

## Overview

Attractor supports saving checkpoints during pipeline execution to enable resume after failure or interruption. However, the resume functionality is not implemented - only checkpoint saving works.

## Problem Statement

1. Checkpoint saving is implemented in `PipelineEngine._saveCheckpoint()`
2. No public API exists to resume from a saved checkpoint
3. Users cannot recover from failures without restarting from scratch

## Functional Requirements

### FR-001: Resume from Checkpoint
**Type**: Event-driven  
**Statement**: WHEN a pipeline fails or is interrupted, the system shall provide a method to resume execution from the last saved checkpoint.  
**Rationale**: Enable recovery from failures without restarting.

### FR-002: Checkpoint Discovery
**Type**: Ubiquitous  
**Statement**: The system shall be able to discover existing checkpoints for a given run ID.  
**Rationale**: Enable listing available checkpoints.

### FR-003: Checkpoint Validation
**Type**: Ubiquitous  
**Statement**: The system shall validate checkpoint integrity before attempting to resume.  
**Rationale**: Prevent resume attempts with corrupted checkpoints.

## Dependencies

- `src/pipeline/engine.js` - Add resume method
- `src/pipeline/context.js` - May need load from snapshot
- `src/pipeline/parser.js` - May need to reload graph

## Open Questions

1. **Should resume be a method on Attractor or PipelineEngine?**
   - Decision: PipelineEngine for isolation, Attractor exposes it

2. **How do we handle DOT source changes between checkpoint and resume?**
   - Decision: Require same DOT file, warn if changed
