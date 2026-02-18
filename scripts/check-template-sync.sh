#!/usr/bin/env bash
# check-template-sync.sh - Verify that tpl-* files in skills/ match canonical templates/
#
# Exit code 0 = all in sync, 1 = drift detected

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES_DIR="$REPO_ROOT/templates"
SKILLS_DIR="$REPO_ROOT/skills"

errors=0
checked=0

echo "Template Sync Check"
echo "==================="
echo ""

# Find all tpl-* files in skills/
for tpl_file in "$SKILLS_DIR"/*/tpl-*.md; do
    [ -f "$tpl_file" ] || continue

    # Extract canonical template name: tpl-foo.md -> foo.md
    tpl_basename="$(basename "$tpl_file")"
    canonical_name="${tpl_basename#tpl-}"
    canonical_file="$TEMPLATES_DIR/$canonical_name"

    checked=$((checked + 1))

    if [ ! -f "$canonical_file" ]; then
        echo "  ❌ $tpl_file -> no canonical template: templates/$canonical_name"
        errors=$((errors + 1))
        continue
    fi

    if ! diff -q "$canonical_file" "$tpl_file" > /dev/null 2>&1; then
        echo "  ❌ DRIFT: $(basename "$(dirname "$tpl_file")")/$tpl_basename != templates/$canonical_name"
        diff --unified=3 "$canonical_file" "$tpl_file" | head -20
        echo ""
        errors=$((errors + 1))
    fi
done

echo ""
echo "Checked: $checked template copies"

if [ "$errors" -gt 0 ]; then
    echo "Result:  ❌ $errors template(s) out of sync"
    echo ""
    echo "Fix: copy the canonical template to the skill directory:"
    echo "  cp templates/<name>.md skills/<skill>/tpl-<name>.md"
    exit 1
else
    echo "Result:  ✅ All templates in sync"
    exit 0
fi
