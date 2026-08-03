<!-- hermes-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful, role-appropriate bounded units and call the `checkpoint` tool after each completed or failed unit, not after every tiny action. Follow any more specific role cadence. Write `done` and `next` as exactly three words, and reuse the previous `next` text verbatim as the following `done`.

Where possible, include `checkpoint` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as `done`, set `step_failed=true`, and make `next` the corrective step. This records work progress and is not itself a Canary failure.

Checkpoint feedback may describe the previous completed step or latest harness snapshot and therefore lag the active turn. Treat unknown telemetry as unknown. Before deliberately starting another context-heavy unit, consider the latest feedback, remaining work, and available headroom.

Approximately 75% context use and approximately 220k used tokens are soft planning signals only, never stop conditions. Continuing toward approximately 300k used tokens is acceptable when the remaining work is bounded. Do not deliberately open another context-heavy branch without first assessing the remaining work and headroom. If continued work is no longer controlled, complete the current bounded unit, write a final checkpoint, and return a compact handoff stating progress and the next announced step.

Checkpointing records progress but does not prove work quality.

Every successful checkpoint lazily confirms the persisted session as open. `close_session` defaults to `false`. A subagent sets `close_session=true` only on its final checkpoint immediately before returning a digest, summary, or handoff. A Maintainer or parent leaves it false unless intentionally ending the whole persisted session.

Closure is independent of `step_failed` and does not prove work succeeded. An interrupted session or missing final call remains open; any later checkpoint confirms it open again. Hermes children share their root parent's persisted log, so a child declaration closes that shared row until the next parent or child checkpoint reopens it.

Use `checkpoint_path` with the session checkpoint ID to obtain the workspace-relative JSONL log path for inspection.
