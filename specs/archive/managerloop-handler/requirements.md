# Requirements: ManagerLoop Handler

## Technical Specifications

### REQ-001: ManagerLoopHandler Class
Create class in `src/handlers/managerloop.js`, extend Handler, accept backend in constructor.

### REQ-002: Attribute Extraction
Extract `child_pipeline`, `max_iterations` (default 10), `poll_interval` (default 5) from node attributes.

### REQ-003: Iteration Loop
Implement while loop: `iteration < max_iterations`, execute telemetry → prompt → LLM → decision.

### REQ-004: Telemetry Gathering
Implement `_gatherTelemetry()` that returns object with iteration, status, progress. Simulate for MVP.

### REQ-005: Decision Prompt Construction
Build prompt with node.prompt base, append telemetry section, iteration info, history summary.

### REQ-006: LLM Invocation
Call `backend.run()` with decision prompt, write to `iteration_N_prompt.md` and `iteration_N_decision.md`.

### REQ-007: Decision Parsing
Check if response contains "STOP" (case-insensitive), extract reason after colon if present.

### REQ-008: Continue Decision
If "CONTINUE" in response, wait poll_interval seconds, increment iteration, loop again.

### REQ-009: Stop Outcome
Return `Outcome.success()` with notes explaining why stopped, include iteration count and telemetry in context.

### REQ-010: Max Iterations Reached
Return `Outcome` with PARTIAL_SUCCESS status, notes indicating max reached.

### REQ-011: Poll Interval Wait
Use `setTimeout()` wrapped in Promise or `await new Promise(resolve => setTimeout(resolve, ms))`.

### REQ-012: Logging
Write iteration logs to `<stageDir>/iteration_N_prompt.md`, `iteration_N_decision.md`.

## Test Cases
- TC-001: Loop runs until STOP decision
- TC-002: Max iterations reached returns PARTIAL_SUCCESS
- TC-003: Poll interval enforced between iterations
- TC-004: Telemetry included in prompt
- TC-005: LLM decision parsed correctly
- TC-006: Stop reason extracted from response
- TC-007: History included in decision prompt

## Estimated Effort: ~6 hours
