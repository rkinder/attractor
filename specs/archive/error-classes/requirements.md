# Requirements: Error Class Hierarchy

## Technical Specifications

### REQ-ERR-001: AttractorError Base Class
**From Design**: FR-001  
**Description**: Create AttractorError base class.

**Acceptance Criteria**:
- [x] Extends Error
- [x] Has `code` property
- [x] Has `details` property (optional)
- [x] Has proper stack trace

---

### REQ-ERR-002: ValidationError
**From Design**: FR-002  
**Description**: Create ValidationError for validation failures.

**Acceptance Criteria**:
- [x] Extends AttractorError
- [x] Code: 'VALIDATION_ERROR'
- [x] Used by PipelineLinter

---

### REQ-ERR-003: ExecutionError
**From Design**: FR-002  
**Description**: Create ExecutionError for node execution failures.

**Acceptance Criteria**:
- [x] Extends AttractorError
- [x] Code: 'EXECUTION_ERROR'
- [x] Has optional `nodeId` property

---

### REQ-ERR-004: ProviderError
**From Design**: FR-002  
**Description**: Create ProviderError for LLM provider failures.

**Acceptance Criteria**:
- [x] Extends AttractorError
- [x] Code: 'PROVIDER_ERROR'
- [x] Has optional `provider` property

---

### REQ-ERR-005: TimeoutError
**From Design**: FR-002  
**Description**: Create TimeoutError for timeout failures.

**Acceptance Criteria**:
- [x] Extends AttractorError
- [x] Code: 'TIMEOUT_ERROR'
- [x] Has optional `timeout` property (ms)

---

### REQ-ERR-006: CheckpointError
**From Design**: FR-002  
**Description**: Create CheckpointError for checkpoint failures.

**Acceptance Criteria**:
- [x] Extends AttractorError
- [x] Code: 'CHECKPOINT_ERROR'

---

### REQ-ERR-007: Export Errors
**From Design**: FR-004  
**Description**: Export all errors from main index.

**Acceptance Criteria**:
- [x] Export from src/index.js
- [x] Verify: `import { ValidationError } from 'attractor'`

---

## Error Class Hierarchy

```
Error
  └── AttractorError
        ├── ValidationError (code: 'VALIDATION_ERROR', field?)
        ├── WorkflowError (code: 'WORKFLOW_ERROR', workflow?, nodeId?)
        ├── ExecutionError (code: 'EXECUTION_ERROR', nodeId?, handler?)
        ├── HandlerError (code: 'HANDLER_ERROR', handler?, nodeId?)
        ├── LLMError (code: 'LLM_ERROR', provider?, model?, statusCode?)
        ├── ProviderError (code: 'PROVIDER_ERROR', provider?)
        ├── TimeoutError (code: 'TIMEOUT_ERROR', timeout?, operation?)
        ├── CheckpointError (code: 'CHECKPOINT_ERROR', runId?)
        └── ConfigurationError (code: 'CONFIGURATION_ERROR', configKey?)
```

---

## Test Cases

### TC-ERR-001: Catch Specific Error
1. Throw new ValidationError('Invalid DOT')
2. Catch as ValidationError
3. **Expected**: Caught, has correct code

### TC-ERR-002: Catch Base Error
1. Throw new ExecutionError('Failed')
2. Catch as AttractorError
3. **Expected**: Caught (polymorphic)

### TC-ERR-003: Import from Package
1. Import { ValidationError } from 'attractor'
2. **Expected**: No error, class available

---

## Definition of Done

- [x] All error classes implemented
- [x] Exported from index.js
- [x] Used in appropriate places (or as replacement)
- [x] Test cases pass
