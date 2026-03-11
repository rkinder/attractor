# Requirements: Filesystem Handler

## REQ-FS-001: Read File Operation
**Description**: Read contents of a file from the filesystem

**Acceptance Criteria**:
- [ ] Can read text files
- [ ] Returns file contents as string
- [ ] Throws error if file doesn't exist
- [ ] Path sandboxing prevents reading outside project

---

## REQ-FS-002: Write File Operation
**Description**: Write contents to a file

**Acceptance Criteria**:
- [ ] Creates file if it doesn't exist
- [ ] Overwrites existing file
- [ ] Creates parent directories if needed
- [ ] Enforces 10MB size limit
- [ ] Path sandboxing prevents writing outside project

---

## REQ-FS-003: Create Directory
**Description**: Create one or more directories

**Acceptance Criteria**:
- [ ] Creates single directory
- [ ] Supports recursive creation
- [ ] Does not error if directory exists
- [ ] Path sandboxing applies

---

## REQ-FS-004: Delete File/Directory
**Description**: Delete files or directories

**Acceptance Criteria**:
- [ ] Can delete files
- [ ] Can delete directories (recursive option)
- [ ] Does not error if doesn't exist
- [ ] Path sandboxing prevents deletion outside project

---

## REQ-FS-005: Shell Command Execution
**Description**: Execute shell commands and capture output

**Acceptance Criteria**:
- [ ] Executes command in working directory
- [ ] Captures stdout
- [ ] Captures stderr
- [ ] Returns exit code
- [ ] Enforces timeout (default 30s)
- [ ] Command whitelisting enforced

---

## REQ-FS-006: Check Existence
**Description**: Check if file or directory exists

**Acceptance Criteria**:
- [ ] Returns boolean
- [ ] Works for files
- [ ] Works for directories

---

## REQ-FS-007: Copy File/Directory
**Description**: Copy files or directories

**Acceptance Criteria**:
- [ ] Copies files
- [ ] Copies directories (recursive)
- [ ] Creates destination if needed

---

## REQ-FS-008: Path Sandboxing
**Description**: Prevent operations outside project root

**Acceptance Criteria**:
- [ ] Blocks path traversal (../)
- [ ] Blocks absolute paths outside project
- [ ] Throws clear error message

---

## REQ-FS-009: Command Whitelisting
**Description**: Only allow safe shell commands

**Acceptance Criteria**:
- [ ] Whitelisted: npm, node, git, docker, npx
- [ ] Blocked: rm -rf /, curl | sh, wget | sh
- [ ] Clear error for blocked commands

---

## REQ-FS-010: Timeout Enforcement
**Description**: Prevent commands from hanging indefinitely

**Acceptance Criteria**:
- [ ] Default timeout 30 seconds
- [ ] Configurable via timeout attribute
- [ ] Maximum timeout 300 seconds
- [ ] Returns timeout error if exceeded

---

## Interface Contracts

### Node Attributes
```javascript
{
  handler: "filesystem",
  operation: "read" | "write" | "mkdir" | "delete" | "shell" | "exists" | "copy",
  path: string,           // For read, write, mkdir, delete, exists, copy
  content: string,        // For write
  command: string,       // For shell
  cwd: string,           // For shell (working directory)
  timeout: number,        // For shell (ms)
  recursive: boolean,    // For mkdir, delete, copy
  source: string,        // For copy
  dest: string          // For copy
}
```

### Result Structure
```javascript
// For read
{ success: true, content: "file contents" }

// For write, mkdir, delete, copy
{ success: true }

// For shell
{ success: true, stdout: "...", stderr: "...", exitCode: 0 }

// For exists
{ success: true, exists: true }

// Error
{ success: false, error: "error message" }
```

---

## Traceability

| Requirement | Priority | Phase |
|-------------|----------|-------|
| REQ-FS-001 | Critical | Phase 1 |
| REQ-FS-002 | Critical | Phase 1 |
| REQ-FS-003 | High | Phase 1 |
| REQ-FS-004 | High | Phase 1 |
| REQ-FS-005 | Critical | Phase 1 |
| REQ-FS-006 | Medium | Phase 1 |
| REQ-FS-007 | Medium | Phase 1 |
| REQ-FS-008 | Critical | Phase 2 |
| REQ-FS-009 | Critical | Phase 2 |
| REQ-FS-010 | High | Phase 2 |
