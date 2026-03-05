# Design: ManagerLoop Handler

## Overview

ManagerLoop Handler implements the supervisor pattern for managing child pipelines. It iteratively monitors execution, gathers telemetry, consults an LLM for steering decisions, and continues or stops based on LLM guidance.

**Problem Statement**: Long-running or complex workflows need supervision that can dynamically decide when to continue, when to stop, or when to intervene based on evolving conditions.

**Solution**: Implement handler that runs observe-decide-act loop: gather telemetry from child pipeline, build decision prompt with context, invoke LLM for CONTINUE/STOP decision, repeat until max iterations or LLM says stop.

## Functional Requirements

### FR-001: Iteration Loop
**Type**: State-driven  
**Statement**: WHILE iterations < max_iterations, the system shall execute observe-decide-act cycle.

### FR-002: Telemetry Gathering
**Type**: Ubiquitous  
**Statement**: The system shall gather telemetry from child pipeline (checkpoint files, logs, metrics).

### FR-003: Decision Prompt Construction
**Type**: Ubiquitous  
**Statement**: The system shall build decision prompt including current telemetry, iteration count, and history.

### FR-004: LLM Decision Invocation
**Type**: Event-driven  
**Statement**: WHEN decision prompt is ready, the system shall invoke LLM backend for CONTINUE/STOP decision.

### FR-005: Stop Condition Parsing
**Type**: Event-driven  
**Statement**: WHEN LLM response contains "STOP", the system shall terminate loop and return success with reason.

### FR-006: Max Iterations Handling
**Type**: Unwanted Behavior  
**Statement**: IF max_iterations reached, THEN the system shall stop with PARTIAL_SUCCESS status.

### FR-007: Poll Interval
**Type**: State-driven  
**Statement**: WHILE iterating, the system shall wait poll_interval seconds between iterations.

### FR-008: Configuration Attributes
**Type**: Ubiquitous  
**Statement**: The system shall read attributes: child_pipeline, max_iterations (default 10), poll_interval (default 5).

## Non-Functional Requirements
- **NFR-001**: Support up to 100 iterations
- **NFR-002**: Telemetry gathering <1 second
- **NFR-003**: Configurable poll intervals 1-300 seconds

## Dependencies
- LLM Backend, child pipeline execution (future), Context

## Open Questions
1. How to execute child pipeline? **Decision**: Defer to v2, simulate telemetry for MVP
