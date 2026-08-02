---
type: planning
entity: phase
plan: "checkpoint-session-status-hardening"
phase: 6
status: completed
created: "2026-08-02"
updated: "2026-08-02"
---

# Phase 6: Watcher Usability and Native Packaging

> Part of [checkpoint-session-status-hardening](../plan.md)

## Objective

Make the live watcher easier to scan during normal work and provide a verified native launch path when scriptc is already available, without weakening the portable Node installation.

## Contribution to Plan Goal

The lifecycle contract is now truthful, but long agent names are truncated before less important titles and historical rows dominate the live view. The source already contains partial scriptc compatibility work but is not yet compilable as a supported binary. This phase improves presentation and packaging only; it does not change JSONL records or lifecycle reduction.

## Scope

### Includes

- Size the `AGENT` column for complete current agent identities at ordinary terminal widths; reclaim flexible width from `NAME` before agent identity is truncated at genuinely narrow widths.
- Define an old row as one whose latest physical event is at least three hours old. Hide old rows by default in live and one-shot output.
- In live mode, bind lowercase `v` to toggle all old rows. When visible, place old unclosed `OPEN`/`UNKNOWN` rows in their own paragraph below current unclosed rows; preserve closed and error separation.
- Add testable stdin/key handling with complete raw-mode/listener/cursor cleanup. Non-TTY input remains non-interactive and safe.
- Finish scriptc compatibility for the dependency-free ESM watcher, including narrowed environment shapes and native `--help`/`--once` smoke tests.
- During global installation, detect an available `scriptc`, compile from a disposable staged source tree, smoke-test the result, and atomically install the executable as `$HOME/.local/bin/checkpoint-watch`.
- Keep the installed Node source and exact Node launch command as the fallback when scriptc is absent or the optional native build cannot be verified.
- Update focused tests and directly affected installation/dashboard documentation.

### Excludes (deferred to later phases)

- Rewriting or deleting old JSONL logs, persisting dashboard visibility preference, adding lifecycle states, or deriving closure/liveness from age.
- Interactive row selection, search, scrolling, alternate key bindings, terminal UI frameworks, or parent/child hierarchy.
- Installing scriptc itself, changing shell `PATH`, requiring scriptc for project-local installs, or replacing the Node watcher source distribution.
- Resolving the existing exact Claude Code 2.1.170/Hermes v0.19.0 host-gate blocker.

## Prerequisites

- [x] Phase 5 completed and independently accepted.
- [x] User selected old rows hidden by default and `v` as the live visibility toggle.
- [x] Current scriptc behavior and authoritative build constraints were investigated.

## Deliverables

- [x] Updated width allocation and old-session grouping/filtering in `checkpoint-watch`.
- [x] Live `v` key handling with safe terminal cleanup and deterministic tests.
- [x] Scriptc-compatible source plus native smoke tests.
- [x] Optional global native installation with Node fallback and documentation.

## Acceptance Criteria

- [x] At ordinary terminal widths, known full agent names are shown and a long `NAME` truncates first; narrow output remains bounded and deterministic.
- [x] Rows with latest-event age below three hours remain visible; rows at or above three hours are hidden initially.
- [x] Lowercase `v` toggles all old rows in live mode without changing state, ordering within groups, or JSONL data. When shown, old unclosed rows are separated by a blank line from current unclosed rows.
- [x] Live mode restores stdin raw mode, listeners, timers, watcher, and cursor state after normal and signal-driven shutdown; non-TTY and `--once` paths do not require interactive input.
- [x] `scriptc coverage`/build succeeds for the staged watcher on the supported local toolchain, and the produced binary successfully runs `--help` and `--once` against a disposable workspace.
- [x] A global install with usable scriptc atomically creates an executable `$HOME/.local/bin/checkpoint-watch`; absent or failed optional compilation leaves the Node watcher installed and emits clear fallback guidance.
- [x] Project-local installation does not mutate `$HOME/.local/bin`, and no build artifacts appear in the repository.
- [x] Focused watcher/installer tests and all locally runnable broad checks pass without weakening the pinned host gates.

## Dependencies on Other Phases

| Phase | Relationship | Notes |
|-------|-------------|-------|
| 5 | blocked-by | Refines the accepted compact dashboard and keeps its lifecycle semantics unchanged. |

## Notes

Three hours is a presentation cutoff only (`10_800_000` ms), based on the latest physical event timestamp already used for displayed age. It never writes status, closes a session, or changes `OPEN`/`CLOSED`/`UNKNOWN`. Native installation is opportunistic: Node remains the cross-platform source of truth.
