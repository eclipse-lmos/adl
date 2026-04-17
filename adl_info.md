Below is a contract-style specification an LLM can follow when consuming **Eclipse LMOS ADL Skills**. It is derived from the official ADL documentation and the technical details pages. ADL defines agent behavior in structured Markdown, separates behavior definition from the final prompt sent to the model, supports features such as steps, conditionals, tool calls, output schemas, memory, and mandatory `MUST` rules, and can be compiled by an ADL engine into prompt/runtime artifacts. ([eclipse.dev][1])

# ADL Skill Processing Contract for an LLM

## 1. Purpose

This contract defines how the LLM shall interpret and execute an ADL Skill. An ADL Skill is a structured Markdown specification that describes how an agent should behave for a scenario, rather than a free-form prompt. The LLM shall treat the ADL Skill as authoritative behavioral logic, not as informal guidance. ([eclipse.dev][1])

## 2. Canonical Unit of Interpretation

The LLM shall process each ADL Skill as a discrete behavioral unit representing one scenario or use case. Each skill defines how the agent should respond to a specific class of requests. The LLM shall prefer the skill’s declared structure over ad hoc completion behavior. ([eclipse.dev][2])

## 3. Skill Structure

The LLM shall recognize the following sections when present:

* **Name / Skill identifier**: unique identifier, typically lowercase with underscores.
* **Description**: the scenario the skill addresses.
* **Goal**: optional business objective.
* **Examples**: optional trigger examples.
* **Trigger**: optional automated or event-based activation.
* **Context**: optional static and injected runtime context.
* **Steps**: ordered instructions to be executed one at a time.
* **Solution**: primary behavior.
* **Alternative Solution**: optional secondary behavior after the primary path.
* **Fallback / Fallback Solution**: optional recovery behavior when prior attempts fail.
* **Output**: optional JSON Schema describing required structured output. ([eclipse.dev][2])

## 4. Interpretation Order

The LLM shall interpret an ADL Skill in the following precedence order:

1. Trigger and applicability
2. Active conditionals
3. Context and injected variables
4. Steps
5. Solution
6. Alternative Solution, when applicable
7. Fallback Solution, when applicable
8. Output constraints
9. Mandatory `MUST` directives

Where a conflict exists, explicit ADL directives shall override generic language-model preference. `MUST` directives have the highest execution priority among content instructions. ([eclipse.dev][2])

## 5. Triggering Rules

If a skill defines **Examples**, the LLM may use them as positive matching guidance. If a skill defines a **Trigger**, the LLM shall honor it. Trigger values may include scheduled execution such as cron expressions or startup events such as `CONVERSATION_START`. When `CONVERSATION_START` is configured, that skill shall execute at conversation start and take precedence over ordinary user-triggered matching. ([eclipse.dev][2])

## 6. Context Handling

The LLM shall treat the **Context** section as authoritative supporting information for the current skill. Context may contain static guidance and memory values injected by the ADL engine. The LLM shall use this context during execution but shall not invent additional context not supplied by the skill, runtime, or user. ([eclipse.dev][2])

## 7. Stepwise Execution

If a skill contains **Steps**, the LLM shall execute them incrementally rather than collapsing them into a single monolithic answer. The LLM shall ask or act one step at a time when the skill is designed as a staged conversation. It shall skip steps that do not apply. ([eclipse.dev][2])

## 8. Solution Semantics

The **Solution** section is the primary execution path. The LLM shall use it as the default behavior after evaluating conditions, context, and prior step state. The LLM shall not replace the solution with a more “helpful” alternative unless the skill explicitly provides one. ([eclipse.dev][1])

## 9. Alternative and Fallback Behavior

If the skill provides an **Alternative Solution**, the LLM may use it only after the primary solution has been used and is no longer sufficient. If the skill provides a **Fallback Solution**, the LLM shall use it when repeated failure or a configured retry threshold indicates the main path is not resolving the issue. The purpose of fallback is to prevent repetitive loops and allow recovery. ([eclipse.dev][1])

## 10. Skill Limits

If a skill name includes a repetition limit such as `Skill: reset_password (1)`, the LLM shall respect that limit as the maximum number of times the skill may run in one conversation. After the limit is reached, the LLM shall execute the fallback behavior if defined; otherwise it shall stop reusing that skill and allow a different skill to handle the conversation. ([eclipse.dev][2])

## 11. Conditionals

The LLM shall evaluate inline or multiline conditionals before execution. Supported documented forms include:

* `<c1, c2>` for logical AND
* `<c1 or c2>` for logical OR
* `<!condition>` for negation
* `<else>` for the fallback branch
* `<is_weekend>` for weekend-aware behavior
* `<date>` for date-specific matching
* `<step_n>` for turn-specific logic

Any line or block guarded by a conditional shall be included only if its condition evaluates true. The `<else>` branch shall apply only when no prior conditional branch applies. ([eclipse.dev][2])

## 12. Variables

The LLM shall resolve Mustache-style variables such as `{{user.name}}` using runtime-provided values before producing the final answer. Variables may reference profile, memory, or other context data. If a variable is missing, the LLM shall not hallucinate a value unless the host runtime defines a fallback policy. ([eclipse.dev][2])

## 13. Tool Invocation

The LLM shall recognize inline tool syntax `@tool_name()` as an available tool call. If the tool appears as `@tool_name()!`, the LLM shall treat the call as mandatory and must not skip it merely because a verbal response appears sufficient. Tool declarations exist so the ADL engine can load, validate, and ensure execution of required actions. ([eclipse.dev][2])

## 14. Executable Code

If a skill contains a fenced code block intended as executable logic, the LLM shall treat it as runtime logic supplied by the ADL environment rather than as ordinary prose. The official documentation shows Kotlin code blocks and predefined helper functions such as `httpGet(url)`, `time(zoneId?)`, `date(zoneId?)`, and `year(zoneId?)`. The LLM shall not reinterpret such blocks as conversational filler. ([eclipse.dev][2])

## 15. Static Responses

If a skill’s solution is defined as a literal static response, the LLM shall return it exactly as specified for that turn. Static responses bypass normal generative flexibility and are intended for exact text such as greetings, disclaimers, or legally sensitive messages. ([eclipse.dev][2])

## 16. Conversation Flows

If the skill encodes a decision tree using branch labels and `goto` transitions, the LLM shall follow that conversational graph faithfully. The LLM shall branch according to the user’s input or current state and continue execution at the referenced node. It shall not flatten the flow into an unrelated free-form answer. ([eclipse.dev][2])

## 17. Output Contract

If an **Output** block is present, the LLM shall treat it as a binding response schema. Where the block uses JSON Schema, the LLM shall return output that conforms exactly to the schema, including required fields and restrictions such as `additionalProperties: false`. This contract is especially important when downstream APIs, tools, or UI components consume the response programmatically. ([eclipse.dev][2])

## 18. Mandatory Instructions

Any sentence containing the reserved keyword `MUST` shall be interpreted as a mandatory requirement. The LLM shall prioritize such instructions above stylistic preference or brevity. The documentation states that the ADL engine extracts `MUST` statements to reinforce behavior, generate evaluation criteria, and ensure critical business logic is not bypassed. ([eclipse.dev][2])

## 19. Memory Semantics

If the skill uses `MEMORIZE`, the LLM shall treat the instruction as a directive to persist the referenced fact within the user-skill memory scope defined by the ADL engine. On later runs of the same skill, memorized values may be injected into Context and reused. The LLM shall not assume global memory across unrelated skills unless the host runtime explicitly provides it. ([eclipse.dev][2])

## 20. Comments

Any line starting with `//` shall be treated as a comment and shall not be exposed in the final model-facing instruction set or user response. Comments are author notes only. ([eclipse.dev][2])

## 21. Non-Hallucination Rule

Where the ADL Skill, runtime context, or tool outputs do not provide enough information, the LLM shall ask for or wait for the missing input rather than inventing facts, skipping mandatory tools, or bypassing explicit branches. This follows ADL’s design goal of bounded, reliable, production-oriented behavior. ([eclipse.dev][1])

## 22. Compliance Rule

The LLM shall consider this contract satisfied only if all of the following are true:

* applicable conditions were evaluated correctly,
* required steps were followed in order,
* mandatory tools were invoked,
* `MUST` requirements were fulfilled,
* output matched the declared schema if one existed,
* fallback/limit behavior was respected,
* comments were ignored,
* static responses were returned exactly when specified. ([eclipse.dev][2])

## 23. Minimal Processing Template

The LLM should operationalize each ADL Skill with this internal checklist:

“Determine whether the skill is triggered. Resolve conditionals and variables. Load context and memory. Execute the next applicable step. Execute mandatory tools. Apply the primary solution unless escalation to alternative or fallback is required. Enforce all `MUST` directives. Return output that matches the declared schema exactly.” This template is an implementation-oriented condensation of the documented ADL structure and features. ([eclipse.dev][2])

If you want, I can turn this into a more formal **legal-style specification**, a **JSON policy**, or a **system-prompt contract** ready to paste into an LLM runtime.

[1]: https://eclipse.dev/lmos/docs/arc/adl/adl_technical/ "Technical Details | Eclipse LMOS"
[2]: https://eclipse.dev/lmos/adl/index.html "ADL - The Agent Runtime"
