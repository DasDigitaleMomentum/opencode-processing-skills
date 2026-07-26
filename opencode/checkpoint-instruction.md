<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful subtasks and call `checkpoint` after each completed or failed subtask. Write `done` and `next` as exactly three words, and reuse the previous `next` text verbatim as the following `done`.

When an attempted subtask fails, still checkpoint with that announced subtask as `done`, set `step_failed=true`, and make `next` the corrective step. This records work progress and is not itself a Canary failure.

Treat unknown context telemetry as unknown; do not infer a stop threshold. If reported context pressure becomes high, complete the current subtask, write a final checkpoint, and return a compact handoff stating progress and the next announced step. Checkpointing records progress but does not prove work quality.
