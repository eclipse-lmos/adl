---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include test tasks when requested by the feature specification. For MCP-facing changes, include contract or validation tasks whenever needed to verify the specified request/response behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Application code**: `src/main/kotlin/` and `src/main/resources/`
- **Tests**: `src/test/java/` and `src/test/resources/`
- **Feature artifacts**: `specs/[###-feature-name]/`
- Paths shown below assume this Kotlin MCP server layout - adjust only if plan.md documents a different structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Validate that spec.md, plan.md, and required contracts are present and aligned for this feature
- [ ] T002 Update Gradle configuration or dependencies in build.gradle.kts if the feature requires them
- [ ] T003 [P] Scaffold feature packages and resources in src/main/kotlin/ and src/main/resources/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 [P] Add shared contract or model types used across stories in src/main/kotlin/
- [ ] T005 [P] Establish validation and error translation behavior required by the spec
- [ ] T006 Configure transport-facing integration points if the feature affects stdio, SSE, or other MCP surfaces
- [ ] T007 Create shared service or session components all stories depend on
- [ ] T008 Configure logging, diagnostics, or observability required by the specification
- [ ] T009 Capture shared test fixtures or protocol samples in src/test/resources/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Contract or schema validation for [MCP surface] in specs/[###-feature-name]/contracts/[name].md or src/test/resources/[name].json
- [ ] T011 [P] [US1] Integration test for [user journey] in src/test/java/[path]/[Name]Test.java

### Implementation for User Story 1

- [ ] T012 [P] [US1] Add data or contract types in src/main/kotlin/[path]/[Type].kt
- [ ] T013 [P] [US1] Add supporting prompt, template, or resource content in src/main/resources/[path]
- [ ] T014 [US1] Implement [Service or Handler] in src/main/kotlin/[path]/[Name].kt (depends on T012, T013)
- [ ] T015 [US1] Implement the user-facing MCP behavior in src/main/kotlin/[path]/[Name].kt
- [ ] T016 [US1] Add validation and error handling required by the specification
- [ ] T017 [US1] Add logging or diagnostics for user story 1 behavior if specified

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T018 [P] [US2] Contract or schema validation for [MCP surface] in specs/[###-feature-name]/contracts/[name].md or src/test/resources/[name].json
- [ ] T019 [P] [US2] Integration test for [user journey] in src/test/java/[path]/[Name]Test.java

### Implementation for User Story 2

- [ ] T020 [P] [US2] Add data or contract types in src/main/kotlin/[path]/[Type].kt
- [ ] T021 [US2] Implement [Service or Handler] in src/main/kotlin/[path]/[Name].kt
- [ ] T022 [US2] Implement the user-facing MCP behavior in src/main/kotlin/[path]/[Name].kt
- [ ] T023 [US2] Integrate with shared components from earlier phases if needed

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T024 [P] [US3] Contract or schema validation for [MCP surface] in specs/[###-feature-name]/contracts/[name].md or src/test/resources/[name].json
- [ ] T025 [P] [US3] Integration test for [user journey] in src/test/java/[path]/[Name]Test.java

### Implementation for User Story 3

- [ ] T026 [P] [US3] Add data or contract types in src/main/kotlin/[path]/[Type].kt
- [ ] T027 [US3] Implement [Service or Handler] in src/main/kotlin/[path]/[Name].kt
- [ ] T028 [US3] Implement the user-facing MCP behavior in src/main/kotlin/[path]/[Name].kt

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/ and specs/[###-feature-name]/
- [ ] TXXX Reconcile implementation with spec wording and contract artifacts
- [ ] TXXX Performance or reliability hardening across affected stories
- [ ] TXXX [P] Additional unit or integration tests in src/test/java/ if requested
- [ ] TXXX Security and validation hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Contract and validation tasks MUST be completed before implementation for MCP-facing changes
- Tests (if included) MUST be written and FAIL before implementation
- Types before services or handlers
- Services or handlers before transport exposure
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract validation for [MCP surface] in specs/[###-feature-name]/contracts/[name].md"
Task: "Integration test for [user journey] in src/test/java/[path]/[Name]Test.java"

# Launch all types for User Story 1 together:
Task: "Add [Type1] in src/main/kotlin/[path]/[Type1].kt"
Task: "Add [Type2] in src/main/kotlin/[path]/[Type2].kt"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Include MCP contract validation tasks whenever the feature changes externally visible protocol behavior
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
