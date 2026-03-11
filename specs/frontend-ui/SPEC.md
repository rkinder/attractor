# Spec: Attractor UI - Pipeline Visualization Dashboard

## Overview

A React-based frontend for visualizing and monitoring Attractor pipeline executions. Provides real-time updates via WebSocket and interactive DAG visualization using Mermaid.js.

## Architecture

### Directory Structure
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── PipelineGraph.jsx      # DAG visualization
│   │   ├── PipelineTimeline.jsx  # Execution timeline
│   │   ├── NodeDetails.jsx       # Node detail modal/panel
│   │   ├── PipelineList.jsx      # List of pipelines
│   │   └── StatusBadge.jsx       # Status indicator
│   ├── hooks/
│   │   ├── usePipeline.js         # Pipeline data fetching
│   │   └── useWebSocket.js       # WebSocket connection
│   ├── pages/
│   │   ├── PipelinesPage.jsx     # Main pipelines list
│   │   └── PipelineDetailPage.jsx # Single pipeline view
│   ├── services/
│   │   └── api.js                # API client
│   ├── utils/
│   │   └── dotToMermaid.js       # DOT to Mermaid converter
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── .env.example
```

## UI/UX Specification

### Color Palette
| Purpose | Color | Hex |
|---------|-------|-----|
| Background | Dark slate | #0f172a |
| Surface | Slate | #1e293b |
| Border | Gray | #334155 |
| Text primary | White | #f8fafc |
| Text secondary | Light gray | #94a3b8 |
| Pending | Yellow | #eab308 |
| Running | Blue | #3b82f6 |
| Success | Green | #22c55e |
| Fail | Red | #ef4444 |
| Skipped | Gray | #6b7280 |

### Typography
- Font: Inter (system fallback: -apple-system, sans-serif)
- Headings: 24px (h1), 20px (h2), 16px (h3)
- Body: 14px
- Small: 12px

### Layout

#### Main Layout
- Sidebar (240px): Navigation, pipeline list
- Main content: Pipeline detail view with tabs

#### Pipeline Detail View
- Header: Pipeline ID, status, created/completed times
- Tab bar: Graph | Timeline
- Content area: Graph or Timeline visualization
- Right panel (optional): Node details (slides in on click)

## Components

### 1. PipelineGraph
**Purpose**: Visualize DOT workflow as interactive DAG

**Features**:
- Render using Mermaid.js
- Node colors based on execution status
- Click node to show details
- Zoom/pan for large graphs
- Legend showing status colors

**Mermaid Theme**:
- Dark background (#0f172a)
- Node colors match status
- Edge arrows for flow direction

### 2. PipelineTimeline
**Purpose**: Show execution sequence over time

**Features**:
- Horizontal timeline
- Each node as a node on timeline
- Duration bar for each node
- Color coding by status
- Scrollable for long executions
- Shows start/end timestamps

### 3. NodeDetails
**Purpose**: Show detailed information about a node

**Display**:
- Node ID and type
- Status badge
- Prompt (if LLM node)
- Response/output
- Execution duration
- Error message (if failed)
- Timestamp

**Interaction**:
- Modal overlay or slide-in panel
- Close button
- Copy to clipboard buttons

### 4. PipelineList
**Purpose**: List all pipelines

**Columns**:
- Status indicator
- Pipeline ID (truncated)
- Created time
- Duration
- Outcome

**Actions**:
- Click to view detail
- Filter by status

### 5. StatusBadge
**Purpose**: Visual status indicator

**Variants**: pending, running, completed, failed, cancelled

## Functionality Specification

### Core Features

1. **Pipeline List View**
   - Fetch all pipelines from `/pipelines` endpoint
   - Display in table with status, ID, time, duration
   - Auto-refresh every 10 seconds
   - Filter by status

2. **Pipeline Detail View**
   - Fetch pipeline from `/pipelines/:id` endpoint
   - Fetch decisions from `/pipelines/:id/decisions`
   - Two view modes: Graph and Timeline
   - Real-time updates via WebSocket

3. **Graph View**
   - Convert DOT source to Mermaid syntax
   - Render interactive DAG
   - Update node colors in real-time
   - Click node for details

4. **Timeline View**
   - Show execution sequence
   - Display duration per node
   - Color code by status

5. **Real-time Updates**
   - Connect to WebSocket at `/pipelines/:id/events`
   - Handle: status_update, coordinator_decision, human_request
   - Update UI automatically on events

### API Integration

```javascript
// Endpoints used
GET  /pipelines              // List all pipelines
GET  /pipelines/:id          // Get pipeline detail
GET  /pipelines/:id/decisions // Get decisions
WS   /pipelines/:id/events   // WebSocket for real-time
```

### DOT to Mermaid Conversion

```javascript
// Input: DOT
digraph {
  start [shape=Mdiamond]
  node1 [prompt="Hello"]
  start -> node1 -> end
}

// Output: Mermaid
graph TD
  start
  node1
  end
  start --> node1 --> end
```

## Acceptance Criteria

### Pipeline List
- [ ] Shows all pipelines with status badge
- [ ] Clicking pipeline navigates to detail
- [ ] Auto-refreshes every 10s
- [ ] Shows loading and error states

### Pipeline Detail - Graph View
- [ ] Renders DOT as Mermaid DAG
- [ ] Node colors reflect execution status
- [ ] Clicking node shows details panel
- [ ] Legend displays status colors

### Pipeline Detail - Timeline View
- [ ] Shows horizontal timeline
- [ ] Each node shows duration
- [ ] Color coded by status
- [ ] Scrollable for long executions

### Real-time Updates
- [ ] WebSocket connects on detail page
- [ ] Status updates reflected immediately
- [ ] Reconnects on disconnect

### Responsive
- [ ] Works on desktop (primary)
- [ ] Usable on tablet

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "mermaid": "^10.x",
    "axios": "^1.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

## Server Integration

The frontend will be served by the existing Express server. Add static file serving:

```javascript
// src/server/index.js
import path from 'path';

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'frontend/dist/index.html'));
  });
}
```

## Future Enhancements
- Retry failed nodes from UI
- Cancel running pipelines
- Human intervention UI (approve/reject)
- Artifact download
- Dark/light theme toggle
- Search and filter pipelines
