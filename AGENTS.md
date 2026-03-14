<!--
SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others

SPDX-License-Identifier: CC-BY-4.0
-->
# AGENTS.md

## Repo shape
- `settings.gradle.kts` includes only `adl-server` and `adl-mcp-server`; `adl-studio` and `demo-mcp-server` are separate toolchains.
- `adl-server` is the runtime center: one Ktor app exposes GraphQL (`/graphql`, `/graphiql`), OpenAI-compatible REST (`/v1/chat/completions`), SSE (`/events`), and static assets from `adl-server/src/main/resources/static` via `adl-server/src/main/kotlin/AdlServer.kt`.
- `startServer()` in `AdlServer.kt` wires repositories, agents, and routes manually; there is no DI container. Trace constructor arguments there before changing behavior.
- `adl-studio` is a static-export Next.js app. `src/components/providers.tsx` defaults GraphQL to `http://localhost:8080/graphql`; `src/lib/events.ts` hard-codes SSE to `http://localhost:8080/events`.
- `adl-mcp-server` is a separate Kotlin MCP server. `main()` defaults to stdio; SSE modes are `--sse-server-ktor <port>` and `--sse-server <port>` (`adl-mcp-server/src/main/kotlin/McpServer.kt`).
- `demo-mcp-server` is an independent Python example, not part of the Gradle multi-project build.

## Persistence and data flow
- ADL persistence is selected at runtime in `AdlServer.kt`: PostgreSQL if `DATABASE_URL` is set, else `ADL_FOLDER`, else local `adls/`, else in-memory.
- File-backed widgets and test cases share the same filesystem root by default: `WIDGET_FOLDER` and `TEST_CASE_FOLDER` override paths explicitly, otherwise they resolve to `<ADL_FOLDER>/widgets` and `<ADL_FOLDER>/test-cases` or `adls/widgets` and `adls/test-cases`.
- File-backed ADLs are Markdown with YAML front matter for `id`, `tags`, `examples`, `output`, and `version` (`FileSystemAdlRepository.kt`, `YamlFrontMatterProcessor.kt`).
- PostgreSQL updates are versioned: `PostgresAdlRepository.kt` copies the previous row into `adl_versions` before updating `adls`; schema lives in `adl-server/src/main/resources/db/migration/V1__create_adl_tables.sql`.
- Embeddings are currently wired to `InMemoryUseCaseEmbeddingsStore(BgeSmallEnV15QuantizedEmbeddingModel())`; Qdrant config exists in `EnvConfig.kt`, but the Qdrant store is not the active path in `AdlServer.kt`.
- On startup the server loads existing ADLs, re-indexes their `examples` into the embedding store, and hydrates tags. If search/tag behavior looks stale, inspect that bootstrapping path first.

## Local code conventions
- Preserve SPDX headers. Existing Kotlin, SQL, shell, and markdown files all carry them.
- Repository contracts live under `adl-server/src/main/kotlin/repositories`; concrete implementations belong under `repositories.impl` (see `adl-server/src/main/kotlin/repositories/AGENTS.md`).
- In `services`, avoid generic `*Service` names. Existing code prefers concrete nouns like `TestExecutor`, `ConversationEvaluator`, and `ClientEventPublisher` (`adl-server/src/main/kotlin/services/AGENTS.md`).
- GraphQL entry points are split into `inbound/query` and `inbound/mutation`; local guidance requires KDoc, an info log at operation start, and focused tests (`adl-server/src/main/kotlin/inbound/AGENTS.md`).
- ADL content examples in `adl-examples/` and `adl-server/src/main/resources/base_use_cases.md` show the expected DSL structure: `### UseCase`, section headers like `#### Solution`, and `----` separators.

## Developer workflows
- Main backend loop from repo root: `./gradlew :adl-server:run`.
- Backend verification: `./gradlew :adl-server:test`; `adl-server/test-all.sh` is the fuller Linux/macOS flow that builds, starts the server, and runs `adl-server/test-validation.sh` against live GraphQL.
- `adl-server/TESTING.md` contains ready-to-run GraphiQL and `curl` examples for the validation API; use those when debugging parser/validator changes.
- If a Studio change must ship inside the backend, run `./build-studio.sh`; it builds `adl-studio`, copies `adl-studio/out` into `adl-server/src/main/resources/static`, then builds the Docker image.
- `adl-studio` build output is static because `next.config.ts` sets `output: 'export'`. Also note that the same file ignores TypeScript and ESLint build errors, so run `npm run typecheck` and `npm run lint` explicitly.
- Root Gradle config assumes Java 24 and Kotlin compiler flag `-Xcontext-parameters`; do not remove or “simplify” those settings without checking both Kotlin subprojects.
