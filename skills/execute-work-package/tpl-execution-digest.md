---
type: execution
entity: digest
skill: execute-work-package
created: "{{date}}"
---

# Execution Digest (Reference Format)

### Outcome
- state: succeeded|failed

### Edits
- files_changed:
  - path/to/file.ext — one-line summary

### Verify
- cmd: `...`
- exit: 0|1|...
- excerpt (only if failed): |
    <few relevant lines>

### Next
- 1–3 bullets
