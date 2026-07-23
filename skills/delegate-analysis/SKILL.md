---
name: delegate-analysis
description: Skill-driven exploration, targeted reading, web research, and deep-dive analysis for delegate agents. Use when the primary delegates investigation or information gathering rather than artifact review or code execution.
license: MIT
compatibility:
  opencode: ">=0.1"
metadata:
  category: analysis
---

# Skill: Delegate Analysis

Use one of the following modes. The primary should name the mode, scope, and question explicitly.

## Modes

### `code-exploration`

- Orient with file search, then read only the key files.
- Trace dependencies one level further only when needed.
- Return findings with concrete file paths and symbols.

### `targeted-reading`

- Use the named files as scoped starting points and retrieve only what answers the question.
- Extract only the facts needed to answer the question.
- Organize the result by topic or file, with line references where useful.

### `web-research`

- Prefer authoritative primary sources.
- Cross-check important claims when practical.
- Return a concise synthesis with source URLs and explicit uncertainty.
- This is delegate work: use `retriever` only to crawl or fetch already-selected sources, not for open-ended search, source selection, or cross-source judgment.

### `deep-dive`

- Start at the named entry point and follow relevant indirections until the question is answered.
- Map the code or data path with file and symbol evidence.
- Highlight non-obvious behavior, assumptions, and unresolved gaps.

## Rules

- Default to read/analyze/verify. Do not edit files.
- Stay within the delegated scope.
- Use a focused read-only script when one filtered operation can answer the question, and native parallel calls for a small set of independent, compact results. Delegate broad, large, exploratory, or mostly irrelevant raw evidence to `retriever` by default. Read directly only central authoritative artifacts, short required sections, and decisive evidence.
- The parent owns synthesis and verifies only evidence that materially supports its conclusions rather than repeating broad retrieval.
- If the task becomes a review, artifact authoring task, or implementation task, stop and ask the primary to route through the matching skill.
- Return a compact digest, not raw file contents or long logs.
