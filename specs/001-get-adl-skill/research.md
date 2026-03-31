# Research: get_adl_skill

## Decision 1: Register `get_adl_skill` as the first MCP tool in `McpServer.configureServer`

**Decision**: Add tool registration in `adl-mcp-server/src/main/kotlin/McpServer.kt` alongside the existing prompt registration path, keeping `McpServer` as the single composition root for stdio and SSE transports.

**Rationale**: `McpServer.configureServer()` already builds the `Server`, declares tool capability, and registers prompts. Adding tool registration there preserves the current composition pattern and keeps transport setup unchanged.

**Alternatives considered**:
- Add tool registration inside each transport startup path: rejected because it duplicates server composition logic.
- Build a separate tool-only server wrapper: rejected because the module is small and already has a single server configuration point.

## Decision 2: Use a dedicated ADL GraphQL client/service layer instead of inline network calls

**Decision**: Introduce a small internal service boundary between the MCP tool handler and the outbound ADL GraphQL call.

**Rationale**: The feature has three distinct responsibilities that should be testable independently: MCP argument parsing, upstream GraphQL interaction, and MCP result/error mapping. A dedicated client/service layer keeps network concerns and GraphQL envelope parsing out of the MCP handler.

**Alternatives considered**:
- Perform HTTP and GraphQL handling directly inside the tool handler: rejected because it couples transport, validation, and mapping logic and makes unit testing harder.
- Add a broad repository or gateway abstraction shared across modules: rejected because only one outbound dependency is needed for this feature.

## Decision 3: Use Ktor `HttpClient` with CIO and kotlinx serialization for outbound GraphQL requests

**Decision**: Add Ktor client dependencies from the root version catalog and implement the ADL lookup using `HttpClient(CIO)` with JSON serialization.

**Rationale**: The repository already uses Ktor on the server side and exposes Ktor client libraries in the shared version catalog. Reusing Ktor reduces dependency sprawl and keeps timeout and JSON handling consistent with the existing stack.

**Alternatives considered**:
- Add a separate HTTP client library such as OkHttp: rejected because it introduces another stack without a repo-level need.
- Reuse GraphQL server libraries for client behavior: rejected because the current GraphQL dependencies are server-oriented, not a client abstraction.

## Decision 4: Source the ADL endpoint from a runtime-configured server setting

**Decision**: Treat the ADL GraphQL endpoint as a required runtime configuration value for the server process and surface missing configuration as a tool error before any outbound call.

**Rationale**: The spec requires runtime configuration and explicitly excludes per-request endpoint override. This keeps the MCP contract stable and avoids exposing deployment details to clients.

**Alternatives considered**:
- Hardcode a localhost endpoint: rejected because it breaks deployment portability.
- Allow endpoint override in the MCP request: rejected by the approved specification.

## Decision 5: Treat any GraphQL `errors` entry as a hard failure

**Decision**: If the ADL server returns any `errors` entries in the GraphQL response envelope, the tool returns a dependency-oriented tool error and ignores all partial `data`.

**Rationale**: The specification already resolved this clarification. The behavior must be deterministic and must not leak partial or ambiguous content to MCP clients.

**Alternatives considered**:
- Return top-match content when `data` is present despite `errors`: rejected because it violates the clarified contract.
- Downgrade GraphQL errors to a no-result success response: rejected because it hides upstream failures.

## Decision 6: Use unit tests plus mocked HTTP integration-style tests

**Decision**: Cover pure validation and mapping logic with unit tests, and cover the ADL GraphQL wire path with integration-style tests against a mocked HTTP endpoint.

**Rationale**: The feature boundary is small but behaviorally sensitive. Unit tests keep validation and mapping fast, while HTTP-level tests verify GraphQL envelope handling, timeouts, malformed payloads, and no-result behavior without depending on a live ADL server.

**Alternatives considered**:
- Unit tests only: rejected because they would not verify the request/response wire contract.
- Live integration tests against a real ADL server: rejected because they are more brittle and unnecessary for this scope.