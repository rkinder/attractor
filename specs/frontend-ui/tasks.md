# Tasks: Frontend UI Implementation

## Phase 1: Project Setup

- [ ] **TASK-1.1**: Create frontend directory structure
  - Create `frontend/` with subdirectories
  - Set up package.json with dependencies
  - Configure Vite

- [ ] **TASK-1.2**: Add static file serving to server
  - Modify `src/server/index.js`
  - Add route to serve frontend in production

- [ ] **TASK-1.3**: Verify empty shell builds and runs

---

## Phase 2: Core Components

- [ ] **TASK-2.1**: Create API service
  - File: `frontend/src/services/api.js`
  - Implement: getPipelines, getPipeline, getDecisions

- [ ] **TASK-2.2**: Create WebSocket hook
  - File: `frontend/src/hooks/useWebSocket.js`
  - Implement: connect, disconnect, event handling

- [ ] **TASK-2.3**: Create StatusBadge component
  - File: `frontend/src/components/StatusBadge.jsx`
  - Variants: pending, running, success, fail, cancelled

---

## Phase 3: Pipeline List

- [ ] **TASK-3.1**: Create PipelineList component
  - File: `frontend/src/components/PipelineList.jsx`
  - Display table with pipelines
  - Status badges
  - Click to navigate

- [ ] **TASK-3.2**: Create PipelinesPage
  - File: `frontend/src/pages/PipelinesPage.jsx`
  - Fetch and display pipelines
  - Auto-refresh every 10s

---

## Phase 4: DOT to Mermaid Converter

- [ ] **TASK-4.1**: Create DOT parser utility
  - File: `frontend/src/utils/dotToMermaid.js`
  - Convert digraph to mermaid graph syntax
  - Handle basic node shapes
  - Handle edges

---

## Phase 5: Graph View

- [ ] **TASK-5.1**: Create PipelineGraph component
  - File: `frontend/src/components/PipelineGraph.jsx`
  - Integrate Mermaid.js
  - Render DOT as interactive DAG
  - Apply status colors to nodes

- [ ] **TASK-5.2**: Add legend component
  - Show status color mappings

---

## Phase 6: Timeline View

- [ ] **TASK-6.1**: Create PipelineTimeline component
  - File: `frontend/src/components/PipelineTimeline.jsx`
  - Horizontal timeline layout
  - Duration bars per node
  - Color coding

---

## Phase 7: Node Details

- [ ] **TASK-7.1**: Create NodeDetails component
  - File: `frontend/src/components/NodeDetails.jsx`
  - Modal or slide-in panel
  - Display: ID, type, status, prompt, response, duration, error

---

## Phase 8: Pipeline Detail Page

- [ ] **TASK-8.1**: Create PipelineDetailPage
  - File: `frontend/src/pages/PipelineDetailPage.jsx`
  - Header with pipeline info
  - Tab bar (Graph | Timeline)
  - Real-time updates via WebSocket

---

## Phase 9: Integration

- [ ] **TASK-9.1**: Set up React Router
  - Configure routes: `/`, `/pipelines/:id`

- [ ] **TASK-9.2**: Style with CSS
  - Dark theme matching spec colors
  - Responsive layout

- [ ] **TASK-9.3**: Test end-to-end
  - Create pipeline via API
  - View in UI
  - Verify real-time updates

---

## Definition of Done

- [ ] All tasks completed
- [ ] Builds without errors
- [ ] Pipeline list shows all pipelines
- [ ] Graph view renders DOT correctly
- [ ] Timeline view shows execution sequence
- [ ] Node details show on click
- [ ] Real-time updates work via WebSocket
- [ ] Responsive on desktop
