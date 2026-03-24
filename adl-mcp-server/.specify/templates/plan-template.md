# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Kotlin/JVM 21 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., Ktor, MCP Kotlin SDK, JUnit 5 or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., JUnit 5, Gradle test, contract validation, integration checks or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., JVM server process over stdio/SSE or NEEDS CLARIFICATION]
**Project Type**: [e.g., Kotlin MCP server or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., latency, throughput, startup, or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., protocol compatibility, transport parity, backward compatibility or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., number of tools, client types, deployment context or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] Spec exists before implementation and matches the change scope.
- [ ] Spec defines intended behavior, scope, assumptions, inputs, outputs, and failure conditions.
- [ ] MCP-facing changes define request/response schemas, required/optional fields, validation, and error handling.
- [ ] Planned verification covers specified behavior and failure handling, including contract validation when applicable.
- [ ] Any constitution violation is either resolved before planning continues or explicitly justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this repository. Expand the chosen structure with real paths used by the
  feature. The delivered plan must not include unused placeholder lines.
-->

```text
src/
├── main/
│   ├── kotlin/
│   │   ├── McpServer.kt
│   │   ├── SystemPromptMutation.kt
│   │   ├── Util.kt
│   │   ├── prompts/
│   │   ├── sessions/
│   │   └── templates/
│   └── resources/
│       ├── assistant.md
│       └── role.md
└── test/
    ├── java/
    └── resources/

specs/[###-feature]/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
