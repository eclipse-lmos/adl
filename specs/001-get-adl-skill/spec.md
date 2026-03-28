# Feature Specification: Add get_adl_skill Tool

**Feature Branch**: `001-get-adl-skill`  
**Created**: 2026-03-28  
**Status**: Draft  
**Input**: User description: "get_adl_skill"

## Intended Behavior *(mandatory)*

The ADL MCP Server will expose a new MCP tool named `get_adl_skill` that accepts a natural-language `user_query`, searches the external ADL server for relevant Architecture Decision Library content, and returns the content of the highest-ranked matching ADL as MCP text content. When no relevant ADL is found, the tool will return a successful response that clearly states no matching ADL was available for the query. When the ADL server cannot be reached or returns an invalid upstream response, the tool will fail with a tool error that explains the dependency failure without exposing internal implementation details.

## Clarifications

### Session 2026-03-28

- Q: How should the ADL server endpoint be sourced for `get_adl_skill`? → A: Require the ADL server GraphQL endpoint to be provided via runtime configuration.
- Q: How should `get_adl_skill` behave when the ADL server returns GraphQL `errors` in the response? → A: Treat any GraphQL `errors` entry as an upstream failure and return a tool error.

## Scope & Assumptions *(mandatory)*

### In Scope

- Add `get_adl_skill` to the MCP server's advertised tool list and runtime tool handlers.
- Accept a required `user_query` string parameter from MCP clients.
- Send a search request to the configured ADL server using the `searchByText` GraphQL operation with the user query as input.
- Select the highest-ranked match returned by the ADL server and return its content to the MCP client.
- Return an explicit success message when the ADL server returns no matches.
- Return a tool error when the ADL server is unreachable, times out, or returns an unusable response.
- Use a server-level runtime-configured ADL server GraphQL endpoint rather than a hardcoded endpoint or per-request endpoint override.

### Out of Scope

- Modifying ranking behavior, search semantics, or embeddings logic inside the ADL server.
- Returning multiple ADL matches, pagination, filtering, or metadata beyond the selected ADL content and user-facing no-result messaging.
- Defining new authentication, authorization, or transport protocols between the MCP server and the ADL server.
- Allowing MCP clients to supply or override the ADL server endpoint as part of the tool request.
- Changing existing prompt behavior or adding non-tool MCP surfaces.

### Assumptions

- Operators will provide a reachable ADL server GraphQL endpoint through server runtime configuration before enabling this feature.
- The ADL server already exposes a `searchByText` query that accepts the caller's text query and returns ranked matches containing ADL content.
- The top result in the ADL server response represents the most relevant match for client display.
- MCP clients consuming this tool can render standard MCP text content blocks.
- If the ADL server returns zero matches, that is treated as a valid business outcome rather than an error condition.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve the Best Matching ADL (Priority: P1)

As an MCP client user, I want to submit a natural-language question and receive the most relevant ADL content so I can reuse established architectural guidance without leaving my current workflow.

**Why this priority**: This is the primary value of the feature and the minimum usable slice.

**Independent Test**: Can be fully tested by invoking `get_adl_skill` with a query that has at least one upstream match and verifying that the returned MCP text content contains the content of the first-ranked ADL.

**Acceptance Scenarios**:

1. **Given** the MCP server is connected to a healthy ADL server and the ADL server returns one or more ranked matches for a query, **When** a client calls `get_adl_skill` with a non-empty `user_query`, **Then** the MCP server returns a successful tool result containing the content of the highest-ranked match as text content.
2. **Given** the ADL server returns multiple matches with distinct rankings, **When** a client calls `get_adl_skill`, **Then** the MCP server returns only the top-ranked match's content and does not include lower-ranked matches in the response.

---

### User Story 2 - Handle No-Match Searches Gracefully (Priority: P2)

As an MCP client user, I want a clear no-result response when no ADL matches my query so I can refine my request instead of treating the outcome as a system failure.

**Why this priority**: No-match behavior is part of the requested contract and prevents ambiguous client handling.

**Independent Test**: Can be fully tested by invoking `get_adl_skill` against an upstream response with zero matches and verifying that the tool succeeds with a user-readable no-result message.

**Acceptance Scenarios**:

1. **Given** the ADL server successfully processes the search and returns no matches, **When** a client calls `get_adl_skill`, **Then** the MCP server returns a successful tool result with a message stating that no relevant ADL was found for the query.

---

### User Story 3 - Surface Upstream Failures Clearly (Priority: P3)

As an MCP client user, I want dependency failures reported as tool errors so I can distinguish system availability problems from valid no-result searches.

**Why this priority**: Dependency failure handling is necessary for reliable client behavior but does not create value without the primary retrieval flow.

**Independent Test**: Can be fully tested by invoking `get_adl_skill` while the ADL server is unavailable or returns a malformed response and verifying that the tool call fails with a dependency-oriented error message.

**Acceptance Scenarios**:

1. **Given** the ADL server cannot be reached, **When** a client calls `get_adl_skill`, **Then** the MCP server returns a tool error that indicates the ADL server could not be contacted.
2. **Given** the ADL server responds without usable match content for the top-ranked result, **When** a client calls `get_adl_skill`, **Then** the MCP server returns a tool error describing the upstream response as invalid or incomplete.

---

### Edge Cases

- What happens when `user_query` is empty, blank, or only whitespace? The tool rejects the request before contacting the ADL server and returns a validation error.
- How does the system handle a top-ranked match whose `content` field is missing or blank? The tool treats the upstream response as unusable and returns a tool error.
- How does the system handle upstream latency beyond the expected request window? The tool returns a dependency failure rather than hanging indefinitely.
- What happens when the ADL server returns GraphQL `errors`, even if `data` is also present? The tool returns a tool error and does not use partial data.
- What happens when the ADL server returns matches but changes the response shape unexpectedly? The tool returns a tool error describing the upstream response as invalid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The MCP server MUST advertise a tool named `get_adl_skill` to connected MCP clients.
- **FR-002**: The `get_adl_skill` tool MUST require a `user_query` input field of type string and MUST NOT accept an endpoint override in the tool input.
- **FR-003**: The tool MUST reject requests where `user_query` is empty or contains only whitespace.
- **FR-004**: For valid requests, the tool MUST submit the user query to the ADL server using the `searchByText` GraphQL query.
- **FR-005**: The tool MUST evaluate the returned match list in ranking order and use the first match as the selected result.
- **FR-006**: When the ADL server returns at least one usable match, the tool MUST return the selected match's content as MCP text content.
- **FR-007**: When the ADL server returns zero matches, the tool MUST return a successful tool result with a human-readable message indicating that no relevant ADL was found for the submitted query.
- **FR-008**: The tool MUST distinguish no-match results from dependency failures by returning tool errors only for validation failures or upstream communication/response failures.
- **FR-009**: If the ADL server is unreachable, times out, or returns a non-usable response, the tool MUST return a tool error that identifies the ADL server interaction as the source of failure.
- **FR-010**: The tool MUST avoid returning partial or inferred ADL content when the upstream response does not contain a usable top match.
- **FR-011**: If the ADL server GraphQL response contains any `errors` entries, the tool MUST treat the response as a failure and MUST NOT return content derived from the `data` portion of that response.

### Non-Functional Requirements *(include if applicable)*

- **NFR-001**: Under normal network conditions and a healthy ADL server, a successful tool call SHOULD complete within 2 seconds for typical queries.
- **NFR-002**: The tool MUST produce deterministic client-visible behavior for the same upstream outcome: success with top-match content, success with a no-result message, or failure with a dependency/validation error.
- **NFR-003**: The tool MUST not expose stack traces, credentials, or internal connection details in client-visible error messages.

## Inputs, Outputs & Interfaces *(mandatory)*

### Inputs

- **IN-001**: MCP tool invocation for `get_adl_skill` with a JSON argument object containing `user_query`.
- **IN-002**: `user_query` is a required string supplied by the MCP client and validated as non-empty after trimming surrounding whitespace.
- **IN-003**: Server runtime configuration supplying the target ADL server GraphQL endpoint is required before the tool can contact the upstream dependency.

### Outputs

- **OUT-001**: On success with matches, the tool returns a standard MCP tool result containing one text content block whose text is the content of the selected ADL.
- **OUT-002**: On success with no matches, the tool returns a standard MCP tool result containing one text content block with a no-result message.
- **OUT-003**: On validation or upstream failure, the tool returns a tool error and does not emit a success payload.

### MCP Contract Details *(mandatory for MCP-facing features)*

- **Surface**: MCP tool named `get_adl_skill` exposed by the ADL MCP Server.
- **Request Schema**: JSON object `{ "user_query": string }` with `user_query` required. No endpoint field or other optional request fields are supported for this feature.
- **Response Schema**: Success responses return an MCP tool result with `content` containing exactly one object shaped as `{ "type": "text", "text": string }`. For a match, `text` contains the top ADL content. For a no-match outcome, `text` contains a human-readable message such as `No relevant ADL found for query: <query>`. Failure responses return a tool error instead of success content.
- **Validation Rules**: `user_query` must be present, must be a string, and must contain at least one non-whitespace character after trimming. Requests that fail validation are rejected locally without contacting the ADL server.
- **Error Handling**: Invalid input returns a validation-oriented tool error. Dependency failures such as connection errors, timeouts, GraphQL `errors`, or invalid upstream payloads return a dependency-oriented tool error with user-facing wording that identifies the ADL server as unavailable or invalid without exposing stack traces or credentials. The runtime-configured endpoint is the only upstream target used by contract. No-match outcomes are returned as successful responses and are not retried automatically by contract.

## Failure Conditions *(mandatory)*

- **FC-001**: If `user_query` is missing, not a string, or blank after trimming, the system MUST reject the invocation with a validation error and MUST NOT call the ADL server.
- **FC-002**: If the ADL server cannot be reached or does not respond within the configured request window, the system MUST fail the tool call with a dependency error.
- **FC-003**: If the ADL server GraphQL response contains any `errors` entries, the system MUST fail the tool call with an upstream response error and MUST NOT use partial response data.
- **FC-004**: If the ADL server response does not contain a usable top match structure or content when matches are reported, the system MUST fail the tool call with an upstream response error.
- **FC-005**: If the ADL server returns zero matches, the specification explicitly defines that no special failure behavior applies; the system returns a successful no-result message.

### Key Entities *(include if feature involves data)*

- **Tool Query**: The inbound MCP request payload containing the client's natural-language `user_query`.
- **Use Case Match**: A ranked ADL server search result representing one candidate ADL, including at minimum the content needed for client output.
- **Tool Result Message**: The MCP text payload returned to the client, containing either ADL content or a no-result message.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of valid tool calls with at least one upstream match return the content of the highest-ranked match and no lower-ranked content.
- **SC-002**: In acceptance testing, 100% of valid tool calls with zero upstream matches return a successful no-result message rather than a tool error.
- **SC-003**: In acceptance testing, 100% of blank-input and simulated upstream-failure cases are surfaced to clients as errors that are distinguishable from no-result outcomes.
- **SC-004**: In a controlled environment with a healthy ADL server, at least 95% of successful tool calls complete within 2 seconds.
