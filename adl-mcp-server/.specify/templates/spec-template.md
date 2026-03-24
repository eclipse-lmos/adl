# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## Intended Behavior *(mandatory)*

[Describe the behavior being added or changed in precise, implementation-guiding
language. State what the system will do, for whom, and under what conditions.]

## Scope & Assumptions *(mandatory)*

### In Scope

- [Describe the behavior, surfaces, and workflows included in this change]

### Out of Scope

- [Describe intentional exclusions that matter to planning or review]

### Assumptions

- [Document assumptions about clients, transports, data, operators, or upstream systems]

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Non-Functional Requirements *(include if applicable)*

- **NFR-001**: System MUST [performance, reliability, auditability, or operability expectation]
- **NFR-002**: System MUST [security, observability, or compatibility expectation]

## Inputs, Outputs & Interfaces *(mandatory)*

### Inputs

- **IN-001**: [Describe an input, trigger, parameter set, or inbound message]
- **IN-002**: [Describe validation expectations for the input]

### Outputs

- **OUT-001**: [Describe a response, side effect, emitted message, or persisted change]
- **OUT-002**: [Describe observable success or failure output]

### MCP Contract Details *(mandatory for MCP-facing features)*

- **Surface**: [Tool, prompt, resource, message, or transport-facing contract]
- **Request Schema**: [Structure, field names, types, and required vs optional fields]
- **Response Schema**: [Structure, field names, types, and success payload rules]
- **Validation Rules**: [Input validation, normalization, and rejection rules]
- **Error Handling**: [Error codes/messages, failure payload shape, and retry semantics]

## Failure Conditions *(mandatory)*

- **FC-001**: If [invalid input or precondition failure], the system MUST [expected behavior]
- **FC-002**: If [dependency, transport, or runtime failure], the system MUST [expected behavior]
- **FC-003**: If no special failure behavior exists beyond validation, the specification MUST state that explicitly

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]
