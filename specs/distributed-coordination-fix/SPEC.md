# Spec: Distributed Coordination Fix

## Problem Statement

The current implementation has a gap in distributed coordination:

1. **Coordinator not wired**: The `coordinatorService.onPipelineComplete()` is never called from `pipeline-manager.js`
2. **Distributed blind spots**: When nginx load balances a request to one container, other containers have no awareness

Removing Redis eliminated pub/sub - there's no way for containers to communicate state changes across instances.

---

## Current State

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Container1 │     │  Container2 │     │  Container3 │
│  (nginx:80) │     │  (nginx:81) │     │  (nginx:82) │
│             │     │             │     │             │
│ pipeline-1  │     │   [idle]    │     │   [idle]    │
│ COMPLETE    │     │             │     │             │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       ▼
  Who triggers
  next workflow?
       │
       ▼
  [No one knows]
```

---

## Approach 3: API-Based Coordination (Baseline)

External worker monitors API and triggers next workflows:

```
┌─────────────────────────────────────────────────────┐
│                    External Worker                   │
│                                                      │
│  1. Poll GET /pipelines                            │
│  2. Detect completed pipeline                      │
│  3. POST /pipelines {next_workflow}               │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Container1 │◄────│   nginx     │────►│  Container2 │
│  executes   │     │  (random)   │     │  executes    │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Pros**: Simple, no internal coordination needed
**Cons**: 
- External dependency (worker must exist)
- Slower response time (polling)
- Single point of failure (worker dies)

---

## Options for Distributed Coordination

### Option A: Add Redis Back (Simplest)

Re-add Redis for pub/sub:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Container1 │     │  Container2 │     │  Container3 │
│             │     │             │     │             │
│  pipeline-1│     │   [idle]    │     │   [idle]    │
│  COMPLETE   │────►│  SUBSCRIBED │     │  SUBSCRIBED │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       ▼ Redis pub/sub
       ┌─────────────────────────────────────────┐
       │ All instances receive:                   │
       │ { type: "pipeline_complete", id: "..." }│
       └─────────────────────────────────────────┘
```

**Pros**: Battle-tested, real-time, automatic
**Cons**: External dependency, operational complexity

---

### Option B: Database-Backed Storage (PostgreSQL)

Use PostgreSQL instead of Redis:

```
┌─────────────────────────────────────────────────────┐
│                    PostgreSQL                        │
│                                                      │
│  - Pipeline state (tables)                         │
│  - Pub/sub (LISTEN/NOTIFY)                         │
│  - Coordinated locking                             │
└─────────────────────────────────────────────────────┘
```

**Pros**: 
- SQL queries for state
- Pub/sub built-in
- ACID compliant
- Shared state

**Cons**: 
- More complex than Redis
- Requires PostgreSQL infrastructure
- Heavier resource usage

---

### Option C: Message Queue (RabbitMQ/NATS)

External message queue:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Container1 │     │  Container2 │     │  Container3 │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  RabbitMQ     │
                    │  (queue)     │
                    └───────────────┘
```

**Pros**: 
- Decoupled architecture
- Guaranteed delivery
- Multiple consumers

**Cons**: 
- Another external service
- Queue operational overhead

---

### Option D: Database with SQLite (Simplest)

Use SQLite with file-based storage:

```
┌─────────────────────────────────────────────────────┐
│              Shared NFS/EFS Volume                  │
│                                                      │
│   /data/state/pipelines.db (SQLite)               │
│                                                      │
│   - Pipeline state                                 │
│   - Events table (polled by all instances)         │
│   - Advisory locks for coordination               │
└─────────────────────────────────────────────────────┘
```

**Pros**: 
- No external DB server needed
- ACID compliant
- File-based (works with NFS)
- SQLite is embedded

**Cons**: 
- SQLite not ideal for high concurrency
- Requires NFS for distributed (file locking issues)
- Polling still needed for events

---

### Option E: Redis Lite (Embedded)

Use a lightweight embedded key-value store with pub/sub:

- **Hinted**: Redis-compatible, embeddable
- **Gorush**: Push notification server with Redis backend
- **KeyDB**: Redis fork with more features

---

### Option F: File-Based Distributed Coordination

Use filesystem primitives on shared storage:

```
┌─────────────────────────────────────────────────────┐
│              Shared NFS/EFS Volume                  │
│                                                      │
│  /data/coordination/                                │
│  ├── events/                                        │
│  │   └── {timestamp}_{pipeline_id}_complete.json   │
│  ├── locks/                                         │
│  │   └── {pipeline_id}.lock                        │
│  └── polling/                                       │
│       └── instances/{instance_id}.heartbeat        │
└─────────────────────────────────────────────────────┘

Each container:
1. Watch events/ directory (inotify/fsevents)
2. On new event, acquire lock
3. Process, release lock
4. Write completion
```

**Pros**: 
- No external dependencies
- Works with existing NFS/EFS

**Cons**: 
- Complex to implement correctly
- Race conditions possible
- NFS notifications may not work reliably

---

## Recommendation

### For MVP (Quick Fix): Option A (Redis)
Re-add Redis. It's the simplest solution that:
- Provides real-time pub/sub
- Handles the distributed awareness problem
- Is battle-tested for this use case

### For Long-Term: Option B (PostgreSQL)
If wanting to eliminate Redis entirely:
- Use PostgreSQL for state + pub/sub
- Single database, multiple purposes
- Industry standard

### For Simplicity: Option C + External Worker
Keep filesystem storage + add lightweight message queue:
- RabbitMQ or SQS (AWS)
- Simpler than full database

---

## Implementation Plan

### Phase 1: Wire Coordinator (Single Instance)
```javascript
// pipeline-manager.js - on pipeline complete:
await coordinatorService.onPipelineComplete(id, result);
```

### Phase 2: Add Distributed Coordination

Pick one:
- **A**: Add Redis + ioredis client
- **B**: Add pg + PostgreSQL  
- **C**: Add amqplib + RabbitMQ

### Phase 3: Test Distributed

- Deploy 3 container instances
- Trigger pipeline via API
- Verify all instances receive completion event
- Verify coordinator triggers next workflow

---

## Questions for Decision

1. **Operational complexity**: Are you willing to operate Redis/PostgreSQL?
2. **Response time**: Is sub-second coordination required?
3. **Scale**: How many concurrent pipelines?
4. **Infrastructure**: What's already available (AWS, existing Redis, etc.)?

---

## Files to Modify

- `src/server/pipeline-manager.js` - Wire coordinator call
- Choose one:
  - `src/server/storage/redis.js` (Option A)
  - `src/server/storage/postgres.js` (Option B)
  - `src/server/storage/rabbitmq.js` (Option C)
- `src/server/coordinator.js` - Update to use new storage
- `docker-compose.yml` - Add selected service
- `.env.example` - Add connection config
