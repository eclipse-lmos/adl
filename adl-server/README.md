<!--
SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others

SPDX-License-Identifier: CC-BY-4.0
-->
# ADL Server

The **ADL Server** is a Ktor-based microservice that provides a GraphQL API for compiling and formatting ADL (Assistant Description Language) code. It is designed to be used as part of the ARC AI framework, enabling dynamic parsing and transformation of use case definitions written in ADL.

## Features

- **GraphQL API**: Exposes mutations for compiling and validating ADL code.
- **Validation**: Validates ADL files and returns syntax errors, used tools, and references.
- **Kotlin & Ktor**: Built with modern Kotlin and Ktor 2.x for high performance and easy extensibility.
- **ARC Integration**: Leverages ARC's use case parsing and formatting utilities.
- **Extensible**: Can be extended with additional GraphQL queries, mutations, or custom logic.

## Usage

### Configuration

The server can be configured using the following environment variables:

| Variable | Description | Default Value |
| --- | --- | --- |
| `ADL_SERVER_PORT` | The port on which the server should listen for incoming connections. | `8080` |
| `ADL_DEV_MODE` | Indicates whether the server is running in development mode. | `false` |
| `QDRANT_HOST` | Qdrant vector database host. | `localhost` |
| `QDRANT_PORT` | Qdrant vector database port. | `6334` |
| `QDRANT_COLLECTION_NAME` | Qdrant collection name for UseCase embeddings. | `usecase_embeddings` |
| `ADL_FOLDER` | Optional shared root for file-based ADL storage; widgets and test cases default to subfolders below it. | unset |
| `WIDGET_FOLDER` | Optional override for file-based widget storage. Defaults to `<ADL_FOLDER>/widgets` or `adls/widgets` when file storage is enabled. | unset |
| `TEST_CASE_FOLDER` | Optional override for file-based test case storage. Defaults to `<ADL_FOLDER>/test-cases` or `adls/test-cases` when file storage is enabled. | unset |
| `TEST_RUN_FOLDER` | Optional override for file-based persisted test run storage. Defaults to `<ADL_FOLDER>/test-runs` or `adls/test-runs` when file storage is enabled. | unset |
| `DATABASE_URL` | Optional PostgreSQL JDBC connection string. Enables Flyway migrations and persistent organization metadata. | unset |
| `DATABASE_USER` | PostgreSQL username used with `DATABASE_URL`. | `postgres` |
| `DATABASE_PASSWORD` | PostgreSQL password used with `DATABASE_URL`. | `postgres` |

### Start the Server

```sh
./gradlew :adl-server:run
```

By default, the server listens on port `8080`. You can override the port by setting the environment variable `ADL_SERVER_PORT`.

### Docker

You can also run the server using Docker.

#### Build the Docker Image

Run the following command from the root of the repository:

```sh
docker build -f adl-server/Dockerfile -t adl-server .
```

#### Run via GitHub Container Registry

To pull and run the latest image from the GitHub Container Registry:

1.  **Login to GitHub Container Registry** (if required):
    Follow the instructions here: [Working with the Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

2.  **Run the container**:

    ```bash
    docker run -p 8080:8080 \
      -e ARC_AI_KEY=[OPENAI_API_KEY] \
      -e ARC_MODEL=gpt-4o \
      -e ARC_CLIENT=openai \
      ghcr.io/eclipse-lmos/adl-server:latest
    ```

### GraphQL Endpoint

The main endpoint is available at:

```
POST http://localhost:8080/graphql
```

You can explore the API using GraphiQL at:
`http://localhost:8080/graphiql` (when running in dev mode or if enabled)

### Organization owner access

Owner-scoped data is resolved from request headers:

| Header | Purpose |
| --- | --- |
| `X-Organization-Id` | Explicitly selects the target organization/owner. Use `public` for backwards-compatible public mode. |
| `X-Api-Key` | Organization API key. Required when `X-Organization-Id` targets a non-public organization. |
| `X-Organization-Api-Key` | Legacy alias for `X-Api-Key`. |

If no organization is selected, the server keeps using the default owner `public` for local development. If `X-Organization-Id` targets a non-public organization and no valid key is supplied, GraphQL returns an authorization error and REST/SSE return `401` or `403`.

#### Organization bootstrap and management

Organization management is intentionally limited to public administration mode. The following operations are available on the GraphQL endpoint:

```graphql
query {
  organizations {
    id
    name
    descriptions
    apiKeys {
      id
      label
      maskedKey
      createdAt
      revoked
    }
  }
}

mutation {
  createOrganization(
    id: "telekom-demo"
    name: "Telekom Demo Org"
    descriptions: "Internal sandbox organisation for support flows."
    initialApiKeyLabel: "studio"
  ) {
    createdApiKey
    organization {
      id
      name
      descriptions
    }
  }
}

mutation {
  createOrganizationApiKey(organizationId: "telekom-demo", label: "ci") {
    createdApiKey
    organization {
      id
      apiKeys {
        id
        label
        maskedKey
        revoked
      }
    }
  }
}

mutation {
  revokeOrganizationApiKey(organizationId: "telekom-demo", apiKeyId: "key-1") {
    id
    apiKeys {
      id
      label
      revoked
    }
  }
}
```

#### GraphQL example with organization headers

```bash
curl -X POST http://localhost:8080/graphql \
  -H 'Content-Type: application/json' \
  -H 'X-Organization-Id: telekom-demo' \
  -H 'X-Api-Key: adl_org_live_abc123' \
  --data '{"query":"query { widgets { id name owner } }"}'
```

#### SSE example with organization headers

```bash
curl -N http://localhost:8080/events \
  -H 'Accept: text/event-stream' \
  -H 'X-Organization-Id: telekom-demo' \
  -H 'X-Api-Key: adl_org_live_abc123'
```

#### OpenAI-compatible REST example with organization headers

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'X-Organization-Id: telekom-demo' \
  -H 'X-Api-Key: adl_org_live_abc123' \
  --data '{
    "model": "assistant",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

### Persisted test run history

`executeTests` now persists every run and returns the stored run including metadata such as `id`, `owner`, `createdAt`, the requested single test case, and detailed result snapshots.

#### Execute and persist a full test suite

```graphql
mutation {
  executeTests(adlId: "password_reset") {
    id
    adlId
    owner
    createdAt
    requestedTestCaseId
    overallScore
    results {
      testCaseId
      testCaseName
      status
      score
      executedVariantIndex
      failureReason
      executedConversation {
        role
        content
      }
      actualConversation {
        role
        content
      }
      testCase {
        id
        name
        description
        contract
      }
    }
  }
}
```

#### List persisted test runs for an ADL

```graphql
query {
  testRuns(adlId: "password_reset", limit: 20) {
    id
    createdAt
    requestedTestCaseId
    overallScore
    results {
      testCaseId
      testCaseName
      status
      score
    }
  }
}
```

#### Load one persisted test run

```graphql
query {
  testRun(id: "testrun-123") {
    id
    adlId
    owner
    createdAt
    overallScore
    results {
      testCaseId
      testCaseName
      details {
        verdict
        reasons
      }
    }
  }
}
```

#### Delete one persisted test run

```graphql
mutation {
  deleteTestRun(id: "testrun-123")
}
```

#### 1. Core ADL Operations

**Compile ADL (`compile`)**
Compiles ADL code into a structured format.

```graphql
mutation{
  compile(
    conditionals: ["isMonday"]
    adl: """
    ### UseCase: password_forgotten
    #### Description
    The user has forgotten their password.

    #### Solution
    Kindly ask the customer to reset their computer.

    <isMonday> Talk to Bob.

    ```kotlin
    "The current time is: ${time()}"
    ```

    ----

    """){
     compiledOutput
  }
}
```

**Validate ADL (`validate`)**
Checks ADL code for syntax errors, missing references, and extracts used tools.

```graphql
mutation{
  validate(
    adl: """
    ### UseCase: password_forgotten
    #### Description
    The user has forgotten their password.

    #### Solution 
    Call @reset_password() and go to use case #user_verification.
    
    ----
    """
  ) {
    syntaxErrors {
      line
      message
    }
    usedTools
    references
  }
}
```

#### 2. Use Case Management (Knowledge Base)

These operations require Qdrant to be running.

**Store Use Case (`store`)**
Embeds and stores a use case in the vector database.

```graphql
mutation {
  store(adl: """
    ### UseCase: password_forgotten
    # ...
  """) {
    storedExamplesCount
    message
  }
}
```

**Delete Use Case (`delete`)**
Removes a use case from the database.

```graphql
mutation {
  delete(useCaseId: "password_forgotten") {
    useCaseId
    message
  }
}
```

**Search Use Cases (`search`, `searchByText`)**

```graphql
# Find by text description
query {
    searchByText(query: "forgot pass") {
        useCaseId
        score
    }
}

# Find by conversation context (semantic search)
query {
    search(conversation: [
        { role: "user", content: "I forgot my password" }
    ]) {
        useCaseId
        score
    }
}
```

#### 3. Assistant & Simulation

Interact with the ADL assistant capabilities directly.

**Chat with Assistant (`assistant`)**
Send a message to the assistant, providing the ADL context dynamically.

```graphql
mutation {
  assistant(
    input: {
       useCases: """
         ### UseCase: hello
         #### Solution
         Say hello back.
         ----
       """
       request: {
          messages: [{role: "user", content: "Hello"}]
          userContext: { userId: "user-1" }
          conversationContext: { conversationId: "conv-1" }
       }
    }
  ) {
    messages { role content }
    toolCalls { name arguments }
    responseTime
  }
}
```

**Generate System Prompt (`systemPrompt`)**
Get the raw system prompt that would be sent to the LLM.

```graphql
mutation {
  systemPrompt(
    adl: "...",
    conditionals: ["isVip"],
    sessionId: "session-1"
  ) {
    systemPrompt
    useCaseCount
  }
}
```

#### 4. Development & Testing Tools

**Generate Test Cases (`createTests`)**
Create synthetic test conversations from a use case description.

```graphql
mutation {
  createTests(useCase: "The user needs to verify their email address...") {
    title
    description
    expectedConversation { role content }
  }
}
```

**Evaluate Conversation (`eval`)**
Check if a conversation follows the use case rules.

```graphql
mutation {
  eval(input: {
    useCase: """
      ### UseCase: verify_email
      #### Solution
      Ask for email.
      ----
    """
    conversation: "User: verify me. Assistant: OK."
  }) {
    verdict
    score
    reasons
    violations
  }
}
```

**Generate Examples (`examples`)**
Generate example user utterances for a use case description.

```graphql
query {
  examples(description: "password forgotten") {
    useCaseDescription
    examples
  }
}
```

### Database

The ADL Server requires a Qdrant vector database to store and search for UseCase embeddings. You can start a Qdrant instance using Docker:

```sh
docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage:z qdrant/qdrant
```


## Testing

### Quick Test (One Command)

**From project root (Windows):**
```powershell
.\test-adl-validation.ps1
```

**From adl-server directory (Windows):**
```powershell
cd adl-server
.\quick-test.ps1
```

**From adl-server directory (Linux/Mac):**
```bash
cd adl-server
chmod +x test-all.sh
./test-all.sh
```

**Note:** If you encounter JVM target compatibility issues, use the quick test:
```powershell
cd adl-server
.\quick-test.ps1
```

This will:
1. Run unit tests
2. Build the application
3. Start the server
4. Run integration tests
5. Stop the server

### Unit Tests Only
```bash
./gradlew :adl-server:test
```

### Manual Testing

See [TESTING.md](TESTING.md) for detailed testing instructions including:
- GraphiQL interface
- cURL examples
- Test scripts

## Development

- Source code is located in `src/main/kotlin`.
- Test code is located in `src/test/kotlin`.
- Main entry point: `org.eclipse.lmos.adl.server.main`
- GraphQL mutations: `AdlCompilerMutation`, `AdlValidationMutation`
