---
type: execution
entity: digest
skill: execute-work-package
created: "{{date}}"
---

# Execution Digest (Reference Format)

### Outcome
- state: succeeded|failed|BLOCKED

### Edits
- files_changed:
  - path/to/file.ext — one-line summary

### Verify
- cmd: `...`
- exit: 0|1|...
- excerpt (only if failed): |
    <few relevant lines>

### Environment (optional)
- issue: <category>: <symptom>  # omit when none; the Primary records it via report-environment-issue

### Next
- 1–3 bullets; when BLOCKED, include the exact decision needed from the Primary and whether an updated/re-approved gate is required
