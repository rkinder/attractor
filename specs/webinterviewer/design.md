# Design: WebInterviewer Completion

## Overview

The WebInterviewer class is a stub that should enable human-in-the-loop approval gates to work via a web interface. Currently it's not functional.

## Problem Statement

1. `WebInterviewer` is exported from `src/human/interviewer.js` but is a stub
2. HTTP server exists but can't serve human approval UI
3. Users can't approve/reject via web browser

## Functional Requirements

### FR-001: WebInterviewer Implementation
**Type**: Ubiquitous  
**Statement**: The system shall implement WebInterviewer to serve approval requests via HTTP and wait for response.  
**Rationale**: Enable web-based human approval gates.

### FR-002: Integration with HTTP Server
**Type**: Ubiquitous  
**Statement**: The system shall integrate WebInterviewer with the HTTP server to handle approval requests.  
**Rationale**: Route approval requests through the server.

### FR-003: Approval Endpoint
**Type**: Ubiquitous  
**Statement**: The system shall provide an HTTP endpoint for approving/rejecting pending requests.  
**Rationale**: Allow external systems to respond to approval requests.

## Dependencies

- `src/human/interviewer.js` - Implement WebInterviewer
- `src/server/index.js` - Add approval endpoint

## Open Questions

1. **How to handle multiple concurrent approval requests?**
   - Decision: Use request ID to track

2. **Authentication?**
   - Decision: Defer to future, use simple token for now
