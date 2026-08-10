---
name: browser-walkthrough
description: Run Playwright-MCP browser acceptance, agent-observed walkthroughs, or user-attended walkthroughs through the role routing appropriate to each mode, returning a compact evidence-referenced digest.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: verification
  phase: implementation
---

# Skill: Browser Walkthrough

Use available Playwright MCP/browser tools to exercise and observe a browser journey. This skill does not install, provision, or configure Playwright and does not create a browser-specific persona.

## Modes and Role Routing

Select one mode before using browser tools. Existing personas remain defined by the kind of delegation:

1. **Automated browser acceptance — Implementer-owned**
   - Use during approved `execute-work-package` EXECUTE work when browser behavior is part of implementation verification.
   - Keep the approved Blueprint, targeted-then-broad verification sequence, and final verify command authoritative.
   - Exercise the acceptance journey autonomously and return evidence through the execution digest.
2. **Agent-observed walkthrough — Delegate-owned**
   - Use when an agent must inspect, explain, or evaluate an existing browser journey without owning implementation.
   - The Delegate owns observations, hypothesis/evidence/decision cycles, and the walkthrough digest; separable evidence retrieval may still go to `retriever`.
3. **User-attended walkthrough — Maintainer-coordinated, optionally Delegate-executed**
   - Use when the user participates in or directs the journey while it is in progress.
   - The Maintainer owns the user conversation and attended decision points. A Delegate may execute each bounded browser segment and return when user input is needed.
   - Resume the same Delegate `task_id` after user input when retained browser and observation context materially helps; otherwise use a fresh bounded delegation.

Do not route any mode to a `browser-runner` agent or model alias.

## Workflow

1. State the selected mode, journey objective, starting location, and observable success condition.
2. Use the available Playwright MCP/browser navigation, accessibility, interaction, console, network, screenshot, and tab tools needed for that journey.
   - A lighter Delegate such as `delegate-fast` is appropriate for bounded mechanical navigation and observation.
   - Use `retriever` for separable browser evidence retrieval, not as the owner of an iterative journey or attended interaction.
3. Prefer compact accessibility queries and targeted evidence. Keep large accessibility snapshots, DOM output, console logs, traces, screenshots, and similar raw evidence out of the owning or primary response:
   - save potentially large tool output to a predictable evidence path when the tool supports it;
   - otherwise use the owning role's existing `/tmp/opencode/` spooling, focused filtering, or `retriever` evidence-routing behavior;
   - retain only paths plus compact decisive observations in the active context.
4. Treat each completed browser journey, or each bounded browser hypothesis/evidence/decision cycle, as one checkpoint unit. Consult the returned input telemetry before deliberately beginning another context-heavy browser unit; unknown telemetry remains unknown.
5. Record the observed result, any failure point, evidence paths, and browser cleanup performed or still pending.

## Output Contract

Return only a compact digest with these fields:

- **Outcome**: succeeded | failed | blocked
- **Mode**: automated acceptance | agent-observed | user-attended
- **Steps**: concise ordered journey steps
- **Results**: decisive observed behavior and acceptance result
- **Failure**: concise failure point and message, or `none`
- **Evidence paths**: paths or `none`; never inline large raw evidence
- **Cleanup**: browser cleanup performed or still pending

For automated browser acceptance, incorporate these fields into the Implementer's canonical execution digest rather than emitting a second competing result format.

For a user-attended walkthrough, return this digest at each actual user-interaction point and resume the retained Delegate session after the Maintainer obtains the user's input when that continuation remains useful.

## Constraints

- Use only Playwright MCP/browser capabilities already available in the active harness.
- Do not provision, install, or configure Playwright.
- Do not create a new persona or model alias for browser work.
- Do not replace the owning role's write boundary, approval gate, verification contract, or evidence-routing rules.
