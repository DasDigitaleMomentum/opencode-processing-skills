#!/usr/bin/env bash
# install.sh - Install OpenCode Processing Skills globally
#
# Usage:
#   ./install.sh
#
# What it does:
#   1. Copies skills to ~/.config/opencode/skills/ (global)
#   2. Copies agent definitions to ~/.config/opencode/agents/ (global)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "OpenCode Processing Skills - Installer"
echo "======================================="
echo ""
echo "Source:  $SCRIPT_DIR"
echo ""

# --- Step 1: Install Skills (global) ---
SKILLS_DEST="$HOME/.config/opencode/skills"
echo "Step 1: Installing skills to $SKILLS_DEST"

for skill_dir in "$SCRIPT_DIR/skills"/*/; do
    skill_name="$(basename "$skill_dir")"
    dest="$SKILLS_DEST/$skill_name"

    if [ -d "$dest" ]; then
        echo "  Updating: $skill_name"
        rm -rf "$dest"
    else
        echo "  Installing: $skill_name"
    fi

    mkdir -p "$dest"

    # Copy entire skill directory (no symlinks)
    # Use "/." to include hidden files if present.
    cp -R "$skill_dir/." "$dest/"
done

echo ""

# --- Step 2: Install Agents (global) ---
AGENTS_DEST="$HOME/.config/opencode/agents"
echo "Step 2: Installing agents to $AGENTS_DEST"
mkdir -p "$AGENTS_DEST"

for agent_file in "$SCRIPT_DIR/agents"/*.md; do
    agent_name="$(basename "$agent_file")"
    dest="$AGENTS_DEST/$agent_name"

    if [ -f "$dest" ]; then
        echo "  Updating: $agent_name"
    else
        echo "  Installing: $agent_name"
    fi
    cp "$agent_file" "$dest"
done

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. In OpenCode, select the new primary agent (e.g. '@maintainer')"
echo "  2. Generate project documentation: load the 'generate-docs' skill"
echo "  3. Create an implementation plan: load the 'create-plan' skill"
echo ""
