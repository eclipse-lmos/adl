<!--
Sync Impact Report
Version change: 1.0.0 -> 1.1.0
Modified principles:
- Template principle slot 1 -> I. Spec-First Change Control
- Template principle slot 2 -> II. Explicit, Actionable Specifications
- Template principle slot 3 -> III. MCP Contract Precision
- Template principle slot 4 -> IV. Incremental Adoption With Mandatory Coverage
- Template principle slot 5 -> V. Specification-Guided Verification
Added sections:
- Operational Constraints
- Development Workflow
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .github/agents/speckit.specify.agent.md
- ✅ .github/agents/speckit.plan.agent.md
- ✅ .github/agents/speckit.tasks.agent.md
- ✅ docs/speckit.constitution
Follow-up TODOs:
- None
-->

# ADL MCP Server Constitution

## Core Principles

### I. Spec-First Change Control
All new features, behavior changes, and externally visible contract changes MUST
begin with a valid specification before implementation begins. Approved
specifications are the authoritative source of truth for intended behavior during
planning, implementation, review, and merge. When implementation and
specification conflict, the implementation is incorrect until the specification is
intentionally amended.

Rationale: This repository exposes MCP-facing behavior where undocumented changes
create avoidable integration risk for clients and reviewers.

### II. Explicit, Actionable Specifications
Specifications MUST be written by developers and MUST define intended behavior,
scope, assumptions, inputs, outputs, and failure conditions in concrete,
actionable language. A specification is not valid if it leaves material behavior
ambiguous, relies on unresolved placeholders, or omits information required to
plan and implement the change. Iterative refinement is allowed only after the
initial specification is structurally complete enough to guide implementation.

Rationale: The project needs specs that can drive real engineering work rather
than high-level intent that still requires reinterpretation during coding.

### III. MCP Contract Precision
Any specification that introduces or changes an MCP-facing capability MUST define
the affected contract explicitly. For each affected tool, prompt, resource, or
message surface, the specification MUST document the request schema, response
schema, required fields, optional fields, validation rules, and error handling
behavior. Message formats and contract semantics MUST be explicit enough to
prevent incompatible client or server assumptions.

Rationale: MCP integrations fail at boundaries. Precise contract definitions keep
tool behavior predictable across clients and transports.

### IV. Incremental Adoption With Mandatory Coverage
This constitution applies prospectively to all new work and to any behavior or
contract change made in the existing codebase. Legacy code may remain unspecced
until it is changed, but once a change affects existing behavior or an external
contract, the changed scope MUST be covered by a valid specification before
merge. Pull requests missing a required specification, or carrying an incomplete
or invalid specification, MUST be blocked.

Rationale: The repository is adopting spec-first governance after code already
exists, so coverage must expand pragmatically without allowing new unspecced
changes.

### V. Specification-Guided Verification
Specifications MUST guide verification, review, and task decomposition. Plans and
tasks MUST show how the specified behavior, validation rules, and failure
handling will be checked, including contract or schema validation for MCP-facing
changes when relevant. Strict one-to-one mapping between every acceptance
criterion and a test is not required, but reviewers MUST be able to trace how
the implementation validates the approved behavior.

Rationale: Moderate enforcement works only when specs actively shape review and
verification rather than existing as passive documentation.

## Operational Constraints

- The system is a Kotlin-based MCP server, and specifications MUST preserve
  predictable externally visible behavior across the relevant transport surface,
  including stdio and SSE when a change affects them.
- Specifications MUST bound scope explicitly, including out-of-scope items when
  the boundary matters to design, review, or merge approval.
- MCP-facing specifications MUST identify whether the change affects tools,
  prompts, resources, message payloads, transport expectations, validation
  behavior, or error semantics.
- Structural completeness is required before implementation starts; refinement is
  allowed afterward only if the initial spec remains sufficient to guide work.

## Development Workflow

1. Developers MUST create or update `spec.md` before implementation begins for
   any covered change.
2. `plan.md` MUST fail the Constitution Check when required sections are missing,
   especially scope, assumptions, inputs, outputs, failure conditions, or MCP
   contract details for affected protocol surfaces.
3. `tasks.md` MUST include the work needed to implement and verify the specified
   behavior, including MCP contract and validation tasks when applicable.
4. Pull request review MUST verify continued alignment between specification,
   plan, tasks, and implementation. If behavior changes during implementation,
   the specification MUST be amended intentionally before merge.

## Governance

This constitution supersedes conflicting local guidance for specification,
planning, and implementation workflow in this repository. Amendments MUST be
made through an explicit constitution update that records the rationale, the
semantic version impact, and the required synchronization of templates and agent
guidance. Governance versioning follows semantic versioning: MAJOR for
incompatible principle changes or removals, MINOR for new principles or
materially expanded governance, and PATCH for clarifications or wording-only
changes. Compliance review is required during planning and pull request review;
violations MUST be corrected or explicitly justified in the tracked artifacts
before merge.

**Version**: 1.1.0 | **Ratified**: 2026-03-20 | **Last Amended**: 2026-03-24