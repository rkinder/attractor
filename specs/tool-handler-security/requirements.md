# Requirements: Tool Handler Security

## Overview

Document the security considerations for the ToolHandler to protect the Attractor pipeline from potentially malicious code execution.

## Problem Statement

The ToolHandler currently executes arbitrary shell commands specified in DOT workflow files without any safety checks. This creates a security vulnerability where:
- Anyone who can write a DOT file can execute arbitrary shell commands
- Variable expansion could inject malicious commands if user input is used
- No protection against destructive commands (e.g., `rm -rf /`)

## Current State

- **Status:** ⚠️ Partially Implemented
- **Risk Level:** Medium-High (depends on deployment context)
- **Mitigation:** Security validation available but must be explicitly enabled via environment variables

---

## Security Considerations

### SC-001: Command Whitelist
**From Design**: FR-SEC-001  
**Description**: Implement a whitelist of allowed commands to restrict execution to known-safe operations.

**Acceptance Criteria**:
- [x] Define a configurable whitelist of allowed command binaries (e.g., `npm`, `git`, `ls`, `node`)
- [x] Reject commands not in the whitelist with a clear error message
- [x] Allow operators (e.g., `|`, `&&`, `>`) only when the base command is whitelisted
- [x] Make whitelist configurable via environment variable or config file

**Configuration:**
```bash
# Enable whitelist mode
TOOL_HANDLER_SECURITY_MODE=whitelist
TOOL_HANDLER_ALLOWED_COMMANDS=npm,git,node,python3,ls,echo
```

---

### SC-002: Command Blacklist
**From Design**: FR-SEC-002  
**Description**: Block known dangerous commands that could harm the system.

**Acceptance Criteria**:
- [x] Define a blacklist of dangerous patterns (e.g., `rm -rf`, `curl | sh`, `wget | sh`)
- [x] Use regex matching to catch variations of dangerous commands
- [x] Reject blacklisted commands with descriptive error
- [x] Log blocked attempts for security auditing

**Configuration:**
```bash
# Enable blacklist mode
TOOL_HANDLER_SECURITY_MODE=blacklist
# Optional: custom blocked patterns (defaults available)
TOOL_HANDLER_BLOCKED_COMMANDS=rm -rf,curl | sh,wget | sh
```

---

### SC-003: Sandbox Execution
**From Design**: FR-SEC-003  
**Description**: Execute commands in an isolated environment with restricted permissions.

**Acceptance Criteria**:
- [ ] Run commands in Docker container with limited capabilities
- [ ] Restrict filesystem access to working directory only
- [ ] Limit network access if possible
- [ ] Set resource limits (CPU, memory, execution time)

---

### SC-004: Human Approval Gate
**From Design**: FR-SEC-004  
**Description**: Require human confirmation before executing tool commands.

**Acceptance Criteria**:
- [ ] Pause pipeline execution before tool node
- [ ] Display command details to user for approval
- [ ] Allow approval/denial via CLI or webhook
- [ ] Timeout option to auto-deny after waiting period

---

### SC-005: Execution Auditing
**From Design**: FR-SEC-005  
**Description**: Log all command executions for security review.

**Acceptance Criteria**:
- [ ] Log command, user, timestamp, and result to audit log
- [ ] Store logs in separate location from pipeline logs
- [ ] Support export to external logging systems (e.g., Splunk, ELK)

---

## Implementation Options Matrix

| Option | Security Level | Complexity | Use Case |
|--------|---------------|------------|----------|
| Whitelist | Medium | Low | Personal/single-user |
| Blacklist | Medium | Medium | Mixed trust environments |
| Sandbox | High | High | Untrusted workflows |
| Human Approval | High | Medium | Critical systems |
| Combination | Highest | High | Production deployments |

---

## Decision Criteria

Before implementation, consider:

1. **Deployment Context** - Self-hosted vs. multi-tenant?
2. **Trust Model** - Who writes DOT files?
3. **Operational Impact** - Will safety checks slow down workflows?
4. **Compliance** - Any security certifications required?

---

## Definition of Done

- [x] This requirements document is complete
- [x] Design document outlines chosen approach
- [x] Implementation decision is made by maintainers
- [x] Security implications documented in README

**Implemented:**
- [x] Command whitelist with configurable commands via environment variables
- [x] Command blacklist with default dangerous patterns
- [x] Security validation in ToolHandler
- [x] CommandValidator class exported from index.js

**Remaining (Future Work):**
- [ ] Sandbox Execution (Docker-based isolation)
- [ ] Human Approval Gate
- [ ] Execution Auditing (external log export)

---

## Related Specifications

- `specs/archive/tool-handler/` - ToolHandler implementation
- `ROADMAP.md` - Phase 1 includes Code Execution
