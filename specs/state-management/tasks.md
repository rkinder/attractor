# Tasks: State Management Enhancement

## Implementation Tasks

### Phase 1: Type-Safe Accessors

- [ ] **TASK-001**: Add `getObject(key, defaultValue = {})` method to Context class
  - Depends on: None
  - Files: `src/pipeline/context.js`
  - Acceptance: REQ-STATE-005
  - Estimated: 30 minutes

- [ ] **TASK-002**: Add `getArray(key, defaultValue = [])` method to Context class
  - Depends on: None
  - Files: `src/pipeline/context.js`
  - Acceptance: REQ-STATE-006
  - Estimated: 30 minutes

### Phase 2: Session Export/Import

- [ ] **TASK-003**: Add `exportSession()` method to Context class
  - Depends on: None
  - Files: `src/pipeline/context.js`
  - Acceptance: REQ-STATE-007
  - Note: Can alias existing `snapshot()` method or create new implementation
  - Estimated: 1 hour

- [ ] **TASK-004**: Add `importSession(sessionData)` method to Context class
  - Depends on: TASK-003
  - Files: `src/pipeline/context.js`
  - Acceptance: REQ-STATE-008
  - Estimated: 1 hour

### Phase 3: Secret Masking

- [ ] **TASK-005**: Add secret pattern detection to Context class
  - Depends on: None
  - Files: `src/pipeline/context.js`
  - Acceptance: REQ-STATE-009
  - Note: Detect env vars matching *_SECRET, *_KEY, *_TOKEN, *_PASSWORD
  - Estimated: 1 hour

- [ ] **TASK-006**: Modify `appendLog()` to apply secret masking
  - Depends on: TASK-005
  - Files: `src/pipeline/context.js`
  - Acceptance: REQ-STATE-009
  - Estimated: 30 minutes

### Phase 4: Integration & Testing

- [ ] **TASK-007**: Add Context class exports to `src/index.js`
  - Depends on: TASK-001, TASK-002, TASK-003, TASK-004
  - Files: `src/index.js`
  - Note: Verify Context is exported (should already be)
  - Estimated: 15 minutes

---

## Test Cases

### TC-001: getObject with valid JSON
**Requirement**: REQ-STATE-005
**Type**: Unit
**Steps**:
1. Create new Context
2. Set key 'data' with JSON object value
3. Call getObject('data')
**Expected**: Returns parsed object

### TC-002: getObject with missing key
**Requirement**: REQ-STATE-005
**Type**: Unit
**Steps**:
1. Create new Context
2. Call getObject('nonexistent')
**Expected**: Returns default {} (empty object)

### TC-003: getObject with invalid JSON
**Requirement**: REQ-STATE-005
**Type**: Unit
**Steps**:
1. Create new Context
2. Set key 'data' with string "not valid json"
3. Call getObject('data')
**Expected**: Returns default {} (empty object)

### TC-004: getObject with custom default
**Requirement**: REQ-STATE-005
**Type**: Unit
**Steps**:
1. Create new Context
2. Call getObject('missing', { custom: 'default' })
**Expected**: Returns { custom: 'default' }

### TC-005: getArray with array value
**Requirement**: REQ-STATE-006
**Type**: Unit
**Steps**:
1. Create new Context
2. Set key 'items' with array [1, 2, 3]
3. Call getArray('items')
**Expected**: Returns [1, 2, 3]

### TC-006: getArray with missing key
**Requirement**: REQ-STATE-006
**Type**: Unit
**Steps**:
1. Create new Context
2. Call getArray('nonexistent')
**Expected**: Returns default [] (empty array)

### TC-007: getArray with non-array value
**Requirement**: REQ-STATE-006
**Type**: Unit
**Steps**:
1. Create new Context
2. Set key 'data' with string "not an array"
3. Call getArray('data')
**Expected**: Returns default [] (empty array)

### TC-008: getArray with custom default
**Requirement**: REQ-STATE-006
**Type**: Unit
**Steps**:
1. Create new Context
2. Call getArray('missing', ['a', 'b'])
**Expected**: Returns ['a', 'b']

### TC-009: exportSession returns all values
**Requirement**: REQ-STATE-007
**Type**: Unit
**Steps**:
1. Create new Context
2. Set multiple keys with values
3. Call exportSession()
4. Verify returned object has 'values' key containing all set values
**Expected**: All values present in export

### TC-010: exportSession returns all logs
**Requirement**: REQ-STATE-007
**Type**: Unit
**Steps**:
1. Create new Context
2. Add multiple log entries via appendLog()
3. Call exportSession()
4. Verify returned object has 'logs' key containing all log entries
**Expected**: All logs present in export

### TC-011: exportSession includes metadata
**Requirement**: REQ-STATE-007
**Type**: Unit
**Steps**:
1. Create new Context
2. Call exportSession()
3. Verify returned object has 'version' and 'exportedAt' fields
**Expected**: Metadata present

### TC-012: exportSession is valid JSON
**Requirement**: REQ-STATE-007
**Type**: Unit
**Steps**:
1. Create new Context with values
2. Call exportSession()
3. Call JSON.stringify() on result
**Expected**: No error thrown

### TC-013: importSession restores values
**Requirement**: REQ-STATE-008
**Type**: Unit
**Steps**:
1. Create new Context
2. Call importSession() with session data containing values
3. Verify values are restored via get()
**Expected**: All imported values accessible

### TC-014: importSession restores logs
**Requirement**: REQ-STATE-008
**Type**: Unit
**Steps**:
1. Create new Context
2. Call importSession() with session data containing logs
3. Verify logs are restored
**Expected**: All imported logs accessible

### TC-015: importSession with invalid data throws error
**Requirement**: REQ-STATE-008
**Type**: Unit
**Steps**:
1. Create new Context
2. Call importSession(null)
**Expected**: Throws descriptive error

### TC-016: importSession replaces existing values
**Requirement**: REQ-STATE-008
**Type**: Unit
**Steps**:
1. Create new Context
2. Set key 'test' to 'original'
3. Import session with 'test' set to 'imported'
4. Call get('test')
**Expected**: Returns 'imported'

### TC-017: Secret masking detects API_SECRET
**Requirement**: REQ-STATE-009
**Type**: Unit
**Steps**:
1. Set process.env.API_SECRET = 'my-secret-key'
2. Create new Context
3. Call appendLog('Using API_SECRET for authentication')
4. Check stored log entry
**Expected**: Log contains 'Using *** for authentication'

### TC-018: Secret masking detects API_KEY
**Requirement**: REQ-STATE-009
**Type**: Unit
**Steps**:
1. Set process.env.API_KEY = 'secret123'
2. Create new Context
3. Call appendLog('Key: secret123')
4. Check stored log entry
**Expected**: Log contains 'Key: ***'

### TC-019: Secret masking detects TOKEN
**Requirement**: REQ-STATE-009
**Type**: Unit
**Steps**:
1. Set process.env.GITHUB_TOKEN = 'ghp_xxx'
2. Create new Context
3. Call appendLog('Token: ghp_xxx')
4. Check stored log entry
**Expected**: Log contains 'Token: ***'

### TC-020: Secret masking detects PASSWORD
**Requirement**: REQ-STATE-009
**Type**: Unit
**Steps**:
1. Set process.env.DB_PASSWORD = 'pass123'
2. Create new Context
3. Call appendLog('Password: pass123')
4. Check stored log entry
**Expected**: Log contains 'Password: ***'

### TC-021: Secret masking case insensitive
**Requirement**: REQ-STATE-009
**Type**: Unit
**Steps**:
1. Set process.env.API_SECRET = 'secret'
2. Create new Context
3. Call appendLog('api_secret value')
4. Check stored log entry
**Expected**: Log contains '*** value'

### TC-022: Secret masking does not modify original values
**Requirement**: REQ-STATE-009
**Type**: Unit
**Steps**:
1. Set process.env.API_KEY = 'original'
2. Create new Context and set key 'api_key' = 'original'
3. Call appendLog('api_key value')
4. Verify context.get('api_key') still returns 'original'
**Expected**: Original value unchanged

---

## Definition of Done

- [ ] All implementation tasks completed (TASK-001 through TASK-007)
- [ ] All test cases pass (TC-001 through TC-022)
- [ ] Code follows existing Context class patterns
- [ ] No regressions in existing tests
- [ ] Context exports are verified in src/index.js

## Dependencies

- None - all features are self-contained in Context class

## Notes

- Default values follow existing patterns: getString='', getNumber=0, getBoolean=false, getObject={}, getArray=[]
- Secret detection uses case-insensitive matching
- Masking replaces entire matched value with '***' (6 asterisks)
