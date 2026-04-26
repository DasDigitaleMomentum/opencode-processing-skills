#!/usr/bin/env bash
# install.sh - Install OpenCode Processing Skills globally
#
# Usage:
#   ./install.sh             # global installation
#   ./install.sh --project   # local installation into ./.opencode/
#   ./install.sh --help      # show usage
#
# The --project flag installs skills and agents into ./.opencode/ in the
# current directory, instead of the global config directory. Use this for
# per-project installation (e.g., versioning in-repo, CI reproducibility).
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
# No external dependencies beyond coreutils + grep + awk + sed.

set -euo pipefail

# --- Argument parsing ---
PROJECT_MODE=false
for arg in "$@"; do
    case "$arg" in
        --project)
            PROJECT_MODE=true
            ;;
        --help|-h)
            echo "Usage: ./install.sh [--project] [--help]"
            echo ""
            echo "  (no flags)    Global installation into configured targets"
            echo "  --project     Local installation into ./.opencode/"
            echo "  --help, -h    Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            echo "Usage: ./install.sh [--project] [--help]" >&2
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${OPS_CONFIG_FILE:-$SCRIPT_DIR/config.yaml}"

# If the user explicitly set OPS_CONFIG_FILE but the file does not exist,
# fail fast — silent fallback to defaults would be a footgun in CI/tests.
if [ -n "${OPS_CONFIG_FILE:-}" ] && [ ! -f "$OPS_CONFIG_FILE" ]; then
    echo "Error: OPS_CONFIG_FILE points to '$OPS_CONFIG_FILE', but the file does not exist." >&2
    exit 1
fi

# --- Helper: normalize a YAML scalar value ---
# Strips inline "<space>#..." comments, trims surrounding whitespace, and
# removes surrounding single or double quotes. Only strips `#` preceded by
# whitespace, so literal `#` inside unquoted values is preserved.
_yaml_clean() {
    local v="$1"
    v=$(printf '%s' "$v" | sed 's/[[:space:]]\{1,\}#.*$//; s/^[[:space:]]*//; s/[[:space:]]*$//')
    case "$v" in
        \"*\") v="${v#\"}"; v="${v%\"}" ;;
        \'*\') v="${v#\'}"; v="${v%\'}" ;;
    esac
    printf '%s' "$v"
}

# --- Helper: read a simple "key: value" from config.yaml (root level) ---
# Matches exact key at start of line (not indented = not nested).
# Returns the cleaned value (comments/quotes stripped), or empty if not found.
yaml_get_root() {
    local key="$1"
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    # grep may return 1 (no match), which pipefail would treat as error.
    # Use "|| true" on the full pipeline to avoid that.
    local raw
    raw=$(grep -E "^${key}:" "$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/^[^:]*:[[:space:]]*//' || true)
    _yaml_clean "$raw"
}

# --- Helper: read a value from a targets.<target>.<field> block ---
# Parses the targets section using awk to find nested values.
# Usage: yaml_get_target <target> <field>
# Example: yaml_get_target "codex" "enabled" -> reads targets.codex.enabled
#
# NOTE: Expects 2-space YAML indentation (target headers at depth ≤ 2,
# fields at depth > 2). Tabs or unusual indentation will not parse.
yaml_get_target() {
    local target="$1"
    local field="$2"
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    local raw
    raw=$(awk -v target="$target" -v field="$field" '
        /^targets:/ { in_targets=1; next }
        /^[a-zA-Z]/ && in_targets { exit }  # Next root-level key
        !in_targets { next }
        # We are inside the targets: block.
        # Detect indentation depth to distinguish target headers (2-space)
        # from target fields (4-space).
        {
            line = $0
            gsub(/^[[:space:]]+/, "", line)  # strip for parsing
            if (substr(line, 1, 1) == "#") next  # skip comments

            # Count leading spaces on original line
            depth = 0
            for (i = 1; i <= length($0); i++) {
                if (substr($0, i, 1) == " ") depth++
                else break
            }
        }
        # Target header level (typically 2 spaces): "  codex:"
        depth <= 2 && line ~ /^[a-zA-Z]/ {
            if (line ~ "^" target ":") {
                in_target = 1
            } else if (in_target) {
                exit  # Hit next sibling target
            }
            next
        }
        # Field level (typically 4 spaces): "    enabled: true"
        in_target && depth > 2 && line ~ /^[a-zA-Z]/ {
            colon = index(line, ":")
            if (colon > 0) {
                k = substr(line, 1, colon - 1)
                v = substr(line, colon + 1)
                gsub(/^[[:space:]]+/, "", v)
                gsub(/[[:space:]]+$/, "", v)
                gsub(/[[:space:]]+$/, "", k)
                if (k == field) {
                    print v
                    exit
                }
            }
        }
    ' "$CONFIG_FILE")
    _yaml_clean "$raw"
}

# --- Helper: expand leading ~ in a path ---
expand_home() {
    local p="$1"
    printf '%s' "${p/#\~/$HOME}"
}

# --- Helper: is a target enabled given a tri-state value and its home dir ---
# Returns 0 (enabled) or 1 (disabled).
# <state> accepts: true|1|yes, false|0|no, auto (= enabled iff <home> exists).
# Case-insensitive for robustness with env vars.
is_enabled() {
    local state
    state="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
    local home="$2"
    case "$state" in
        true|1|yes) return 0 ;;
        false|0|no) return 1 ;;
        auto|"")    [ -d "$home" ] && return 0 || return 1 ;;
        *)
            echo "  Warning: unknown enabled value '$1', treating as 'auto'" >&2
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
OPENCODE_HOME_RAW=$(yaml_get_target "opencode" "home")
OPENCODE_HOME_RAW="${OPENCODE_HOME_RAW:-$HOME/.config/opencode}"
OPENCODE_HOME="${OPS_OPENCODE_HOME:-$OPENCODE_HOME_RAW}"
OPENCODE_HOME=$(expand_home "$OPENCODE_HOME")

# Codex
CODEX_HOME_RAW=$(yaml_get_target "codex" "home")
CODEX_HOME_RAW="${CODEX_HOME_RAW:-$HOME/.codex}"
CODEX_HOME="${OPS_CODEX_HOME:-$CODEX_HOME_RAW}"
CODEX_HOME=$(expand_home "$CODEX_HOME")
CODEX_STATE_RAW=$(yaml_get_target "codex" "enabled")
CODEX_STATE_RAW="${CODEX_STATE_RAW:-auto}"
CODEX_STATE="${OPS_SYNC_CODEX:-$CODEX_STATE_RAW}"

# Claude Code
CLAUDE_HOME_RAW=$(yaml_get_target "claude" "home")
CLAUDE_HOME_RAW="${CLAUDE_HOME_RAW:-$HOME/.claude}"
CLAUDE_HOME="${OPS_CLAUDE_HOME:-$CLAUDE_HOME_RAW}"
CLAUDE_HOME=$(expand_home "$CLAUDE_HOME")
CLAUDE_STATE_RAW=$(yaml_get_target "claude" "enabled")
CLAUDE_STATE_RAW="${CLAUDE_STATE_RAW:-auto}"
CLAUDE_STATE="${OPS_SYNC_CLAUDE:-$CLAUDE_STATE_RAW}"

# Antigravity detection path (test-only override; not a yaml target).
# Default is the macOS app-support path — Antigravity is currently macOS-only.
# Override with OPS_ANTIGRAVITY_PATH for tests or future non-macOS support.
ANTIGRAVITY_PATH="${OPS_ANTIGRAVITY_PATH:-$HOME/Library/Application Support/Antigravity}"

# --- Build installation target arrays ---
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

# --- Project mode override ---
if [ "$PROJECT_MODE" = true ]; then
    PROJECT_HOME="$PWD/.opencode"
    echo "Project mode: installing into $PROJECT_HOME"
    echo ""
    SKILLS_DESTS=("$PROJECT_HOME/skills")
    AGENTS_DESTS=("$PROJECT_HOME/agents")
    # In project mode, skip Codex/Claude sync — only OpenCode structure
fi

echo ""

# --- Helper: read model for an agent from config.yaml ---
# Returns the model string, or empty if not configured.
# Uses grep on root-level keys — works correctly for hyphenated names like doc-explorer.
get_model_for_agent() {
    local agent_name="$1"
    yaml_get_root "$agent_name"
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

# --- Helper: parse additional_delegates from config.yaml ---
# Returns lines of "suffix model" pairs
get_additional_delegates() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    awk '
        /^additional_delegates:/ { in_section=1; next }
        /^[a-zA-Z]/ && in_section { exit }  # Next root-level key
        in_section && /^[[:space:]]+[a-zA-Z]/ {
            gsub(/^[[:space:]]+/, "")
            if (substr($0, 1, 1) == "#") next
            colon = index($0, ":")
            if (colon > 0) {
                suffix = substr($0, 1, colon - 1)
                model = substr($0, colon + 1)
                gsub(/^[[:space:]]+/, "", model)
                gsub(/[[:space:]]+$/, "", model)
                # Strip inline comments (e.g. "azure/gpt-5.3-codex   # Code-specialized")
                comment = index(model, "#")
                if (comment > 0) {
                    model = substr(model, 1, comment - 1)
                    gsub(/[[:space:]]+$/, "", model)
                }
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

    # Symlink safety: same check as main install loops
    if [ -L "$dest" ]; then
        echo "  Symlink (skipping): delegate-${suffix}.md"
        return
    fi

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
        cp -R "$skill_dir/." "$dest/"
    done
    echo ""
done

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

# --- Step 3: Create additional delegate variants ---
if [ -f "$CONFIG_FILE" ]; then
    additional=$(get_additional_delegates)
    if [ -n "$additional" ]; then
        echo "Step 3: Creating additional delegate variants"
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
