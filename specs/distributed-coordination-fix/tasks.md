# Tasks: Distributed Coordination Fix

## Phase 1: Wire Coordinator (Single Instance)

- [x] **TASK-1.1**: Wire coordinator call in pipeline-manager.js
  - File: `src/server/pipeline-manager.js`
  - Add: `await coordinatorService.onPipelineComplete(id, result)` on pipeline complete
  - Add: `await coordinatorService.onPipelineError(id, error)` on pipeline error

- [x] **TASK-1.2**: Test coordinator in single-instance mode
  - Create pipeline that triggers another workflow
  - Verify coordinator makes correct decision
  - Verify next workflow is triggered

---

## Phase 2: Add Distributed Coordination (Choose One)

### Option A: Redis

- [x] **TASK-2A.1**: Restore/create Redis storage module
  - File: `src/server/storage/redis.js`
  - Implement: `publish(channel, message)`, `subscribe(channel, callback)`

- [x] **TASK-2A.2**: Update coordinator to publish events
  - Modify: `coordinator.js` - publish on pipeline complete

- [x] **TASK-2A.3**: Add Redis subscription to server/index.js
  - Listen for events on all instances
  - Process coordinator decisions on receiving instance

- [x] **TASK-2A.4**: Update docker-compose.yml
  - Add Redis service
  - Update environment variables

- [x] **TASK-2A.5**: Test distributed coordination
  - Deploy 3 container instances
  - Verify all receive pipeline complete events

### Option B: PostgreSQL

- [ ] **TASK-2B.1**: Create PostgreSQL storage module
  - File: `src/server/storage/postgres.js`
  - Implement: state storage, pub/sub via LISTEN/NOTIFY

- [ ] **TASK-2B.2**: Add schema migrations
  - Tables: pipelines, decisions, events

- [ ] **TASK-2B.3**: Update docker-compose.yml
  - Add PostgreSQL service

### Option C: RabbitMQ

- [ ] **TASK-2C.1**: Create RabbitMQ storage module
  - File: `src/server/storage/rabbitmq.js`
  - Implement: publish, consume with confirm

- [ ] **TASK-2C.2**: Update docker-compose.yml
  - Add RabbitMQ service

---

## Phase 3: Integration Tests

- [ ] **TASK-3.1**: Test pipeline triggers next workflow
- [ ] **TASK-3.2**: Test coordinator decision broadcasting
- [ ] **TASK-3.3**: Test failure handling across instances
- [ ] **TASK-3.4**: Test human intervention coordination

---

## Phase 4: Documentation

- [ ] **TASK-4.1**: Update ROADMAP with chosen solution
- [ ] **TASK-4.2**: Document deployment with distributed coordination
- [ ] **TASK-4.3**: Add troubleshooting section
