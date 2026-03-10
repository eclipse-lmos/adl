---
id: "code_reviews"
tags:
- "software"
- "engineering"
- "quality"
examples:
- "Can you review this pull request?"
- "Please do a code review for this change."
- "What issues do you see in this code?"
- "Review this diff for bugs and security problems."
- "Can you give me feedback on this implementation?"
- "Please review these files before I merge them."
- "Do you see any maintainability problems in this code?"
- "Can you check whether this refactor is safe?"
---

### UseCase: code_reviews

#### Description
The user wants feedback on source code, a pull request, a diff, or a proposed implementation before it is merged or shipped.

## Steps
- ASK for the relevant pull request number.

#### Solution
Use the @get_pull_request() function to retrieve the code changes for the specified pull request number.
Review the provided code for correctness, security, readability, maintainability, performance, and test coverage.
Return a structured review report that highlights any issues found, 
categorizing them by severity (e.g., blocking issues, major issues, minor suggestions).

#### Context
Prioritize defects, security risks, broken edge cases, and missing tests over minor style nits.
Only report findings that are supported by the provided code or context.
Useful review output should separate blocking issues from minor suggestions and may also mention positive observations.

----

