#!/usr/bin/env bash
# install.sh - Install OpenCode Processing Skills globally
#
# Usage:
#   ./install.sh
#
# What it does:
#   1. Copies skills to ~/.config/opencode/skills/ (global)
#   2. Copies skills to ~/.codex/skills/ when Codex is detected
#   3. Copies skills and agents to ~/.claude/{skills,agents}/ when Claude Code is detected
#   4. Copies agent definitions to ~/.config/opencode/agents/ (global)
#   5. If config.yaml exists, injects model settings into agent frontmatter
#   6. Creates additional delegate variants from additional_delegates config
#
# Environment variables:
#   OPENCODE_HOME          override OpenCode config dir (default ~/.config/opencode)
#   CODEX_HOME             override Codex config dir (default ~/.codex)
#   CLAUDE_HOME            override Claude Code config dir (default ~/.claude)
#   ANTIGRAVITY_APP_SUPPORT override Antigravity detection path
#                          (default ~/Library/Application Support/Antigravity)
#   SYNC_CODEX_SKILLS      auto|1|0 — sync skills into CODEX_HOME (default auto)
#   SYNC_CLAUDE            auto|1|0 — sync skills+agents into CLAUDE_HOME (default auto)
#
# Symlink safety: existing symlinks at any destination path are preserved
# (not overwritten) so users who deliberately symlinked the repo into their
# config directories keep that layout.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.yaml"

OPENCODE_HOME="${OPENCODE_HOME:-$HOME/.config/opencode}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
SYNC_CODEX_SKILLS="${SYNC_CODEX_SKILLS:-auto}" # auto|1|0
SYNC_CLAUDE="${SYNC_CLAUDE:-auto}"             # auto|1|0
ANTIGRAVITY_APP_SUPPORT="${ANTIGRAVITY_APP_SUPPORT:-$HOME/Library/Application Support/Antigravity}"

echo "OpenCode Processing Skills - Installer"
echo "======================================="
echo ""
echo "Source:  $SCRIPT_DIR"
echo ""

# --- Installation targets ---
SKILLS_DESTS=("$OPENCODE_HOME/skills")
AGENTS_DESTS=("$OPENCODE_HOME/agents")

if [ "$SYNC_CODEX_SKILLS" = "1" ] || { [ "$SYNC_CODEX_SKILLS" = "auto" ] && [ -d "$CODEX_HOME" ]; }; then
    SKILLS_DESTS+=("$CODEX_HOME/skills")
    echo "Codex integration: enabled (skills -> $CODEX_HOME/skills)"
else
    echo "Codex integration: disabled"
fi

claude_enabled=0
if [ "$SYNC_CLAUDE" = "1" ] || { [ "$SYNC_CLAUDE" = "auto" ] && [ -d "$CLAUDE_HOME" ]; }; then
    SKILLS_DESTS+=("$CLAUDE_HOME/skills")
    AGENTS_DESTS+=("$CLAUDE_HOME/agents")
    claude_enabled=1
    echo "Claude Code integration: enabled (skills -> $CLAUDE_HOME/skills, agents -> $CLAUDE_HOME/agents)"
else
    echo "Claude Code integration: disabled"
fi

# Antigravity is a VS Code fork that loads skills/agents via the
# `anthropic.claude-code` extension, which reads from CLAUDE_HOME. It has no
# config path of its own, so the Claude Code target covers it automatically.
if [ -d "$ANTIGRAVITY_APP_SUPPORT" ]; then
    if [ "$claude_enabled" = "1" ]; then
        echo "Antigravity detected: served by Claude Code target at $CLAUDE_HOME"
    else
        echo "Antigravity detected: WARNING — Claude Code sync is disabled, so Antigravity will not receive updates."
        echo "  Re-run with SYNC_CLAUDE=1 (or create $CLAUDE_HOME) to sync."
    fi
fi

echo ""

# --- Helper: read model for an agent from config.yaml ---
# Returns the model string, or empty if not configured.
get_model_for_agent() {
    local agent_name="$1"
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    # Parse simple "key: value" YAML (no nesting, no quotes needed)
    # Skips comments and empty lines, matches exact agent name at root level
    # (not indented, so not under additional_delegates)
    local model
    model=$(grep -E "^${agent_name}:" "$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/^[^:]*:[[:space:]]*//' | sed 's/[[:space:]]*$//')
    echo "$model"
}

# --- Helper: inject or remove model line in agent frontmatter ---
# If model is non-empty, adds/replaces "model: <value>" after the description line.
# If model is empty, removes any existing model line.
inject_model() {
    local file="$1"
    local model="$2"

    if [ -n "$model" ]; then
        # Check if model line already exists
        if grep -q "^model:" "$file"; then
            # Replace existing model line
            sed -i "s|^model:.*|model: ${model}|" "$file"
        else
            # Insert model line after description line
            sed -i "/^description:/a model: ${model}" "$file"
        fi
    else
        # Remove model line if present (no config = use default)
        sed -i '/^model:/d' "$file"
    fi
}

# --- Helper: parse additional_delegates from config.yaml ---
# Returns lines of "suffix model" pairs
get_additional_delegates() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    # Find the additional_delegates section and extract indented entries
    # Each entry is "  suffix: model" under the additional_delegates: key
    awk '
        /^additional_delegates:/ { in_section=1; next }
        /^[a-zA-Z]/ && in_section { exit }  # Exit on next root-level key
        in_section && /^[[:space:]]+[a-zA-Z]/ {
            # Remove leading whitespace
            gsub(/^[[:space:]]+/, "")
            # Skip commented lines
            if (substr($0, 1, 1) == "#") next
            # Split on first colon
            colon = index($0, ":")
            if (colon > 0) {
                suffix = substr($0, 1, colon - 1)
                model = substr($0, colon + 1)
                # Trim whitespace from model
                gsub(/^[[:space:]]+/, "", model)
                gsub(/[[:space:]]+$/, "", model)
                if (suffix != "" && model != "") {
                    print suffix, model
                }
            }
        }
    ' "$CONFIG_FILE"
}

# --- Helper: create a delegate variant from the delegate template ---
create_delegate_variant() {
    local suffix="$1"
    local model="$2"
    local agents_dest="$3"
    local template="$SCRIPT_DIR/agents/delegate.md"
    local dest="$agents_dest/delegate-${suffix}.md"

    # Copy template
    cp "$template" "$dest"

    # Update description to indicate this is a variant
    sed -i "s|^description:.*|description: Delegate variant '${suffix}' with model ${model}. Use for specific delegation needs.|" "$dest"

    # Update the heading (match "# Delegate" at start of line, with optional trailing content)
    sed -i 's|^# Delegate\b.*|# Delegate ('"${suffix}"')|' "$dest"

    # Inject the model
    inject_model "$dest" "$model"

    echo "  Generated: delegate-${suffix}.md -> model: $model"
}

# --- Step 1: Install Skills ---
step1_count=0
for SKILLS_DEST in "${SKILLS_DESTS[@]}"; do
    step1_count=$((step1_count + 1))
    echo "Step 1.${step1_count}: Installing skills to $SKILLS_DEST"
    mkdir -p "$SKILLS_DEST"

    for skill_dir in "$SCRIPT_DIR/skills"/*/; do
        skill_name="$(basename "$skill_dir")"
        dest="$SKILLS_DEST/$skill_name"

        if [ -L "$dest" ]; then
            # Preserve user-managed symlink (points into the repo already —
            # `git pull` keeps it fresh without us overwriting the layout).
            echo "  Symlink (skipping): $skill_name"
            continue
        fi

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
done

echo ""

# --- Step 2: Install Agents ---
step2_count=0
for AGENTS_DEST in "${AGENTS_DESTS[@]}"; do
    step2_count=$((step2_count + 1))
    echo "Step 2.${step2_count}: Installing agents to $AGENTS_DEST"
    mkdir -p "$AGENTS_DEST"

    for agent_file in "$SCRIPT_DIR/agents"/*.md; do
        agent_name="$(basename "$agent_file" .md)"
        dest="$AGENTS_DEST/$(basename "$agent_file")"

        if [ -L "$dest" ]; then
            # Preserve user-managed symlink (e.g. into a shared superpowers repo).
            echo "  Symlink (skipping): $(basename "$agent_file")"
            continue
        fi

        if [ -f "$dest" ]; then
            echo "  Updating: $(basename "$agent_file")"
        else
            echo "  Installing: $(basename "$agent_file")"
        fi
        cp "$agent_file" "$dest"

        # Inject model from config.yaml (if configured)
        model=$(get_model_for_agent "$agent_name")
        if [ -n "$model" ]; then
            inject_model "$dest" "$model"
            echo "    -> model: $model"
        fi
    done
    echo ""
done

echo ""

# --- Step 3: Create additional delegate variants ---
if [ -f "$CONFIG_FILE" ]; then
    additional=$(get_additional_delegates)
    if [ -n "$additional" ]; then
        echo "Step 3: Creating additional delegate variants (OpenCode agents)"
        for AGENTS_DEST in "${AGENTS_DESTS[@]}"; do
            while read -r suffix model; do
                if [ -n "$suffix" ] && [ -n "$model" ]; then
                    create_delegate_variant "$suffix" "$model" "$AGENTS_DEST"
                fi
            done <<< "$additional"
        done
        echo ""
    fi
fi

# --- Summary ---
if [ -f "$CONFIG_FILE" ]; then
    echo "Model config: $CONFIG_FILE (applied)"
else
    echo "Model config: not found (using default models)"
    echo "  Tip: Copy config.yaml.example to config.yaml to set custom models."
fi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. In OpenCode, select the new primary agent (e.g. '@maintainer')"
echo "  2. Generate project documentation: load the 'generate-docs' skill"
echo "  3. Create an implementation plan: load the 'create-plan' skill"
echo ""
