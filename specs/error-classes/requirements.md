# Requirements: Error Class Hierarchy

## Technical Specifications

### REQ-ERR-001: AttractorError Base Class
**From Design**: FR-001  
**Description**: Create AttractorError base class.

**Acceptance Criteria**:
- [ ] Extends Error
- [ ] Has `code` property
- [ ] Has `details` property (optional)
- [ ] Has proper stack trace

---

### REQ-ERR-002: ValidationError
**From Design**: FR-002  
**Description**: Create ValidationError for validation failures.

**Acceptance Criteria**:
- [ ] Extends AttractorError
- [ ] Code: 'VALIDATION_ERROR'
- [ ] Used by PipelineLinter

---

### REQ-ERR-003: ExecutionError
**From Design**: FR-002  
**Description**: Create ExecutionError for node execution failures.

**Acceptance Criteria**:
- [ ] Extends AttractorError
- [ ] Code: 'EXECUTION_ERROR'
- [ ] Has optional `nodeId` property

---

### REQ-ERR-004: ProviderError
**From Design**: FR-002  
**Description**: Create ProviderError for LLM provider failures.

**Acceptance Criteria**:
- [ ] Extends AttractorError
- [ ] Code: 'PROVIDER_ERROR'
- [ ] Has optional `provider` property

---

### REQ-ERR-005: TimeoutError
**From Design**: FR-002  
**Description**: Create TimeoutError for timeout failures.

**Acceptance Criteria**:
- [ ] Extends AttractorError
- [ ] Code: 'TIMEOUT_ERROR'
- [ ] Has optional `timeout` property (ms)

---

### REQ-ERR-006: CheckpointError
**From Design**: FR-002  
**Description**: Create CheckpointError for checkpoint failures.

**Acceptance Criteria**:
- [ ] Extends AttractorError
- [ ] Code: 'CHECKPOINT_ERROR'

---

### REQ-ERR-007: Export Errors
**From Design**: FR-004  
**Description**: Export all errors from main index.

**Acceptance Criteria**:
- [ ] Export from src/index.js
- [ ] Verify: `import { ValidationError } from 'attractor'`

---

## Error Class Hierarchy

```
Error
  └── AttractorError
        ├── ValidationError (code: 'VALIDATION_ERROR')
        ├── ExecutionError (code: 'EXECUTION_ERROR', nodeId?)
        ├── ProviderError (code: 'PROVIDER_ERROR', provider?)
        ├── TimeoutError (code: 'TIMEOUT_ERROR', timeout?)
        └── CheckpointError (code: 'CHECKPOINT_ERROR')
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

- [ ] All 6 error classes implemented
- [ ] Exported from index.js
- [ ] Used in appropriate places (or as replacement)
- [ ] Test cases pass
