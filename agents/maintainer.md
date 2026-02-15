---
description: Primary agent for keeping project docs/ and plans/ up to date via globally installed skills. Uses provider prompt (no custom prompt body). Blocks the built-in explore subagent; only allows framework subagents.
mode: primary
hidden: false
permission:
  question: allow
  plan_enter: deny
  task:
    "*": deny
    doc-explorer: allow
    general: allow
---
