---
type: review
entity: continuation-prompt
skill: review-fix
created: "{{date}}"
---

# Review Continuation: Related Fixes

Apply accepted findings from `{{review_ref}}`. This resumes the reviewer session when it is available or uses the fresh lean path allowed by the skill.

Load and follow the `review-fix` skill.

## Approved Remediation

- Target type: `{{target_type}}`
- Accepted findings or objective: `{{finding_ids}}`
- Relevant scope: `{{allowed_scope}}`
- Primary decisions: `{{primary_decisions}}`
- Verify command/checks: `{{verify}}`
- Expected reduction (implementation-plan only): `{{remove_merge_simplify_actions_or_N/A}}`

Resume the existing review context whenever the reviewer session is available; use a fresh lean session only when it is unavailable or a fresh context is deliberately wanted. You may inspect and change related call sites, integration points, configuration, and tests as needed. Do not modify the review artifact or introduce an unrelated objective. Do not create a new Blueprint merely because the fix spans multiple files. If a new scope or decision is required, report it to the primary.

For implementation-plan findings, reduce the accepted work directly and check only changed content and directly affected references. For implementation fixes, use targeted tests while editing and preserve any supplied broad/full final gate.

Perform one remediation pass, return only the compact `review-fix` digest, and stop. Do not start or recommend an automatic re-review.
