# Implementation Plan: Add get_adl_skill Tool

**Branch**: `001-get-adl-skill` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-get-adl-skill/spec.md`

## Summary

Add the first MCP tool to the `adl-mcp-server` module by registering `get_adl_skill` in the existing server configuration, validating the required `user_query` argument, calling the runtime-configured ADL server GraphQL endpoint with the `searchByText` query, and mapping upstream outcomes into the three client-visible behaviors defined by the spec: top-match content, no-result success message, or tool error. The implementation should isolate outbound ADL server access behind a small client/service layer so request validation, GraphQL response handling, and MCP result formatting can be tested independently.

## Technical Context

**Language/Version**: Kotlin/JVM targeting Java 24  
**Primary Dependencies**: MCP Kotlin SDK, Ktor server, GraphQL Kotlin server libraries, kotlinx serialization, kotlinx coroutines, JUnit 5, AssertJ, MockK  
**Storage**: N/A  
**Testing**: Gradle test, JUnit 5, AssertJ, MockK, plus an HTTP-level integration-style test approach for the ADL server dependency path  
**Target Platform**: JVM MCP server supporting stdio and SSE transports  
**Project Type**: Kotlin MCP server module inside a multi-project Gradle build  
**Performance Goals**: Preserve the spec goal that healthy upstream lookups complete within 2 seconds for typical queries  
**Constraints**: MCP contract must expose only `user_query`; endpoint selection must come from runtime configuration; GraphQL `errors` must fail the tool even if `data` is present; no-match responses must remain successful tool results  
**Scale/Scope**: One new MCP tool, one outbound GraphQL dependency path, one configuration surface for the ADL endpoint, and focused unit/integration coverage for success and failure branches

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Spec exists before implementation and matches the change scope.
- [x] Spec defines intended behavior, scope, assumptions, inputs, outputs, and failure conditions.
- [x] MCP-facing changes define request/response schemas, required/optional fields, validation, and error handling.
- [x] Planned verification covers specified behavior and failure handling, including contract validation when applicable.
- [x] Any constitution violation is either resolved before planning continues or explicitly justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-get-adl-skill/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
adl-mcp-server/
├── src/
│   ├── main/
│   │   ├── kotlin/
│   │   │   ├── McpServer.kt
│   │   │   ├── Util.kt
│   │   │   ├── prompts/
│   │   │   ├── sessions/
│   │   │   ├── templates/
│   │   │   └── [new tool/client package(s)]
│   │   └── resources/
│   │       ├── assistant.md
│   │       └── role.md
│   └── test/
│       ├── java/
│       └── resources/
└── build.gradle.kts

adl-server/
└── src/main/kotlin/inbound/query/AdlQuery.kt
```

**Structure Decision**: Keep MCP registration in `adl-mcp-server/src/main/kotlin/McpServer.kt` and introduce a small internal package for the new tool flow, likely separating MCP-facing tool handling from outbound ADL GraphQL access. Keep tests in the existing `adl-mcp-server/src/test/java` tree unless the module adopts a Kotlin-specific test source root during implementation. Treat `adl-server/src/main/kotlin/inbound/query/AdlQuery.kt` as the upstream contract reference for `searchByText` and `UseCaseMatch` fields rather than a file to modify.

## Phase 0 Research

1. Confirm the MCP Kotlin SDK tool registration API and the preferred result/error mapping shape for this module, since `McpServer.kt` currently advertises tool capability but only registers prompts.
2. Decide the outbound ADL client boundary: direct HTTP/GraphQL call inside the tool handler versus a dedicated client/service abstraction. Favor a dedicated abstraction to isolate network concerns and make validation and mapping testable.
3. Choose the runtime configuration mechanism for the ADL server endpoint within this module, including default behavior when configuration is missing.
4. Choose the HTTP testing approach for integration-style verification of GraphQL success, no-match, timeout, malformed payload, and GraphQL-error responses.

**Phase 0 Output**: [research.md](./research.md)

## Phase 1 Design

1. Define the tool input model and validation path for `user_query`, including trimming and rejection behavior.
2. Define the ADL GraphQL request payload for `searchByText` and the minimal response model needed from `UseCaseMatch`, especially `content` and response-level `errors`.
3. Define the translation rules from upstream outcomes to MCP outcomes:
	- valid top match -> success text content
	- zero matches -> success no-result text content
	- validation failure -> tool error
	- transport timeout/unreachable endpoint -> tool error
	- GraphQL `errors` present -> tool error
	- malformed or incomplete response -> tool error
4. Define where configuration is loaded and how missing endpoint configuration is surfaced consistently.
5. Define the tests needed to cover the acceptance scenarios and failure conditions in the spec.

**Phase 1 Outputs**: [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [get_adl_skill.md](./contracts/get_adl_skill.md)

## Phase 2 Implementation Strategy

1. Extend `McpServer.kt` to register the `get_adl_skill` tool alongside existing prompts.
2. Add a focused tool handler that parses MCP arguments, validates `user_query`, delegates to an ADL lookup service, and formats MCP results.
3. Add an outbound ADL GraphQL client/service that:
	- reads the runtime-configured endpoint
	- constructs the `searchByText` request
	- parses the GraphQL envelope
	- rejects responses containing `errors`
	- selects the top-ranked match content when usable
4. Add configuration support and explicit failure behavior for missing or invalid endpoint configuration.
5. Add unit tests for validation, result mapping, and upstream-response handling.
6. Add integration-style tests with a mocked HTTP dependency to verify the GraphQL wire path and failure handling.

## Verification Strategy

1. Verify successful lookup returns a single MCP text content block containing the top match content.
2. Verify zero-match responses return a successful MCP text content block with the no-result message.
3. Verify blank or missing `user_query` fails before any outbound call.
4. Verify timeout, unreachable endpoint, malformed payload, and GraphQL `errors` all produce tool errors.
5. Verify no partial content is returned when GraphQL `errors` are present or when the top match content is unusable.
6. Run the module test suite through Gradle and confirm the new tool does not regress existing stdio/SSE server startup paths.

## Post-Design Constitution Check

- [x] Spec, plan, and design artifacts remain aligned on intended behavior and bounded scope.
- [x] MCP contract details remain explicit across request shape, response shape, validation, and failure handling.
- [x] Planned verification covers success, no-match, validation, malformed payload, timeout, and GraphQL-error behavior.
- [x] No constitution violations require justification in Complexity Tracking.

## Implementation Notes for `/speckit.plan`

- This module currently has MCP prompt registration but no tool registration, so planning should account for the first tool being added to the server configuration path.
- The module already has JUnit 5, AssertJ, and MockK available from the root Gradle configuration.
- The module does not currently show an outbound HTTP client dependency or a mock HTTP server dependency, so the plan should explicitly call out any dependency additions required for GraphQL calls and integration-style tests.
- The upstream behavior reference for this feature is `adl-server`'s `searchByText` GraphQL query and `UseCaseMatch.content` field.
