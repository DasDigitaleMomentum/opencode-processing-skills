---
type: review
entity: continuation-prompt
skill: review-fix
created: "{{date}}"
---

# Defect Remediation: Existing-Session Continuation

The Primary has accepted the defects below and explicitly instructs you to remediate them within the supplied scope. No approval token is required. This prompt resumes an eligible session that produced the review or diagnosis; a review artifact is not required.

Load and follow the `review-fix` skill.

## Approved Remediation

- Target type: `{{target_type}}`
- Finding source(s): `{{review_artifact_or_analysis_implementation_digest_message_refs}}`
- Accepted defects: `{{ids_or_stable_short_labels_with_concrete_description_expected_behavior_or_invariant_and_evidence}}`
- Source-session assignment: `{{exact_task_id_and_assigned_defects_for_each_source_session}}`
- Resumed session persona and model/variant (unchanged): `{{persona_model_variant}}`
- Retained review/diagnosis context/output is correct and sufficient: `{{eligibility_basis}}`
- Accepted objective and scope: `{{allowed_scope}}`
- Primary decisions: `{{primary_decisions}}`
- Verify command/checks or goal (identify any broad/full final gate): `{{verify}}`
- Expected reduction (implementation-plan only): `{{remove_merge_simplify_actions_or_N/A}}`
- Closure: one bounded pass for the assigned defects, compact digest, then stop.

Follow the skill's session eligibility and fallback rules. Reuse already-secured evidence rather than collecting it again. If retained context/output is faulty, insufficient, or unavailable, report that to the Primary for a fresh, appropriately routed session with a finding-source hint; do not claim it has the old context. Other source pointers do not confer their sessions' retained context.

You may inspect and change related call sites, integration points, configuration, and tests as needed for the assigned defects. Do not modify source review artifacts or introduce an unrelated objective. Conversation-owned plan corrections remain with the Primary through `update-plan`. Do not create a new Blueprint merely because the fix spans multiple files. If a new scope or decision is required, report it to the Primary.

For implementation-plan findings, reduce the accepted work directly and check only changed content and directly affected references. For implementation fixes, use targeted tests while editing and preserve any supplied broad/full final gate.

Perform one remediation pass, return only the compact `review-fix` digest, and stop. Escalate materially new risk/uncertainty to the Primary, who decides on re-review; do not start an automatic review/fix loop.
