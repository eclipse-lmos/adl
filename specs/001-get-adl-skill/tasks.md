# Tasks: Add get_adl_skill Tool

**Input**: Design documents from `/specs/001-get-adl-skill/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include unit, integration, and contract-validation tasks because the specification explicitly requires tool-logic tests, integration coverage, and MCP-facing validation behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the module for outbound GraphQL calls and feature-specific test assets.

- [ ] T001 Validate alignment between `specs/001-get-adl-skill/spec.md`, `specs/001-get-adl-skill/plan.md`, `specs/001-get-adl-skill/research.md`, and `specs/001-get-adl-skill/contracts/get_adl_skill.md`
- [ ] T002 Update outbound client and test dependencies in `adl-mcp-server/build.gradle.kts`
- [ ] T003 [P] Scaffold `adl-mcp-server/src/main/kotlin/tools/adlskill/`, `adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/`, and `adl-mcp-server/src/test/resources/get_adl_skill/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared validation, configuration, GraphQL models, and reusable client/service components.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 [P] Add strict call-tool argument validation helpers in `adl-mcp-server/src/main/kotlin/Util.kt`
- [ ] T005 [P] Add runtime endpoint and timeout configuration in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlServerConfig.kt`
- [ ] T006 [P] Add GraphQL request and response DTOs in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlSearchModels.kt`
- [ ] T007 Add the shared outbound GraphQL client in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlGraphQlClient.kt`
- [ ] T008 Add the shared lookup outcome and result-mapping service in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlLookupService.kt`
- [ ] T009 [P] Add shared GraphQL fixtures in `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-success.json`, `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-empty.json`, `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-errors.json`, and `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-malformed.json`

**Checkpoint**: Foundation ready. User stories can now be implemented and tested independently.

---

## Phase 3: User Story 1 - Retrieve the Best Matching ADL (Priority: P1) 🎯 MVP

**Goal**: Return the highest-ranked ADL content for a valid `get_adl_skill` request.

**Independent Test**: Invoke `get_adl_skill` with a valid query against a mocked ADL response containing multiple matches and verify that the tool returns exactly one text content block with the top-ranked match content.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add top-match contract validation fixtures in `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-success.json`
- [ ] T011 [P] [US1] Add successful lookup integration coverage in `adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillSuccessIntegrationTest.kt`
- [ ] T012 [P] [US1] Add successful result-mapping unit coverage in `adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillSuccessTest.kt`

### Implementation for User Story 1

- [ ] T013 [P] [US1] Add the MCP tool definition and request parsing in `adl-mcp-server/src/main/kotlin/tools/adlskill/GetAdlSkillTool.kt`
- [ ] T014 [US1] Implement the top-match lookup flow in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlLookupService.kt`
- [ ] T015 [US1] Register `get_adl_skill` in `adl-mcp-server/src/main/kotlin/McpServer.kt`
- [ ] T016 [US1] Format top-match MCP text responses in `adl-mcp-server/src/main/kotlin/tools/adlskill/GetAdlSkillTool.kt`

**Checkpoint**: User Story 1 should return the most relevant ADL content end-to-end and be testable on its own.

---

## Phase 4: User Story 2 - Handle No-Match Searches Gracefully (Priority: P2)

**Goal**: Return a successful no-result message when the ADL server finds no matching ADLs.

**Independent Test**: Invoke `get_adl_skill` with a valid query against a mocked ADL response containing zero matches and verify that the tool succeeds with the expected no-result text message.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add no-match contract fixtures in `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-empty.json`
- [ ] T018 [P] [US2] Add no-match unit and integration coverage in `adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillNoMatchTest.kt`

### Implementation for User Story 2

- [ ] T019 [US2] Implement empty-result handling in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlLookupService.kt`
- [ ] T020 [US2] Format the no-result MCP message in `adl-mcp-server/src/main/kotlin/tools/adlskill/GetAdlSkillTool.kt`

**Checkpoint**: User Story 2 should convert an empty `searchByText` result into a successful, user-readable no-result response without depending on later stories.

---

## Phase 5: User Story 3 - Surface Upstream Failures Clearly (Priority: P3)

**Goal**: Reject invalid input and surface configuration, timeout, GraphQL, and malformed-payload failures as tool errors.

**Independent Test**: Invoke `get_adl_skill` with blank input, missing configuration, GraphQL `errors`, malformed payloads, and timeout/unreachable endpoint responses and verify that each case fails with a dependency- or validation-oriented tool error rather than success content.

### Tests for User Story 3

- [ ] T021 [P] [US3] Add GraphQL-error and malformed-payload fixtures in `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-errors.json` and `adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-malformed.json`
- [ ] T022 [P] [US3] Add validation and upstream failure unit coverage in `adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillFailureTest.kt`
- [ ] T023 [P] [US3] Add timeout and unreachable-endpoint integration coverage in `adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillDependencyFailureIntegrationTest.kt`

### Implementation for User Story 3

- [ ] T024 [US3] Implement GraphQL envelope error detection and malformed-payload rejection in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlGraphQlClient.kt`
- [ ] T025 [US3] Implement blank-input and missing-endpoint validation errors in `adl-mcp-server/src/main/kotlin/tools/adlskill/GetAdlSkillTool.kt` and `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlServerConfig.kt`
- [ ] T026 [US3] Implement timeout and dependency error translation in `adl-mcp-server/src/main/kotlin/tools/adlskill/AdlLookupService.kt`

**Checkpoint**: All specified failure conditions should now be enforced and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile artifacts, run end-to-end verification, and close the feature cleanly.

- [ ] T027 [P] Reconcile implementation details with `specs/001-get-adl-skill/contracts/get_adl_skill.md` and `specs/001-get-adl-skill/quickstart.md`
- [ ] T028 Add MCP server startup regression coverage in `adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/McpServerStartupTest.kt`
- [ ] T029 Run feature verification against `adl-mcp-server/build.gradle.kts` targets and record validation notes in `specs/001-get-adl-skill/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user story work.
- **User Stories (Phases 3-5)**: Depend on Foundational completion.
- **Polish (Phase 6)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2. No dependency on User Stories 2 or 3.
- **User Story 2 (P2)**: Starts after Phase 2. Reuses shared service code but is independently testable once its own no-match behavior is implemented.
- **User Story 3 (P3)**: Starts after Phase 2. Reuses shared client/service code but is independently testable via failure scenarios.

### Within Each User Story

- Contract and test tasks come before implementation tasks.
- Validation and mapping tasks must be in place before MCP registration changes are considered complete.
- Shared files touched by multiple stories should be merged in priority order even though the stories remain independently testable.

### Parallel Opportunities

- `T003`, `T004`, `T005`, `T006`, and `T009` can run in parallel after `T002`.
- In User Story 1, `T010`, `T011`, `T012`, and `T013` can run in parallel.
- In User Story 2, `T017` and `T018` can run in parallel.
- In User Story 3, `T021`, `T022`, and `T023` can run in parallel.
- `T027` and `T028` can run in parallel after all story phases are complete.

---

## Parallel Example: User Story 1

```bash
# Launch User Story 1 test tasks together:
Task: "Add top-match contract validation fixtures in adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-success.json"
Task: "Add successful lookup integration coverage in adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillSuccessIntegrationTest.kt"
Task: "Add successful result-mapping unit coverage in adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillSuccessTest.kt"

# Launch independent User Story 1 implementation tasks together:
Task: "Add the MCP tool definition and request parsing in adl-mcp-server/src/main/kotlin/tools/adlskill/GetAdlSkillTool.kt"
Task: "Register get_adl_skill in adl-mcp-server/src/main/kotlin/McpServer.kt"
```

---

## Parallel Example: User Story 2

```bash
# Launch User Story 2 preparation together:
Task: "Add no-match contract fixtures in adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-empty.json"
Task: "Add no-match unit and integration coverage in adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillNoMatchTest.kt"
```

---

## Parallel Example: User Story 3

```bash
# Launch User Story 3 failure-path tests together:
Task: "Add GraphQL-error and malformed-payload fixtures in adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-errors.json and adl-mcp-server/src/test/resources/get_adl_skill/search-by-text-malformed.json"
Task: "Add validation and upstream failure unit coverage in adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillFailureTest.kt"
Task: "Add timeout and unreachable-endpoint integration coverage in adl-mcp-server/src/test/java/org/eclipse/lmos/adl/mcp/tools/adlskill/GetAdlSkillDependencyFailureIntegrationTest.kt"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the success path independently before moving on.

### Incremental Delivery

1. Deliver User Story 1 to establish the core lookup flow.
2. Add User Story 2 to improve user-facing no-result behavior without changing the success contract.
3. Add User Story 3 to complete validation and operational hardening.
4. Finish with the polish phase and full verification.

### Parallel Team Strategy

1. One developer updates dependencies and scaffolding while another prepares fixtures and validation helpers.
2. After Phase 2, User Story 1 should lead because it creates the main tool flow.
3. User Stories 2 and 3 can proceed in parallel once the shared client and service boundary are stable.

---

## Notes

- All tasks follow the required checklist format with exact file paths.
- Tests are included because the specification explicitly requires unit and integration coverage.
- Contract and validation tasks are front-loaded for each user story because the feature changes an MCP-facing contract.
- User stories remain independently testable even though they share a common tool/client code path.