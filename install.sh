#!/usr/bin/env bash
# install.sh - Install or uninstall OpenCode Processing Skills globally
#
# Usage:
#   ./install.sh             # Install / update all skills and agents
#   ./install.sh --uninstall # Remove all installed skills and agents
#
# What it does:
#   1. Copies skills to ~/.config/opencode/skills/ (global)
#   2. Copies agent definitions to ~/.config/opencode/agents/ (global)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Uninstall Mode ---
if [[ "${1:-}" == "--uninstall" ]]; then
    echo "OpenCode Processing Skills - Uninstaller"
    echo "========================================="
    echo ""

    SKILLS_DEST="$HOME/.config/opencode/skills"
    AGENTS_DEST="$HOME/.config/opencode/agents"

    echo "Removing skills..."
    for skill_dir in "$SCRIPT_DIR/skills"/*/; do
        skill_name="$(basename "$skill_dir")"
        dest="$SKILLS_DEST/$skill_name"
        if [ -d "$dest" ]; then
            rm -rf "$dest"
            echo "  Removed: $skill_name"
        fi
    done

    echo ""
    echo "Removing agents..."
    for agent_file in "$SCRIPT_DIR/agents"/*.md; do
        agent_name="$(basename "$agent_file")"
        dest="$AGENTS_DEST/$agent_name"
        if [ -f "$dest" ]; then
            rm -f "$dest"
            echo "  Removed: $agent_name"
        fi
    done

    echo ""
    echo "✅ Uninstall complete."
    exit 0
fi

# --- Install Mode ---
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
echo "✅ Installation complete!"
echo ""
echo "Installed:"
printf "  Skills:  %d\n" "$(find "$SCRIPT_DIR/skills" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')"
printf "  Agents:  %d\n" "$(find "$SCRIPT_DIR/agents" -name '*.md' | wc -l | tr -d ' ')"
echo ""
echo "Next steps:"
echo "  1. In OpenCode, select the primary agent: @maintainer"
echo "  2. Start a session: load the 'smart-start' skill"
echo "  3. Or generate docs: load the 'generate-docs' skill"
echo ""
