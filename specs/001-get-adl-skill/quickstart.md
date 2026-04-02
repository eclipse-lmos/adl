# Quickstart: get_adl_skill

## Goal

Verify the `get_adl_skill` feature in `adl-mcp-server` against the approved specification.

## Preconditions

1. The workspace is on branch `001-get-adl-skill`.
2. The ADL server GraphQL endpoint is configured for `adl-mcp-server` at runtime.
3. The module has the dependencies required for outbound Ktor client calls and mocked HTTP tests.

## Implementation Checklist

1. Register `get_adl_skill` in `adl-mcp-server/src/main/kotlin/McpServer.kt`.
2. Add a tool handler that validates `user_query` and delegates to an ADL lookup service.
3. Add an ADL GraphQL client/service layer that calls `searchByText` on the configured endpoint.
4. Reject GraphQL responses containing `errors`.
5. Return the top-ranked `content` on success.
6. Return a no-result success message when the upstream match list is empty.
7. Return tool errors for validation failures, missing configuration, timeouts, malformed payloads, and upstream failures.

## Verification Steps

1. Run the module test suite and confirm unit tests cover input validation and result mapping.
   - Verified with `./gradlew :adl-mcp-server:test --console=plain`
2. Run the mocked HTTP integration-style tests and confirm coverage for:
   - successful top-match response
   - zero-match response
   - blank input rejection
   - timeout or unreachable endpoint
   - GraphQL `errors`
   - malformed payload or blank top-match `content`
   - Verified by the `GetAdlSkillSuccessIntegrationTest`, `GetAdlSkillNoMatchTest`, and `GetAdlSkillDependencyFailureIntegrationTest` suite
3. Validate the success-path latency target in a controlled fixture-backed setup.
   - Verified with `./gradlew :adl-mcp-server:test --tests "org.eclipse.lmos.adl.mcp.tools.adlskill.GetAdlSkillSuccessIntegrationTest.meets the success-path p95 latency target in a controlled fixture setup" --info --console=plain`
4. Start the MCP server in the intended transport mode and invoke `get_adl_skill` manually with a representative query.

## Expected Outcomes

1. Valid query with at least one match returns one MCP text content item containing the top ADL content.
2. Valid query with no matches returns one MCP text content item containing the no-result message.
3. Invalid input or dependency failures return tool errors rather than success content.

## Verification Results

1. `./gradlew :adl-mcp-server:test --console=plain` passed successfully for the module.
2. The fixture-backed success-path latency validation measured a p95 of 6 ms over 20 requests, which is within the 2,000 ms target.
3. MCP startup regression coverage confirms that `McpServer.configureServer()` registers `get_adl_skill` alongside the existing prompts.