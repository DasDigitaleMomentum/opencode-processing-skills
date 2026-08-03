<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful, role-appropriate bounded units and call `checkpoint` after each completed or failed unit, not after every tiny action. Follow any more specific role cadence. Write `done` and `next` as exactly three words, and reuse the previous `next` text verbatim as the following `done`.

Where possible, include `checkpoint` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as `done`, set `step_failed=true`, and make `next` the corrective step. This records work progress and is not itself a Canary failure.

Checkpoint feedback may describe the previous completed step or latest harness snapshot and therefore lag the active turn. Treat unknown telemetry as unknown. Base capacity and cost decisions only on reported **input usage**, input K-tokens, and remaining input K-tokens.

Across providers, approximately 220k input tokens are a soft planning signal: do not deliberately open another context-heavy branch without assessing the remaining work. At or above approximately 272k input tokens, use the remaining budget to leave a coherent state, checkpoint, and return a compact digest or handoff instead of starting more context-heavy work. The 372k input rejection boundary is emergency headroom, not a working target. These are behavioral guidelines, not tool-enforced stop conditions.

Checkpointing records progress but does not prove work quality.

Every successful checkpoint lazily confirms the persisted session as open. `close_session` defaults to `false`. A subagent sets `close_session=true` only on its final checkpoint immediately before returning a digest, summary, or handoff. A Maintainer or parent leaves it false unless intentionally ending the whole persisted session.

Closure is independent of `step_failed` and does not prove work succeeded. An interrupted session or missing final call remains open; any later checkpoint confirms it open again.

<!-- /opencode-checkpoint-instruction -->
