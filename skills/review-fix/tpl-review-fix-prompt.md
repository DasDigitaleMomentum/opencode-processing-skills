---
type: review
entity: continuation-prompt
skill: review-fix
created: "{{date}}"
---

# Review Continuation: Related Fixes

Resume the review thread that produced `{{review_ref}}`.

Load and follow the `review-fix` skill.

## Approved Remediation

- Target type: `{{target_type}}`
- Accepted findings or objective: `{{finding_ids}}`
- Relevant scope: `{{allowed_scope}}`
- Primary decisions: `{{primary_decisions}}`
- Verify command/checks: `{{verify}}`

Resume the existing review context only when the accepted remediation benefits from its retained reasoning; a fully specified, self-contained fix or verification may instead use a fresh lean session. You may inspect and change related call sites, integration points, configuration, and tests as needed. Do not modify the review artifact or introduce an unrelated objective. Do not create a new Blueprint merely because the fix spans multiple files. If a new scope or decision is required, report it to the primary.

During fixing, run the smallest targeted tests that exercise or reproduce the changed or problematic behavior. Do not run a supplied broad/full command after every change or use it as the first iterative diagnostic step when a targeted test is known or can be identified. Run it once when remediation is ready as the final gate. If that gate fails, return to targeted diagnosis, fix, and retest; only after targeted tests pass may the broad/full final gate run again. Never weaken or omit it.

Return only the `review-fix` digest.
