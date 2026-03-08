# Design: Safe Condition Evaluator

## Overview

The pipeline engine uses JavaScript's `eval()` to evaluate edge conditions, which is a security risk and reliability issue. This spec addresses replacing eval() with a proper expression parser.

## Problem Statement

1. `engine.js:350` uses `eval()` for condition evaluation
2. Security risk: arbitrary code execution if conditions are user-provided
3. Reliability: eval can cause hard-to-debug issues
4. Limited functionality: only supports basic operators

## Functional Requirements

### FR-001: Replace eval() with Expression Parser
**Type**: Ubiquitous  
**Statement**: The system shall evaluate edge conditions using a safe expression parser instead of eval().  
**Rationale**: Eliminate security vulnerability.

### FR-002: Support Comparison Operators
**Type**: Ubiquitous  
**Statement**: The system shall support: `=`, `!=`, `>`, `<`, `>=`, `<=`.  
**Rationale**: Enable numeric comparisons.

### FR-003: Support Logical Operators
**Type**: Ubiquitous  
**Statement**: The system shall support: `AND`, `OR`, `&&`, `||`.  
**Rationale**: Enable complex conditions.

### FR-004: Support Context Variables
**Type**: Ubiquitous  
**Statement**: The system shall replace `context.<key>` and bare `<key>` with context values.  
**Rationale**: Enable dynamic conditions based on pipeline state.

### FR-005: Handle Errors Gracefully
**Type**: Unwanted Behavior  
**Statement**: IF a condition evaluates to an error, THEN return false and log a warning (not throw).  
**Rationale**: Prevent pipeline crashes from bad conditions.

## Dependencies

- `src/pipeline/engine.js` - Replace `_evaluateCondition()` method

## Non-Functional Requirements

### NFR-001: Performance
- Condition evaluation must complete in < 1ms
- No significant impact on edge selection

### NFR-002: Backward Compatibility
- Must support existing condition syntax
- `outcome=success` must still work

## Open Questions

1. **Which parser to use?**
   - Option A: Implement simple recursive descent parser (~100 lines)
   - Option B: Use npm package like mathjs or expr-eval
   - Decision: Implement simple parser to avoid new dependencies

2. **Should we support functions?**
   - Decision: No for MVP, add later if needed
