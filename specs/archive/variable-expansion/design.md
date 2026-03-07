# Design: Variable Expansion Enhancement

## Overview

Variable expansion allows DOT workflow nodes to reference runtime values like previous responses, current node ID, or context keys in their prompts. Currently, only `$goal` is expanded in CodergenHandler, while other handlers have inconsistent or missing support.

## Problem Statement

1. **CodergenHandler** only expands `$goal`
2. **FanInHandler** expands `$goal`, `$last_response`, and `$<nodeId>.output`
3. Other handlers don't support variable expansion
4. No consistency across the codebase

## Functional Requirements

### FR-001: Universal Variable Expansion in CodergenHandler
**Type**: Ubiquitous  
**Statement**: The system shall expand all supported variable types in CodergenHandler prompts: `$goal`, `$last_response`, `$current_node`, and `$context.<key>`.  
**Rationale**: Users expect to reference previous responses in prompts.

### FR-002: Consistent Variable Syntax
**Type**: Ubiquitous  
**Statement**: The system shall support consistent variable syntax across all handlers: `$goal`, `$last_response`, `$current_node`, `$<nodeId>.output`, `$context.<key>`.  
**Rationale**: Predictable syntax improves usability.

### FR-003: Safe Variable Expansion
**Type**: Ubiquitous  
**Statement**: The system shall handle missing variables gracefully, replacing them with empty strings or a configurable default.  
**Rationale**: Prevent crashes from undefined variables.

## Non-Functional Requirements

### NFR-001: Performance
- Variable expansion must not noticeably impact LLM call latency
- Use regex replace which is O(n) in prompt length

### NFR-002: Extensibility
- New variable types should be easy to add
- Document expansion order/priority

## Dependencies

- `src/handlers/codergen.js` - Main target for enhancement

## Open Questions

1. **Should we support default values like `$last_response|default`?**
   - Decision: Add to future enhancement, not MVP

2. **Should we escape expanded values to prevent injection?**
   - Decision: Yes, sanitize before sending to LLM
