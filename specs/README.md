# Attractor Feature Specifications

This directory contains EARS-based (Easy Approach to Requirements Syntax) specifications for all features to be ported from the Python version of Attractor to the JavaScript version.

## Specification Structure

Each feature has its own directory with three documents:

- **design.md** - High-level architecture, EARS-formatted functional requirements, dependencies, open questions
- **requirements.md** - Detailed technical specifications with acceptance criteria, interface contracts, traceability matrix
- **tasks.md** - Implementation checklist with tasks, test cases, estimated effort

## Complete Specifications

### High Priority Features

1. **[tool-handler](./tool-handler/)** - Execute external shell commands as pipeline nodes
   - **Complexity**: Low
   - **Effort**: ~6 hours
   - **Dependencies**: Node.js `child_process`
   - **Key Features**: Shell execution, timeout enforcement, stdout/stderr capture

2. **[parallel-handler](./parallel-handler/)** - Execute multiple branches concurrently
   - **Complexity**: High
   - **Effort**: ~12 hours
   - **Dependencies**: Optional `p-limit` for concurrency control
   - **Key Features**: Async concurrency, context isolation, PARTIAL_SUCCESS status, configurable parallelism

3. **[fanin-handler](./fanin-handler/)** - Consolidate parallel branch results using LLM
   - **Complexity**: Medium
   - **Effort**: ~10.5 hours
   - **Dependencies**: LLM backend (shared with CodergenHandler)
   - **Key Features**: Branch output collection, LLM consolidation, graceful degradation

4. **[secrets-management](./secrets-management/)** - Multi-provider secret resolution
   - **Complexity**: Medium
   - **Effort**: ~8 hours
   - **Dependencies**: Optional AWS SDK, Azure SDK
   - **Key Features**: Environment variables, AWS Secrets Manager, Azure Key Vault, provider fallback

5. **[mcp-integration](./mcp-integration/)** - Model Context Protocol tool invocation
   - **Complexity**: Medium
   - **Effort**: ~9.5 hours
   - **Dependencies**: Node.js `child_process`, `readline`
   - **Key Features**: MCP server management, JSON-RPC communication, tool discovery/invocation

6. **[http-server](./http-server/)** - REST API for remote pipeline execution
   - **Complexity**: High
   - **Effort**: ~9 hours
   - **Dependencies**: Fastify or Express, WebSocket library
   - **Key Features**: Pipeline submission, status polling, cancellation, WebSocket events

### Medium Priority Features

7. **[managerloop-handler](./managerloop-handler/)** - Supervisor pattern for child pipelines
   - **Complexity**: Medium
   - **Effort**: ~6 hours
   - **Dependencies**: LLM backend
   - **Key Features**: Observe-decide-act loop, telemetry gathering, LLM steering decisions

8. **[advanced-cli](./advanced-cli/)** - Professional command-line interface
   - **Complexity**: Low
   - **Effort**: ~4 hours
   - **Dependencies**: `commander` or `yargs`
   - **Key Features**: Subcommands, rich help, argument validation, configuration options

## Total Estimated Effort

| Priority | Features | Total Effort |
|----------|----------|--------------|
| High | 6 features | ~55 hours |
| Medium | 2 features | ~10 hours |
| **Total** | **8 features** | **~65 hours** |

## Implementation Roadmap

### Phase 1: Core Handlers (Quick Wins)
1. Tool Handler (~6 hours) - Simplest, immediate utility
2. Parallel Handler (~12 hours) - Foundation for concurrent execution
3. FanIn Handler (~10.5 hours) - Complements parallel execution

**Phase 1 Total**: ~28.5 hours

### Phase 2: Production Features
4. Secrets Management (~8 hours) - Production requirement
5. MCP Integration (~9.5 hours) - Modern AI tooling standard
6. HTTP Server (~9 hours) - Remote execution capability

**Phase 2 Total**: ~26.5 hours

### Phase 3: Advanced Features
7. ManagerLoop Handler (~6 hours) - Advanced orchestration
8. Advanced CLI (~4 hours) - Improved developer experience

**Phase 3 Total**: ~10 hours

## EARS Methodology

All specifications follow the EARS (Easy Approach to Requirements Syntax) pattern:

### EARS Patterns Used

| Pattern | Format | Example |
|---------|--------|---------|
| **Ubiquitous** | The system shall... | The system shall execute shell commands |
| **Event-driven** | WHEN \<trigger\>, the system shall... | WHEN a command completes, the system shall capture output |
| **State-driven** | WHILE \<state\>, the system shall... | WHILE executing, the system shall enforce timeout |
| **Unwanted Behavior** | IF \<condition\>, THEN the system shall... | IF timeout exceeded, THEN the system shall kill process |
| **Optional Feature** | WHERE \<feature\>, the system shall... | WHERE backend configured, the system shall invoke LLM |

### Quality Standards

Each specification includes:

- ✅ **EARS-formatted requirements** - Clear, testable functional requirements
- ✅ **Acceptance criteria** - Checkboxes for each requirement
- ✅ **Interface contracts** - Schemas, types, API definitions
- ✅ **Traceability matrix** - Links design → requirements → tests
- ✅ **Test cases** - Specific scenarios with steps and expected outcomes
- ✅ **Implementation tasks** - Ordered, estimated, with dependencies
- ✅ **Definition of Done** - Quality gates for completion

## Using These Specifications

### For Developers

1. **Read design.md first** - Understand the architecture and requirements
2. **Review requirements.md** - Get detailed acceptance criteria
3. **Follow tasks.md** - Implement in order, mark tasks as complete
4. **Write tests** - Use provided test cases as guide
5. **Verify DoD** - Check all Definition of Done items before completing

### For Project Managers

- Use **tasks.md** for sprint planning and effort estimation
- Track progress using task completion checkboxes
- Reference **traceability matrix** to ensure all requirements covered

### For QA/Testing

- Use **test cases** from each spec as test plan
- Verify **acceptance criteria** from requirements.md
- Check **Definition of Done** before signing off

## Feature Dependencies

```
Parallel Handler
    ↓
FanIn Handler (depends on parallel execution pattern)

Secrets Management
    ↓
MCP Integration (may use secrets for server auth)
    ↓
HTTP Server (may use secrets for API keys)

Tool Handler → (independent)
ManagerLoop Handler → (independent, but benefits from other handlers)
Advanced CLI → (integrates all features)
```

## Next Steps

1. **Review** all specifications for completeness
2. **Prioritize** implementation order based on dependencies
3. **Assign** features to developers
4. **Track** progress using task checkboxes
5. **Test** each feature against provided test cases
6. **Document** as you implement (update examples, README)

## Contributing

When implementing these specs:

- Follow the task order in tasks.md
- Mark tasks complete as you finish them
- Write tests before marking requirements complete
- Update documentation alongside code
- Reference requirement IDs (REQ-XXX) in commit messages

## Questions?

For questions about these specifications:
- Check **Open Questions** section in design.md
- Review **Alternative Approaches** in tasks.md
- Consult Python reference implementation
- Update specs if assumptions change
