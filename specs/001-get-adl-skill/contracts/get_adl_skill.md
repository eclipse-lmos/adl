# MCP Contract: get_adl_skill

## Surface

- MCP tool name: `get_adl_skill`
- Provided by: `adl-mcp-server`
- Upstream dependency: ADL server GraphQL endpoint using `searchByText`

## Request Contract

### Schema

```json
{
  "user_query": "How to implement auth?"
}
```

### Required Fields

- `user_query`: string

### Optional Fields

- None

### Validation Rules

- `user_query` must be present
- `user_query` must be a string
- `user_query` must not be blank after trimming
- Endpoint override fields are not supported and must not be part of the contract

## Success Response Contract

### Match Found

```json
{
  "content": [
    {
      "type": "text",
      "text": "# Authentication ADL\n\nTo implement authentication..."
    }
  ]
}
```

### No Match Found

```json
{
  "content": [
    {
      "type": "text",
      "text": "No relevant ADL found for query: How to implement auth?"
    }
  ]
}
```

### Success Rules

- Success responses contain exactly one text content item
- When matches exist, the returned text is the top-ranked match `content`
- When zero matches exist, the returned text is a no-result message

## Failure Contract

### Failure Categories

- Validation failure
- Missing or invalid runtime endpoint configuration
- Upstream connection failure
- Upstream timeout
- GraphQL `errors` present in the response envelope
- Malformed or incomplete upstream payload
- Top-ranked match missing usable `content`

### Failure Semantics

- Failures return a tool error instead of a success payload
- Tool errors must identify the failure as validation- or dependency-oriented
- Tool errors must not expose stack traces, credentials, or internal connection secrets
- Partial GraphQL `data` must never be used when `errors` are present

## Upstream GraphQL Request Shape

### Query Document

```graphql
query SearchByText($query: String!) {
  searchByText(query: $query) {
    useCaseId
    content
    maxScore
  }
}
```

### Expected Response Shape

```json
{
  "data": {
    "searchByText": [
      {
        "useCaseId": "auth-001",
        "content": "# Authentication ADL\n\nTo implement authentication...",
        "maxScore": 0.91
      }
    ]
  },
  "errors": []
}
```

### Upstream Handling Rules

- If `errors` is present and non-empty, fail the tool call
- If `searchByText` is empty, return the no-result success response
- If the first returned item lacks usable `content`, fail the tool call