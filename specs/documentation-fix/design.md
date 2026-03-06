# Design: Documentation Rewrite

## Overview

The Attractor documentation contains substantial inaccuracies - approximately 40% of the documented API surface describes interfaces that don't exist in the code. This spec addresses the comprehensive to accurately rewrite of all documentation reflect the actual implementation.

## Problem Statement

Current documentation issues:
1. **Fictional APIs**: Methods, classes, and properties that don't exist
2. **Wrong names**: Class names, method names that differ from implementation
3. **Missing features**: Features documented as implemented that aren't
4. **Wrong event shapes**: Event payloads don't match what's actually emitted
5. **Missing exports**: Components that should be exported but aren't
6. **Incorrect examples**: Code examples that won't work as shown

## Scope

This spec covers rewriting/fixing:
- `docs/api-reference.md` - Complete rewrite
- `docs/getting-started.md` - Fix node types table, configuration options
- `docs/advanced-features.md` - Remove "not implemented" labels, fix stylesheet names
- `README.md` - Fix node types table, $last_response example
- Export secrets from `src/index.js`

## Functional Requirements

### FR-001: Rewrite api-reference.md
**Type**: Ubiquitous  
**Statement**: The system shall rewrite the api-reference.md to accurately document all classes, methods, properties, events, and return types based on actual source code inspection.  
**Rationale**: Current document describes fictional APIs that don't exist.

### FR-002: Fix Attractor Class Documentation
**Type**: Ubiquitous  
**Statement**: The system shall document only the actual Attractor methods: `run()`, `on()`, `registerHandler()`, and static `create()`.  
**Rationale**: Methods like `runFromString()`, `resume()`, `validate()`, `once()`, `off()`, `emit()` don't exist.

### FR-003: Document Actual Event Shapes
**Type**: Ubiquitous  
**Statement**: The system shall document events with their actual payload shapes as emitted by PipelineEngine.  
**Rationale**: Current event documentation has wrong/missing fields.

### FR-004: Fix Outcome Class Documentation
**Type**: Ubiquitous  
**Statement**: The system shall document Outcome with correct method names (`fail()`, `skipped()`) and properties (`notes`, `failure_reason`).  
**Rationale**: Docs incorrectly say `failure()`, `skip()`, `message`, `data`.

### FR-005: Document Context Class Correctly
**Type**: Ubiquitous  
**Statement**: The system shall document the Context class with correct name and existing methods.  
**Rationale**: Documented as `PipelineContext` with `clear()` and `toJSON()` methods that don't exist.

### FR-006: Add Missing Node Types
**Type**: Ubiquitous  
**Statement**: The system shall add `component`, `tripleoctagon`, and `house` shapes to all node type tables.  
**Rationale**: These shapes are in SHAPE_TO_TYPE but omitted from docs.

### FR-007: Export Secrets Module
**Type**: Ubiquitous  
**Statement**: The system shall export secrets-related classes from the main package entry point.  
**Rationale**: Currently imports fail because secrets aren't exported.

### FR-008: Fix advanced-features.md
**Type**: Ubiquitous  
**Statement**: The system shall mark parallel execution as implemented and fix predefined stylesheet names.  
**Rationale**: Parallel is marked "Not Implemented" but works; `.budget()` doesn't exist.

### FR-009: Fix README.md Examples
**Type**: Ubiquitous  
**Statement**: The system shall fix the $last_response example to note it only works in FanInHandler.  
**Rationale**: $last_response doesn't expand in CodergenHandler.

## Dependencies

- Source code inspection required for all documents
- No external changes needed

## Open Questions

1. **Should we keep deprecated fictional APIs as "planned" features?**
   - Decision: No - document only what exists now
   
2. **How detailed should event documentation be?**
   - Decision: Document actual emitted fields, note if more may be added

3. **Should we add a changelog for documentation fixes?**
   - Decision: Yes, add a "Documentation History" section noting this rewrite
