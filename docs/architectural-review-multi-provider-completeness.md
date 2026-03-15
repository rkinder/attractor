# Architectural Review: Multi-Provider Orchestration Completeness

**Date:** 2026-03-15
**Scope:** Evaluation of Attractor as a complete web-based AI orchestration platform supporting Amazon Bedrock, Kilo Gateway, Anthropic Claude, and OpenAI-compatible endpoints (LM Studio, Ollama, vLLM, etc.)

---

## Executive Summary

Attractor has a solid architectural foundation: a DOT-graph execution engine, a handler registry, checkpoint/resume, a coordinator, and a reasonable multi-provider LLM client abstraction. However, several of the provider integrations it claims to support are either entirely absent (Bedrock, OpenAI native, Gemini) or not wired into the runtime (`gateway.js`). The frontend is a read-only observer with no pipeline creation, no human-in-the-loop UI, and no auth enforcement. The system is closer to an advanced prototype than a complete web-based orchestration platform.

---

## What Is Present and Well-Specified

- **Execution engine**: DAG traversal, handler registry with shape/type dispatch, retry logic, checkpoint/resume, and conditional edge routing are implemented and coherent.
- **Handler system**: Comprehensive coverage of execution patterns — sequential, parallel fan-out/fan-in, tool calls, human gates, MCP, stack loops.
- **LM Studio integration**: `lmstudio.js` is complete with streaming, connection testing, and a configurable base URL.
- **`gateway.js`**: A functional OpenAI-compatible generic adapter exists, covering Ollama, vLLM, Azure OpenAI, and any other OpenAI-format endpoint — though it is not yet wired into automatic environment detection.
- **Kilo Gateway**: The Kilo adapter with `createKiloAdapter` and `KiloModels` constants is functional.
- **Secrets management**: Multi-backend secrets resolution (env, AWS Secrets Manager, Azure Key Vault) is present.
- **Cost/usage tracking**: `usage-tracker.js` exists with per-model cost tables.
- **Containerization**: Multi-stage Dockerfile, `docker-compose.yml` with Redis, health check, non-root user.
- **Coordinator**: Decision engine with human approval/clarification channels, decision history, and Redis pub/sub for distribution.
- **Validation**: Pre-execution linting with configurable severity levels.

---

## Gaps and Missing Requirements

### 1. Missing OpenAI and Gemini Adapters — BLOCKER

**Area:** Portability — Provider Adapter Completeness

`client.js::fromEnv()` imports `./adapters/openai.js` and `./adapters/gemini.js`, neither of which exists. Any deployment using `OPENAI_API_KEY` or `GEMINI_API_KEY` will silently skip those providers — the `try/catch` around the dynamic import swallows the module-not-found error without warning. Vanilla OpenAI, Ollama, vLLM, and other OpenAI-compatible endpoints have no working automatic path. The existing `gateway.js` adapter handles this format but is not referenced in `fromEnv()`.

**Recommendation:** Write `openai.js` — it can be thin, reusing the `gateway.js` logic with `OPENAI_BASE_URL` defaulting to `https://api.openai.com`. Wire it into `fromEnv()`. Register `gateway.js` in `fromEnv()` via a generic `OPENAI_COMPATIBLE_BASE_URL` / `OPENAI_COMPATIBLE_API_KEY` pair so Ollama, vLLM, and similar endpoints can be configured without code changes. For Gemini, write or stub `gemini.js`.

---

### 2. No Amazon Bedrock Adapter — BLOCKER

**Area:** Portability — Amazon Bedrock

Bedrock is a stated integration target. There is no adapter, no env vars for it in `env.example`, and it is not referenced anywhere in the codebase.

**Recommendation:** Implement a `bedrock.js` adapter using the AWS SDK v3 `@aws-sdk/client-bedrock-runtime`. It should use the Converse API, which normalizes Claude, Titan, Llama, Mistral, and other models behind one interface. Add `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `BEDROCK_DEFAULT_MODEL` to `env.example`. Wire into `fromEnv()`.

---

### 3. Frontend Has No Pipeline Creation UI — BLOCKER

**Area:** Interface — Frontend Pipeline Creation

The UI is entirely read-only. Users can inspect pipeline executions but cannot submit a DOT workflow, select a provider/model, set variables, or trigger an execution from the browser. The `POST /pipelines` endpoint accepts `dot_source` but no UI surfaces it. This directly contradicts the "web-based orchestration" requirement.

**Recommendation:** Add a pipeline creation flow: at minimum, a text area for DOT source input with a submit button, and a provider/model selector dropdown. A Monaco-editor-based DOT editor would improve usability but is not required for MVP.

---

### 4. No Human-in-the-Loop Frontend — HIGH

**Area:** Interface — Human Approval UI

The backend exposes `/approve`, `/clarify`, `/context`, and `/questions` endpoints. No frontend component consumes them. Workflows that reach a `hexagon` (human gate) node are permanently stuck from the browser — there is no way for a user to unblock them without making raw API calls.

**Recommendation:** Add a `PipelineApproval` component on the detail page that polls `/questions` when a pipeline is in a waiting state and renders approve/revise/abort controls. Wire the controls to `POST /pipelines/:id/approve` and `POST /pipelines/:id/clarify`.

---

### 5. No API Authentication — HIGH

**Area:** Security — Authentication and Authorization

The backend API has no authentication middleware. The frontend stubs a `Bearer` token check in its Axios interceptor, but nothing on the server issues or validates tokens. Any process that can reach port 3000 can create pipelines, read all execution state, and approve human gates.

**Recommendation:** For internal or single-user deployments, a static pre-shared API key checked via Express middleware is sufficient and simple to implement. For multi-user deployments, add JWT validation using a library such as `jose`. Document the auth model and required environment variables in `env.example`.

---

### 6. Model Router Is Tightly Coupled to Kilo — HIGH

**Area:** AI Orchestration — Model Router Provider Coupling

`model-router.js` is built entirely on `KiloModels` — it imports Kilo model ID constants and returns them unconditionally from all selection paths. For any deployment without Kilo, the router returns Kilo-format model strings that will fail against Anthropic-direct, OpenAI-direct, or local model endpoints. The fallback logic in `getFallbackModel()` also returns Kilo model strings unconditionally.

**Recommendation:** Decouple the router from Kilo. Two viable approaches:

- **Option A:** Make the router accept provider-specific model name maps at construction time (passed in from the active provider configuration).
- **Option B:** Make the router return abstract tier names (`premium`, `balanced`, `budget`) and resolve those to concrete provider model IDs per-provider, with resolution living in each adapter.

Option B is more extensible and does not require callers to know which models a provider offers.

---

### 7. No API Versioning — MEDIUM

**Area:** Interface — API Contract Stability

All endpoints are at `/pipelines` with no version prefix. Any breaking change to the response shape, field names, or endpoint behavior will affect all clients simultaneously with no migration path.

**Recommendation:** Prefix routes with `/api/v1/`. This is a one-line change to the Express router registration now and an unavoidable breaking migration if deferred until clients depend on the current paths.

---

### 8. No Rate Limiting — MEDIUM

**Area:** Interface — Backpressure and Cost Protection

No rate limiting exists on `POST /pipelines`. A single client can submit an unbounded number of pipeline executions, each of which spawns LLM API calls against paid providers. This is both a denial-of-service vector and an uncontrolled cost exposure.

**Recommendation:** Add `express-rate-limit` on the pipeline creation endpoint. Add a configurable `MAX_CONCURRENT_PIPELINES` limit in `pipeline-manager.js` that returns `429` when exceeded.

---

### 9. Prompt Injection via `target_file` — MEDIUM

**Area:** Security — Prompt Injection and Input Validation

The `target_file` attribute in the `codergen` handler reads arbitrary filesystem paths into LLM context. A crafted DOT source submitted via `POST /pipelines` could include `target_file` pointing to sensitive files (`.env`, private keys, system files). No input sanitization is applied to DOT source before parsing or execution.

**Recommendation:** Restrict `target_file` to paths within `ARTIFACTS_DIR` or an explicit per-deployment allowlist configured in env. Validate and sanitize DOT source on receipt before the parser runs. If the API is externally accessible, this is a critical data exfiltration vulnerability, not deferred design debt.

---

### 10. No Structured Logging with Correlation IDs — MEDIUM

**Area:** Observability — Structured Logging

There is no evidence of structured logging (JSON log lines) or per-pipeline correlation IDs flowing through log statements. Diagnosing why a specific pipeline failed at a specific step requires manual, unstructured log search.

**Recommendation:** Add `pino` or an equivalent structured logger. Attach the pipeline UUID (`run_id`) to every log statement emitted during execution. This enables targeted post-incident queries: `jq 'select(.run_id == "abc-123")' app.log`.

---

### 11. No Context Window Budget Management — MEDIUM

**Area:** AI Orchestration — Token Budget Management

No per-node or per-pipeline token budget is enforced. Pipelines with deep context accumulation, large file reads via `target_file`, or long persona files can silently exceed provider context limits, producing truncated or failed completions with no pre-flight warning.

**Recommendation:** Add a `max_context_tokens` attribute to nodes. Add a pre-call estimation step in `codergen.js` that measures the assembled prompt token count before dispatch and either fails fast or truncates with an explicit warning when the budget would be exceeded.

---

### 12. `gateway.js` Streaming Not Implemented — MEDIUM

**Area:** Portability — OpenAI-Compatible Streaming

`gateway.js::stream()` throws `"Streaming not implemented for gateway adapter"`. Any OpenAI-compatible endpoint routed through this adapter (Ollama, vLLM, Azure OpenAI) cannot stream responses, increasing perceived latency significantly for interactive use.

**Recommendation:** The `lmstudio.js` adapter has a complete SSE streaming implementation. The `gateway.js` adapter should use the same pattern — it is approximately 60 lines to copy and parameterize from the existing implementation.

---

### 13. `env.example` Is Incomplete — MEDIUM

**Area:** Operational Readiness — Configuration Documentation

`env.example` documents LM Studio, Anthropic, and OpenAI API key, but omits: Kilo (`KILO_API_KEY`, `KILO_CONFIG`, `KILO_ORG_ID`, `KILO_TASK_ID`), Gemini (`GEMINI_API_KEY`, `GOOGLE_API_KEY`), Bedrock (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_DEFAULT_MODEL`), and generic gateway (`OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`). Several coordinator and storage variables are also absent.

**Recommendation:** `env.example` should be the single authoritative reference for all configurable values. Every environment variable the system reads should appear in it, commented out with a description and example value.

---

### 14. No Prompt Versioning — LOW

**Area:** AI Orchestration — Prompt Change Management

Prompts are files on disk with no versioning mechanism. There is no way to pin a pipeline to a specific prompt version, roll back a prompt change, or know which prompt version produced a given execution output.

**Recommendation:** At minimum, log the git SHA of the prompt file at execution time (accessible via `git hash-object`). Longer term, add a `prompt_version` field to execution records and support referencing prompts by content hash.

---

### 15. No Model Version Pinning — LOW

**Area:** AI Orchestration — Model Version Drift

Model names are strings (`claude-sonnet-4-5`, `gpt-4o`). Providers silently update behavior under the same model name without notice. A pipeline producing correct results today may not produce the same results after a provider-side update.

**Recommendation:** Support and encourage versioned model name pinning in DOT attributes and `env.example` (e.g., `claude-sonnet-4-5-20251001` rather than `claude-sonnet-4-5`). Document the risk and the pinning approach in the README.

---

### 16. No API Documentation — LOW

**Area:** Operational Readiness — API Contract

No OpenAPI/Swagger specification exists. Integration contracts are only discoverable by reading Express route registrations.

**Recommendation:** Add `swagger-jsdoc` and `swagger-ui-express` to generate and serve a spec at `/api/docs`. JSDoc annotations on route handlers are sufficient to drive the spec generation.

---

## Clarifying Questions

1. **Bedrock requirement hardness**: Is Amazon Bedrock a committed integration or an aspirational target? Kilo Gateway already provides access to Bedrock-hosted models for some configurations — if that coverage is sufficient, the standalone Bedrock adapter priority may be lower.

2. **Multi-user vs. single-operator**: Is this orchestrator intended for multiple independent users submitting their own pipelines, or for a single operator running a shared workflow server? This determines whether auth requires role-based access control or whether a simpler shared-secret model suffices.

3. **Frontend DOT authoring scope**: Should the web UI include a full DOT workflow editor (node/edge visual builder), or is the intent that workflows are always authored externally and submitted via API or mounted volume? This significantly scopes the pipeline creation work.

4. **Ollama vs. LM Studio differentiation**: Both are OpenAI-compatible. Is there a preference for how they are differentiated in the adapter layer, or should both resolve through a single generic OpenAI-compatible adapter configured with different base URLs?

---

## Priority Order for Resolution

| Priority | Item | Rationale |
|----------|------|-----------|
| 1 | Write `openai.js` adapter; wire `gateway.js` into `fromEnv()` | Without this, Ollama, vLLM, OpenAI, and Azure are all silently broken. One file, one `fromEnv()` block. Highest impact, lowest effort. |
| 2 | Implement Bedrock adapter | Stated requirement. Needed before the system can be presented as multi-provider complete. |
| 3 | Add pipeline creation UI | Without this, "web-based orchestration" is not met — the browser is only a dashboard. |
| 4 | Add human-in-the-loop UI | Human gate nodes (`hexagon`) are currently terminal states from the browser. Blocks any HitL workflow from completing via the UI. |
| 5 | Add authentication middleware | The API is completely open. A static pre-shared key is a non-trivial security improvement and unblocks safe deployment outside localhost. |
| 6 | Decouple model router from Kilo | Any non-Kilo deployment receives invalid model strings from the router, causing silent failures or errors at model dispatch time. |
| 7 | Guard `target_file` against path traversal | Exploitable data exfiltration vulnerability in deployments with external API access. |
| 8 | Add rate limiting | Uncontrolled cost exposure and DoS vector. `express-rate-limit` is a 10-line addition. |
| 9 | Implement `gateway.js` streaming | Degrades user experience for all OpenAI-compatible local endpoints. ~60 lines to implement from the existing `lmstudio.js` pattern. |
| 10 | Add `/api/v1/` routing prefix | One-line change now; a breaking migration if deferred until clients depend on current paths. |
| 11 | Complete `env.example` | Low effort, high operational value. Every undocumented env var is a future support and onboarding burden. |
| 12 | Add structured logging with correlation IDs | Required before production operation. Start with `pino` and `run_id` on the critical execution path. |
