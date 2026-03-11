# Requirements: Frontend UI

## REQ-UI-001: Pipeline List View
**Description**: Display all pipeline executions in a list/table format

**Acceptance Criteria**:
- [ ] Show all pipelines with status badge (pending/running/completed/failed/cancelled)
- [ ] Display: Pipeline ID, created time, duration, outcome status
- [ ] Click pipeline to navigate to detail view
- [ ] Auto-refresh every 10 seconds
- [ ] Loading and error states handled

---

## REQ-UI-002: Pipeline Graph View
**Description**: Visualize DOT workflow as interactive DAG using Mermaid

**Acceptance Criteria**:
- [ ] Convert DOT source to Mermaid syntax
- [ ] Render interactive graph with Mermaid.js
- [ ] Color nodes by execution status:
  - Yellow: pending
  - Blue: running
  - Green: success
  - Red: failed
  - Gray: skipped
- [ ] Click node to show details panel
- [ ] Legend showing status colors

---

## REQ-UI-003: Pipeline Timeline View
**Description**: Horizontal timeline showing execution sequence

**Acceptance Criteria**:
- [ ] Show nodes in execution order
- [ ] Display duration bar for each node
- [ ] Color code by status
- [ ] Scrollable for long executions
- [ ] Show timestamps

---

## REQ-UI-004: Node Details Panel
**Description**: Show detailed information when clicking a node

**Acceptance Criteria**:
- [ ] Display: Node ID, type, status
- [ ] Show prompt (for LLM nodes)
- [ ] Show response/output
- [ ] Show execution duration
- [ ] Show error message (if failed)
- [ ] Close button / click outside to dismiss

---

## REQ-UI-005: Real-time Updates
**Description**: Live updates via WebSocket connection

**Acceptance Criteria**:
- [ ] Connect to WebSocket on detail page load
- [ ] Handle status_update events
- [ ] Update UI immediately on events
- [ ] Reconnect on disconnect
- [ ] Show connection status indicator

---

## REQ-UI-006: Responsive Layout
**Description**: Usable on different screen sizes

**Acceptance Criteria**:
- [ ] Desktop layout (primary): Sidebar + main content
- [ ] Usable on tablet
- [ ] Graph and timeline scrollable on small screens

---

## REQ-UI-007: Navigation
**Description**: Route-based navigation between pages

**Acceptance Criteria**:
- [ ] `/` - Pipeline list
- [ ] `/pipelines/:id` - Pipeline detail with graph/timeline
- [ ] Browser back/forward works
- [ ] Direct URL access works

---

## REQ-UI-008: API Integration
**Description**: Connect to Attractor HTTP server

**Acceptance Criteria**:
- [ ] GET /pipelines - List all
- [ ] GET /pipelines/:id - Get detail
- [ ] GET /pipelines/:id/decisions - Get decisions
- [ ] WS /pipelines/:id/events - Real-time events

---

## Interface Contracts

### Pipeline Status Badge Colors
```
pending  → #eab308 (yellow)
running  → #3b82f6 (blue)
success  → #22c55e (green)
fail     → #ef4444 (red)
skipped  → #6b7280 (gray)
cancelled → #6b7280 (gray)
```

### Node Details Structure
```javascript
{
  nodeId: string,
  type: string,
  status: 'pending' | 'running' | 'success' | 'fail' | 'skipped',
  prompt?: string,
  response?: string,
  duration?: number,
  error?: string,
  timestamp?: string
}
```

---

## Traceability

| Requirement | Priority | Phase |
|-------------|----------|-------|
| REQ-UI-001 | Critical | Phase 3 |
| REQ-UI-002 | Critical | Phase 5 |
| REQ-UI-003 | High | Phase 6 |
| REQ-UI-004 | High | Phase 7 |
| REQ-UI-005 | Critical | Phase 2 |
| REQ-UI-006 | Medium | Phase 8 |
| REQ-UI-007 | High | Phase 8 |
| REQ-UI-008 | Critical | Phase 2 |
