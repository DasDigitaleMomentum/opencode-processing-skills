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

Resume the existing review context and fix the accepted related findings. You may inspect and change related call sites, integration points, configuration, and tests as needed. Do not modify the review artifact or introduce an unrelated objective. Do not create a new Blueprint merely because the fix spans multiple files. If a new scope or decision is required, report it to the primary.

Return only the `review-fix` digest.
