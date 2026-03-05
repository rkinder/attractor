# Feature Comparison: JavaScript vs Python Attractor

## Executive Summary

The Python version (`/home/kinderrs/src/python/attractor`) is more mature and includes several advanced features not present in the JavaScript version (`/home/kinderrs/src/ai/attractor`). This document identifies those features and assesses their porting complexity.

---

## Feature Comparison Matrix

| Feature | JavaScript (AI) | Python | Porting Priority |
|---------|-----------------|--------|------------------|
| DOT-based pipelines | ✅ | ✅ | N/A |
| Multi-provider LLM | ✅ (Kilo, Anthropic, OpenAI, Gemini) | ✅ (Bedrock, Azure, OpenAI, Anthropic, custom) | Medium |
| Human-in-the-loop | ✅ | ✅ | N/A |
| Checkpoint/Resume | ✅ | ✅ | N/A |
| Validation/Linting | ✅ | ✅ | N/A |
| Model Stylesheets | ✅ | ✅ | N/A |
| Usage/Cost Tracking | ✅ | ✅ | N/A |
| **Parallel Handler** | ❌ | ✅ | **High** |
| **Tool Handler** | ❌ | ✅ | **High** |
| **FanIn Handler** | ❌ | ✅ | **High** |
| **ManagerLoop Handler** | ❌ | ✅ | Medium |
| **MCP Integration** | ❌ | ✅ | **High** |
| **HTTP Server** | ❌ | ✅ | **High** |
| **CLI** | ⚠️ (scripts) | ✅ (argparse) | Medium |
| **Secrets Management** | ⚠️ (env vars only) | ✅ (AWS, Azure, Env) | **High** |
| **Advanced Gateway Config** | ⚠️ (basic) | ✅ (JSON config) | Medium |

---

## Features to Port

### 1. Parallel Handler (High Priority)

**Location**: `src/attractor/advanced_handlers.py:11-67`

**Description**: Executes multiple branches concurrently using `ThreadPoolExecutor`. Supports `max_parallel` attribute to limit concurrent workers.

**Implementation**:
- Uses `ThreadPoolExecutor` with configurable `max_workers`
- Creates isolated context snapshots for each branch
- Aggregates results with success/partial_success/fail status

**Porting Effort**: Medium - Requires implementing thread-based concurrency in Node.js

---

### 2. Tool Handler (High Priority)

**Location**: `src/attractor/advanced_handlers.py:70-108`

**Description**: Executes external shell commands as pipeline nodes. Supports `tool_command` and `timeout` attributes.

**Implementation**:
- Uses Python's `subprocess.run()` with shell execution
- Captures stdout/stderr
- Respects timeout parameter

**Porting Effort**: Low - Node.js has built-in `child_process` module

---

### 3. FanIn Handler (High Priority)

**Location**: `src/attractor/advanced_handlers.py:111-182`

**Description**: Consolidates results from parallel branches using LLM. Creates a unified summary from multiple branch outputs.

**Implementation**:
- Collects outputs from incoming edges
- Builds consolidation prompt with all branch results
- Calls backend LLM to produce unified summary

**Porting Effort**: Medium - Depends on LLM client availability

---

### 4. MCP Integration (High Priority)

**Location**: `src/attractor/mcp_client.py`

**Description**: Model Context Protocol support for calling external tools via MCP servers.

**Implementation**:
- `MCPClient` class manages server processes
- Supports `mcp_servers` configuration (JSON)
- JSON-RPC protocol for tool listing and calling
- Server lifecycle management (start/stop)

**Node Attributes**:
- `mcp_server`: Server name from config
- `mcp_tool`: Tool name to invoke
- `mcp_args`: JSON arguments for tool

**Porting Effort**: Medium - Requires implementing JSON-RPC client and subprocess management

---

### 5. HTTP Server (High Priority)

**Location**: `src/attractor/server.py`

**Description**: FastAPI-based REST API for remote pipeline execution.

**Features**:
- `POST /pipelines` - Submit and execute pipeline
- `GET /pipelines/{id}` - Get execution status
- `GET /pipelines` - List all pipelines
- `POST /pipelines/{id}/cancel` - Cancel execution
- `WS /pipelines/{id}/events` - Real-time WebSocket events

**Models**:
- `PipelineSubmit`: DOT source, auto_approve flag, gateway selection
- `PipelineResponse`: ID, status, created_at
- `PipelineStatusResponse`: Full status with timestamps

**Porting Effort**: High - Would require choosing Node.js web framework (Express/Fastify)

---

### 6. Secrets Management (High Priority)

**Location**: `src/attractor/secrets.py`

**Description**: Multi-provider secrets management for production deployments.

**Providers**:
1. **EnvironmentSecretsProvider**: Development - reads from `os.getenv()`
2. **AWSSecretsManagerProvider**: Production - AWS Secrets Manager with JSON key extraction
3. **AzureKeyVaultProvider**: Production - Azure Key Vault integration

**Secret Formats**:
- `$ENV_VAR` - Environment variable
- `aws:secret-name` - AWS Secrets Manager
- `aws:secret-name:KEY` - AWS Secrets Manager with JSON key
- `azure:secret-name` - Azure Key Vault

**Porting Effort**: Medium - Node.js has AWS SDK and Azure SDK support

---

### 7. ManagerLoop Handler (Medium Priority)

**Location**: `src/attractor/advanced_handlers.py:185-313`

**Description**: Supervisor pattern for managing child pipelines. Iteratively monitors and steers child pipeline execution.

**Attributes**:
- `child_pipeline`: Path to child DOT file
- `max_iterations`: Maximum iterations (default: 10)
- `poll_interval`: Seconds between checks (default: 5)

**Pattern**:
1. Gather telemetry from child pipeline
2. Ask LLM for decision (CONTINUE/STOP)
3. Execute decision or wait for next iteration

**Porting Effort**: High - Complex state management and nested pipeline execution

---

### 8. Advanced CLI (Medium Priority)

**Location**: `src/attractor/cli.py`

**Description**: Full-featured command-line interface with argument parsing.

**Arguments**:
```
dot_file                    # Path to DOT pipeline (required)
--validate-only            # Validate without executing
--gateway-config PATH      # Gateway configuration file
--gateway NAME             # Gateway name to use
--stylesheet PATH         # Model stylesheet file
--mcp-config PATH          # MCP server configuration
--auto-approve             # Auto-approve human gates
--logs PATH                # Logs directory
--resume                   # Resume from checkpoint
--max-tokens N            # Override max_tokens
```

**Porting Effort**: Low - JavaScript has `yargs` or `commander` packages

---

### 9. Advanced Gateway Configuration (Medium Priority)

**Location**: `src/attractor/gateway.py`

**Description**: JSON-based gateway configuration supporting multiple LLM providers.

**Providers Supported**:
- AWS Bedrock (Claude, Llama, Mistral)
- Azure OpenAI
- OpenAI (direct)
- Anthropic (direct)
- Custom gateways

**Configuration**: `gateway.config.json` with named gateways

**Porting Effort**: Medium - Would extend current Kilo/Gateway adapters

---

## Recommended Porting Order

### Phase 1: Core Handlers (Quick Wins)
1. **Tool Handler** - Simplest to implement, high utility
2. **Parallel Handler** - Adds significant capability
3. **FanIn Handler** - Complements parallel execution

### Phase 2: Integration Features
4. **MCP Integration** - Modern AI tooling standard
5. **Secrets Management** - Production requirement

### Phase 3: Server & CLI
6. **HTTP Server** - Major feature gap
7. **Advanced CLI** - Improved DX
8. **ManagerLoop Handler** - Advanced orchestration

---

## Technical Implementation Notes

### Tool Handler (Node.js)
```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function executeTool(command, timeout = 30000) {
  const { stdout, stderr } = await execAsync(command, { timeout });
  return { stdout, stderr };
}
```

### Parallel Handler (Node.js)
```javascript
import { Worker } from 'worker_threads';
// Or use a worker pool library
```

### Secrets Management (Node.js)
```javascript
// AWS
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Azure
import { SecretClient } from '@azure/keyvault-secrets';
```

### HTTP Server (Node.js)
```javascript
// Option 1: Express
import express from 'express';
// Option 2: Fastify (more similar to Python)
import fastify from 'fastify';
```

---

## Files Reference

### Python Version
- `/home/kinderrs/src/python/attractor/src/attractor/advanced_handlers.py` - Advanced node handlers
- `/home/kinderrs/src/python/attractor/src/attractor/secrets.py` - Secrets management
- `/home/kinderrs/src/python/attractor/src/attractor/server.py` - FastAPI server
- `/home/kinderrs/src/python/attractor/src/attractor/cli.py` - CLI interface
- `/home/kinderrs/src/python/attractor/src/attractor/mcp_client.py` - MCP client

### JavaScript Version (Current)
- `/home/kinderrs/src/ai/attractor/src/handlers/` - Node handlers
- `/home/kinderrs/src/ai/attractor/src/pipeline/engine.js` - Execution engine
- `/home/kinderrs/src/ai/attractor/src/llm/` - LLM integration
- `/home/kinderrs/src/ai/attractor/run-workflow.js` - Basic runner (needs enhancement)
