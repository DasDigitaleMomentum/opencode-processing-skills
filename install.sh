#!/usr/bin/env bash
# install.sh - Install OpenCode Processing Skills globally
#
# Usage:
#   ./install.sh
#
# Configuration (in order of precedence):
#   1. OPS_* environment variables  (runtime overrides, for tests/CI)
#   2. config.yaml                  (persistent user config, gitignored)
#   3. built-in defaults            (sensible auto-detect behavior)
#
# Targets:
#   - OpenCode   -> OPENCODE_HOME/{skills,agents}  (always on)
#   - Codex      -> CODEX_HOME/skills              (skills only)
#   - Claude     -> CLAUDE_HOME/{skills,agents}    (also serves Antigravity
#                                                   via anthropic.claude-code ext)
#
# Environment overrides (OPS_ prefix avoids collisions with tool-native vars):
#   OPS_OPENCODE_HOME       override OpenCode home
#   OPS_CODEX_HOME          override Codex home
#   OPS_CLAUDE_HOME         override Claude Code home
#   OPS_SYNC_CODEX          true|false|auto — override targets.codex.enabled
#   OPS_SYNC_CLAUDE         true|false|auto — override targets.claude.enabled
#   OPS_ANTIGRAVITY_PATH    override Antigravity detection path (test-only)
#   OPS_CONFIG_FILE         alternate config.yaml path (default: <repo>/config.yaml)
#
# Symlink safety: existing symlinks at any destination path are preserved
# (not overwritten), so users who deliberately symlinked the repo into their
# config directories keep that layout.
#
# Dependency: yq v4+ (https://github.com/mikefarah/yq). Install with `brew install yq`.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${OPS_CONFIG_FILE:-$SCRIPT_DIR/config.yaml}"

# --- Dependency check ---
if ! command -v yq >/dev/null 2>&1; then
    echo "Error: 'yq' (v4+) is required but not installed." >&2
    echo "  Install with: brew install yq" >&2
    echo "  Or see:       https://github.com/mikefarah/yq#install" >&2
    exit 1
fi

# --- Helper: read a value from config.yaml via yq, with default ---
# Usage: yaml_get <yq_path> <default>
# Returns the value at <yq_path>, or <default> if the path is null/missing
# or the config file does not exist.
yaml_get() {
    local path="$1"
    local default="$2"
    if [ ! -f "$CONFIG_FILE" ]; then
        printf '%s' "$default"
        return
    fi
    local val
    val=$(yq eval "$path" "$CONFIG_FILE" 2>/dev/null || true)
    if [ -z "$val" ] || [ "$val" = "null" ]; then
        printf '%s' "$default"
    else
        printf '%s' "$val"
    fi
}

# --- Helper: expand leading ~ in a path ---
expand_home() {
    local p="$1"
    printf '%s' "${p/#\~/$HOME}"
}

# --- Helper: is a target enabled given a tri-state value and its home dir ---
# Returns 0 (enabled) or 1 (disabled).
# <state> accepts: true|1|yes, false|0|no, auto (= enabled iff <home> exists).
is_enabled() {
    local state="$1"
    local home="$2"
    case "$state" in
        true|1|yes) return 0 ;;
        false|0|no) return 1 ;;
        auto|"")    [ -d "$home" ] && return 0 || return 1 ;;
        *)
            echo "  Warning: unknown enabled value '$state', treating as 'auto'" >&2
            [ -d "$home" ] && return 0 || return 1
            ;;
    esac
}

echo "OpenCode Processing Skills - Installer"
echo "======================================="
echo ""
echo "Source:  $SCRIPT_DIR"
if [ -f "$CONFIG_FILE" ]; then
    echo "Config:  $CONFIG_FILE"
else
    echo "Config:  (none — using built-in defaults)"
fi
echo ""

# --- Resolve targets: config.yaml first, OPS_* env vars override ---

# OpenCode (always required)
OPENCODE_HOME_RAW=$(yaml_get '.targets.opencode.home' "$HOME/.config/opencode")
OPENCODE_HOME="${OPS_OPENCODE_HOME:-$OPENCODE_HOME_RAW}"
OPENCODE_HOME=$(expand_home "$OPENCODE_HOME")

# Codex
CODEX_HOME_RAW=$(yaml_get '.targets.codex.home' "$HOME/.codex")
CODEX_HOME="${OPS_CODEX_HOME:-$CODEX_HOME_RAW}"
CODEX_HOME=$(expand_home "$CODEX_HOME")
CODEX_STATE_RAW=$(yaml_get '.targets.codex.enabled' 'auto')
CODEX_STATE="${OPS_SYNC_CODEX:-$CODEX_STATE_RAW}"

# Claude Code
CLAUDE_HOME_RAW=$(yaml_get '.targets.claude.home' "$HOME/.claude")
CLAUDE_HOME="${OPS_CLAUDE_HOME:-$CLAUDE_HOME_RAW}"
CLAUDE_HOME=$(expand_home "$CLAUDE_HOME")
CLAUDE_STATE_RAW=$(yaml_get '.targets.claude.enabled' 'auto')
CLAUDE_STATE="${OPS_SYNC_CLAUDE:-$CLAUDE_STATE_RAW}"

# Antigravity detection path (test-only override; not a yaml target)
ANTIGRAVITY_PATH="${OPS_ANTIGRAVITY_PATH:-$HOME/Library/Application Support/Antigravity}"

# --- Installation targets ---
SKILLS_DESTS=("$OPENCODE_HOME/skills")
AGENTS_DESTS=("$OPENCODE_HOME/agents")

if is_enabled "$CODEX_STATE" "$CODEX_HOME"; then
    SKILLS_DESTS+=("$CODEX_HOME/skills")
    echo "Codex integration: enabled (skills -> $CODEX_HOME/skills)"
else
    echo "Codex integration: disabled"
fi

claude_enabled=0
if is_enabled "$CLAUDE_STATE" "$CLAUDE_HOME"; then
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
if [ -d "$ANTIGRAVITY_PATH" ]; then
    if [ "$claude_enabled" = "1" ]; then
        echo "Antigravity detected: served by Claude Code target at $CLAUDE_HOME"
    else
        echo "Antigravity detected: WARNING — Claude Code sync is disabled, so Antigravity will not receive updates."
        echo "  Re-run with OPS_SYNC_CLAUDE=true (or enable claude in config.yaml) to sync."
    fi
fi

echo ""

# --- Helper: read model for an agent from config.yaml ---
# Returns the model string, or empty if not configured.
get_model_for_agent() {
    local agent_name="$1"
    yaml_get ".${agent_name}" ""
}

# --- Helper: inject or remove model line in agent frontmatter ---
# If model is non-empty, adds/replaces "model: <value>" after the description line.
# If model is empty, removes any existing model line.
inject_model() {
    local file="$1"
    local model="$2"

    if [ -n "$model" ]; then
        if grep -q "^model:" "$file"; then
            sed -i "s|^model:.*|model: ${model}|" "$file"
        else
            sed -i "/^description:/a model: ${model}" "$file"
        fi
    else
        sed -i '/^model:/d' "$file"
    fi
}

# --- Helper: parse additional_delegates from config.yaml via yq ---
# Returns lines of "suffix model" pairs
get_additional_delegates() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    yq eval '.additional_delegates // {} | to_entries | .[] | .key + " " + .value' "$CONFIG_FILE" 2>/dev/null | grep -v '^null$' || true
}

# --- Helper: create a delegate variant from the delegate template ---
create_delegate_variant() {
    local suffix="$1"
    local model="$2"
    local agents_dest="$3"
    local template="$SCRIPT_DIR/agents/delegate.md"
    local dest="$agents_dest/delegate-${suffix}.md"

    cp "$template" "$dest"

    sed -i "s|^description:.*|description: Delegate variant '${suffix}' with model ${model}. Use for specific delegation needs.|" "$dest"
    sed -i 's|^# Delegate\b.*|# Delegate ('"${suffix}"')|' "$dest"

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
    echo "Config:  $CONFIG_FILE (applied)"
else
    echo "Config:  not found (using built-in defaults)"
    echo "  Tip: Copy config.yaml.example to config.yaml to set targets and models."
fi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. In OpenCode, select the new primary agent (e.g. '@maintainer')"
echo "  2. Generate project documentation: load the 'generate-docs' skill"
echo "  3. Create an implementation plan: load the 'create-plan' skill"
echo ""
