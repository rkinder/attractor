# Design: MCP Integration

## Overview

MCP (Model Context Protocol) Integration enables Attractor pipelines to invoke external tools via standardized MCP servers. This provides access to file systems, databases, APIs, and other resources through a unified protocol, extending pipeline capabilities beyond built-in handlers.

**Problem Statement**: Pipelines currently cannot interact with external systems except through shell commands (ToolHandler). MCP provides a standardized, type-safe protocol for tool invocation with better error handling, structured inputs/outputs, and discovery mechanisms.

**Solution**: Implement MCPClient for managing MCP server processes, MCPHandler for invoking tools from pipelines, and configuration system for server definitions. Supports JSON-RPC 2.0 protocol over stdin/stdout.

## Architecture

### Components

1. **MCPClient** (`src/mcp/client.js`) - Server lifecycle management, JSON-RPC communication
2. **MCPHandler** (`src/handlers/mcp.js`) - Pipeline handler for MCP tool invocation
3. **Configuration** (`mcp.config.json`) - Server definitions with command, args, environment

### MCP Server Shapes
- Not yet in registry - will use explicit `type="mcp"` attribute or new shape

## Functional Requirements

### FR-001: MCP Server Configuration Loading
**Type**: Ubiquitous  
**Statement**: The system shall load MCP server configurations from `mcp.config.json` including command, args, and environment variables.

### FR-002: Server Process Management
**Type**: Ubiquitous  
**Statement**: The system shall start MCP server processes using Node.js `child_process.spawn()` with stdin/stdout piping.

### FR-003: JSON-RPC Communication
**Type**: Ubiquitous  
**Statement**: The system shall communicate with MCP servers using JSON-RPC 2.0 protocol over stdin/stdout.

### FR-004: Tool Listing
**Type**: Event-driven  
**Statement**: WHEN a server is started, the system shall call `tools/list` method to discover available tools.

### FR-005: Tool Invocation
**Type**: Ubiquitous  
**Statement**: The system shall invoke MCP tools via `tools/call` method with structured arguments.

### FR-006: MCPHandler Node Execution
**Type**: Ubiquitous  
**Statement**: The system shall provide MCPHandler that reads `mcp_server`, `mcp_tool`, and `mcp_args` attributes from nodes.

### FR-007: Server Cleanup
**Type**: State-driven  
**Statement**: WHILE pipeline completes or errors, the system shall terminate all MCP server processes.

### FR-008: Error Handling
**Type**: Unwanted Behavior  
**Statement**: IF an MCP tool call fails, THEN the system shall return Outcome.fail() with error details.

### FR-009: Result Storage
**Type**: Ubiquitous  
**Statement**: The system shall store tool results in context with key `<node_id>.output`.

### FR-010: Configuration Missing Handling
**Type**: Unwanted Behavior  
**Statement**: IF mcp.config.json is missing, THEN the system shall log warning and skip MCP initialization.

## Non-Functional Requirements

- **NFR-001**: Support up to 10 concurrent MCP servers
- **NFR-002**: Tool calls timeout after 30 seconds (configurable)
- **NFR-003**: Process cleanup guaranteed on exit

## Dependencies

- Internal: Handler registry, Outcome, Context
- External: Node.js `child_process`, `readline` modules

## Open Questions

1. Should we support MCP over HTTP/WebSocket? **Decision**: stdin/stdout only for MVP
2. Cache tool listings? **Decision**: Yes, cache per server
3. Support MCP resource providers? **Decision**: Defer to v2
