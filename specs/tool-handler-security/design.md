# Design: Tool Handler Security

## Overview

This document outlines the security architecture options for the ToolHandler to protect against malicious code execution in Attractor workflows.

## Current Architecture

```
DOT File → ToolHandler.execute() → child_process.exec() → Shell Command
```

## Problem Analysis

### Threat Vectors

1. **Direct Command Injection** - Malicious `tool_command` in DOT file
2. **Variable Expansion Injection** - User-controlled variables expanded into commands
3. **Chain Attacks** - Multiple tool nodes executing in sequence
4. **Resource Exhaustion** - Commands consuming excessive CPU/memory/disk

### Trust Boundaries

| Boundary | Current Trust Level |
|----------|-------------------|
| DOT file author | Full trust (can execute any command) |
| Variable sources | Partial trust (could contain user input) |
| Network | No restrictions |

## Security Architecture Options

### Option A: Command Whitelist (Recommended for MVP)

```
DOT File → Validator.checkWhitelist() → ToolHandler.execute() → Shell
              ↓
         Reject if not in whitelist
```

**Pros:**
- Simple to implement
- Clear security boundary
- Low false positive rate with careful whitelist design

**Cons:**
- May block legitimate use cases
- Requires maintenance of whitelist

**Configuration:**
```javascript
// Environment variable
TOOL_HANDLER_ALLOWED_COMMANDS=npm,git,node,python3,ls,cat,echo

// Default whitelist
const DEFAULT_ALLOWED = new Set([
  'npm', 'npx', 'node', 'python3', 'python',
  'git', 'ls', 'cat', 'echo', 'printf', 'head', 'tail',
  'grep', 'awk', 'sed', 'find', 'make', 'docker'
]);
```

---

### Option B: Blacklist with Warning

```
DOT File → Validator.checkBlacklist() → ToolHandler.execute() → Shell
              ↓
         Log warning, allow execution
```

**Pros:**
- Flexible (doesn't block new commands)
- Good for logging/monitoring

**Cons:**
- Easily bypassed (e.g., `rm  -rf` vs `rm -rf`)
- Reactive rather than proactive

**Blacklist Patterns:**
```javascript
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/,
  /curl\s+.*\|\s*sh/,
  /wget\s+.*\|\s*sh/,
  /:\(\)\{.*:\|&/,
  /chmod\s+777/,
  /dd\s+if=/
];
```

---

### Option C: Sandbox (Docker-based)

```
DOT File → Sandbox.create() → Command inside container → Result
              ↓
         Isolated filesystem/network
```

**Pros:**
- Strongest isolation
- Can limit resources

**Cons:**
- Complex to set up
- Requires Docker daemon
- Performance overhead

---

### Option D: Human Approval Gate

```
DOT File → ApprovalService.prompt() → User confirms → Execute
                                        ↓
                                   Timeout/Reject
```

**Pros:**
- Absolute control
- Good for critical workflows

**Cons:**
- Breaks automation
- Requires user intervention

---

## Recommended Approach

### Phase 1: Command Whitelist
Start with whitelist approach - simple, effective, low false positives.

### Phase 2: Enhanced Logging
Add execution auditing regardless of whitelist.

### Phase 3: Optional Sandbox
For advanced users who need stronger isolation.

---

## Implementation Notes

### Variable Expansion Security

When implementing variable expansion in tool commands, consider:

1. **Input Validation** - Sanitize variables before expansion
2. **Escaping** - Properly escape shell metacharacters
3. **Logging** - Log expanded commands for audit

```javascript
// Example: Sanitize input
function sanitizeCommandArg(arg) {
  return arg.replace(/[;&|`$]/g, '_');
}
```

### Error Messages

Return safe error messages that don't leak system information:

```javascript
// Good
"Command 'custom-cmd' not in whitelist"

// Bad  
"Command not found at /usr/bin/custom-cmd"
```

---

## Open Questions

1. **Should whitelist be runtime-configurable?**
   - Yes, via environment variable for flexibility

2. **How to handle compound commands (e.g., `npm install && make build`)?**
   - Option: Allow if first command is whitelisted
   - Option: Split and check each command

3. **Should we allow shell built-ins?**
   - Yes, treat shell as whitelisted

4. **What's the migration path for existing workflows?**
   - Default to permissive, require explicit config to enable

---

## Dependencies

- `src/handlers/tool.js` - ToolHandler implementation
- `src/pipeline/context.js` - Variable expansion context

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Whitelist too restrictive | Make it configurable, provide defaults |
| Bypass via variables | Validate after expansion, not before |
| Performance impact | Cache whitelist, minimal regex |
