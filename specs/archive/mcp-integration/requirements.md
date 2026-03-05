# Requirements: MCP Integration

## Technical Specifications

### REQ-001: MCPClient Class
Create `MCPClient` in `src/mcp/client.js` with methods: `loadConfig()`, `startServer()`, `stopServer()`, `listTools()`, `callTool()`, `cleanup()`.

### REQ-002: Configuration Loading
Load `mcp.config.json` with structure: `{ mcp_servers: { name: { command, args, env } } }`. Return empty object if file missing.

### REQ-003: Server Process Spawning
Use `child_process.spawn()` with stdio: `['pipe', 'pipe', 'pipe']`. Store process in `processes` Map.

### REQ-004: JSON-RPC Request/Response
Implement `_sendRequest(server, method, params)` that writes JSON + newline to stdin, reads line from stdout, parses JSON.

### REQ-005: Tools List Method
Implement `listTools(serverName)` that calls `tools/list` JSON-RPC method, caches result in `_toolsCache` Map.

### REQ-006: Tool Call Method
Implement `callTool(serverName, toolName, arguments)` that calls `tools/call` with params `{ name, arguments }`.

### REQ-007: MCPHandler Implementation
Create `MCPHandler` in `src/handlers/mcp.js`, extract attributes `mcp_server`, `mcp_tool`, `mcp_args` from node, call `mcpClient.callTool()`.

### REQ-008: Result Extraction
Extract `content` array from MCP response, concatenate text items, store in context `<node_id>.output`.

### REQ-009: Error Handling
Catch exceptions from `callTool()`, return `Outcome.fail()` with error message. Log to `<stageDir>/error.txt`.

### REQ-010: Process Cleanup
Implement `cleanup()` that calls `process.terminate()` and `process.wait()` for all servers. Call on pipeline end.

### REQ-011: Handler Registration
Register MCPHandler with registry. Pass MCPClient instance to handler constructor.

### REQ-012: Timeout Support
Add timeout to `_sendRequest()` using `Promise.race()` with `setTimeout()`. Default 30 seconds.

### REQ-013: Configuration Schema Validation
Validate required fields (command) exist. Log warnings for malformed server configs.

### REQ-014: Logging
Write MCP request to `<stageDir>/mcp_request.json`, response to `<stageDir>/mcp_response.json`.

## Interface Contracts

```javascript
export class MCPClient {
  constructor(configPath)
  async loadConfig()
  async startServer(serverName)
  async stopServer(serverName)
  async listTools(serverName)
  async callTool(serverName, toolName, arguments)
  cleanup()
}

export class MCPHandler extends Handler {
  constructor(mcpClient)
  async execute(node, context, graph, logsRoot)
}
```

## Test Cases
- TC-001: Load valid mcp.config.json
- TC-002: Start MCP server process
- TC-003: List tools from server
- TC-004: Call MCP tool successfully
- TC-005: Handle tool call error
- TC-006: Extract text from content array
- TC-007: Cleanup processes on exit
- TC-008: Handle missing config gracefully
- TC-009: Timeout long-running tool calls
- TC-010: MCPHandler extracts node attributes
