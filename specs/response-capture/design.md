# Design: LLM Response Capture Bug Fix

## Overview

The system should capture LLM responses in `response.md` files within each node's log directory, and store them in the pipeline context as `last_response`. Currently, the `response.md` files are being created but remain empty, and context updates for `last_response` are empty strings.

## Problem Statement

When a pipeline node executes an LLM call:
1. The prompt is correctly written to `prompt.md`
2. The `response.md` file is created but remains empty (0 bytes)
3. The `status.json` shows `"last_response": ""`
4. This breaks variable expansion for downstream nodes that depend on `$last_response`

## Root Cause Analysis

The response capture flow is:
```
CodergenHandler.execute()
  → backend.run() [SessionBackend]
    → session.processInput(prompt)
      → llm_client.complete(request)
      → response stored in history as AssistantTurn
    → extract lastAssistantTurn from history
    → return content
  → responseText = String(result)
  → write response.md with responseText
  → set context[LAST_RESPONSE] = responseText
```

The issue is likely in one of these locations:
1. `session.processInput()` may not be returning the response correctly
2. The history extraction may be failing to find the assistant turn
3. The response.text may not be populated from the adapter

## Functional Requirements

### FR-001: Capture LLM Response in response.md
**Type**: Ubiquitous  
**Statement**: The system shall write the LLM's complete response text to `<node-dir>/response.md` for every executed node.  
**Rationale**: Users need to inspect LLM outputs for debugging and auditing.

### FR-002: Store Response in Context
**Type**: Ubiquitous  
**Statement**: The system shall store the LLM response in the pipeline context under key `last_response` for use by downstream nodes.  
**Rationale**: Enables variable expansion like `$last_response` in prompts.

### FR-003: Preserve Full Response
**Type**: Ubiquitous  
**Statement**: The system shall capture the full response text without truncation in `response.md`, while storing up to 200 characters in context.  
**Rationale**: Debugging requires full output; context has size limits.

### FR-004: Handle Empty Responses Gracefully
**Type**: Unwanted Behavior  
**Statement**: IF the LLM returns an empty response, THEN the system shall write a placeholder message to `response.md` and set context `last_response` to empty string (not crash).  
**Rationale**: Prevents crashes from edge cases.

## Non-Functional Requirements

### NFR-001: No Performance Impact
- Response capture must not add noticeable latency to LLM calls

### NFR-002: Backward Compatibility
- Fix must not break existing working functionality
- Same API for downstream consumers

## Dependencies

- `src/handlers/codergen.js` - CodergenHandler
- `src/handlers/codergen.js` - SessionBackend  
- `src/agent/session.js` - Session class
- `src/llm/adapters/` - Adapter response parsing

## Open Questions

1. **Should we also capture reasoning/thinking process?**
   - Decision: Capture in separate field, add to response.md if present

2. **What about streaming responses?**
   - Decision: Capture complete response only (not partial streams)

3. **Should response.md include metadata?**
   - Decision: Keep simple - just the text response for now
