# Data Model: get_adl_skill

## Entity: ToolQuery

**Purpose**: Represents the validated MCP input used to invoke `get_adl_skill`.

**Fields**:
- `userQuery`: string, required, must contain at least one non-whitespace character after trimming

**Validation Rules**:
- Reject if field is missing
- Reject if field is not a string
- Reject if trimmed value is blank

## Entity: AdlSearchRequest

**Purpose**: Represents the outbound GraphQL request body sent to the ADL server.

**Fields**:
- `query`: string, required GraphQL document for `searchByText`
- `variables.query`: string, required, sourced from `ToolQuery.userQuery`

**Relationships**:
- Created from one `ToolQuery`

## Entity: GraphQlEnvelope<T>

**Purpose**: Represents the top-level GraphQL HTTP response parsed by the ADL client layer.

**Fields**:
- `data`: optional payload object
- `errors`: optional list of GraphQL error objects

**Validation Rules**:
- If `errors` is present and non-empty, treat the response as failure
- If `data` is missing when no `errors` are present, treat the response as invalid

## Entity: UseCaseMatch

**Purpose**: Represents one ranked ADL search result returned by `searchByText`.

**Fields**:
- `useCaseId`: string, required for traceability but not returned to the MCP client in this feature
- `content`: string, required to produce a successful tool response
- `maxScore`: number, used only to preserve ranking semantics from the upstream contract
- `matchedExamples`: optional list for parsing completeness but not required for the MCP response

**Validation Rules**:
- The first match selected by ranking must have non-blank `content`
- Missing or blank `content` on the selected match invalidates the response

## Entity: AdlLookupOutcome

**Purpose**: Internal normalized result returned by the ADL client/service boundary before MCP formatting.

**States**:
- `matchFound(content)`
- `noMatch`
- `failure(reason)`

**State Transitions**:
- `ToolQuery` -> `failure(reason)` when validation fails
- `AdlSearchRequest` -> `failure(reason)` when configuration, transport, GraphQL, or payload validation fails
- `GraphQlEnvelope` -> `noMatch` when `searchByText` returns an empty list without GraphQL errors
- `GraphQlEnvelope` -> `matchFound(content)` when the top-ranked match has usable content

## Entity: ToolResultMessage

**Purpose**: Represents the MCP-visible response generated from `AdlLookupOutcome`.

**Fields**:
- `content[0].type`: constant `text` on successful responses
- `content[0].text`: ADL content or no-result message on successful responses

**Validation Rules**:
- Successful results contain exactly one text content item
- Failures return a tool error instead of a success payload