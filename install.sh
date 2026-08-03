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
#   - OpenCode   -> OPENCODE_HOME/{skills,agents,plugins,lib}  (always on)
#   - Codex      -> CODEX_HOME/skills              (skills + agent-checkpoint
#                                                   MCP/hooks adapter profile)
#   - Claude     -> CLAUDE_HOME/{skills,agents}    (also serves Antigravity
#                                                   via anthropic.claude-code ext;
#                                                   plus agent-checkpoint plugin
#                                                   + opt-in settings file)
#   - Cursor     -> CURSOR_HOME/skills              (workflow skills, same as OpenCode)
#                   + subagents/, ops/, orchestrator skills from cursor/
#   - Hermes     -> HERMES_HOME/skills/processing   (skills in a namespaced
#                   category dir) + HERMES_HOME/plugins/agent-checkpoint/
#                   (checkpoint plugin, documented opt-in enablement)
#
# Environment overrides (OPS_ prefix avoids collisions with tool-native vars):
#   OPS_OPENCODE_HOME       override OpenCode home
#   OPS_CODEX_HOME          override Codex home
#   OPS_CLAUDE_HOME         override Claude Code home
#   OPS_CURSOR_HOME         override Cursor home
#   OPS_HERMES_HOME         override Hermes home
#   OPS_SYNC_CODEX          true|false|auto — override targets.codex.enabled
#   OPS_SYNC_CLAUDE         true|false|auto — override targets.claude.enabled
#   OPS_SYNC_CURSOR         true|false|auto — override targets.cursor.enabled
#   OPS_SYNC_HERMES         true|false|auto — override targets.hermes.enabled
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

# --- Helper: portable in-place sed (GNU/BSD) ---
sed_inplace() {
    local script="$1"
    local file="$2"
    if sed --version >/dev/null 2>&1; then
        sed -i "$script" "$file"
    else
        sed -i '' "$script" "$file"
    fi
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

# Cursor
CURSOR_HOME_RAW=$(yaml_get_target "cursor" "home")
CURSOR_HOME_RAW="${CURSOR_HOME_RAW:-$HOME/.cursor}"
CURSOR_HOME="${OPS_CURSOR_HOME:-$CURSOR_HOME_RAW}"
CURSOR_HOME=$(expand_home "$CURSOR_HOME")
CURSOR_STATE_RAW=$(yaml_get_target "cursor" "enabled")
CURSOR_STATE_RAW="${CURSOR_STATE_RAW:-auto}"
CURSOR_STATE="${OPS_SYNC_CURSOR:-$CURSOR_STATE_RAW}"

# Hermes
HERMES_HOME_RAW=$(yaml_get_target "hermes" "home")
HERMES_HOME_RAW="${HERMES_HOME_RAW:-$HOME/.hermes}"
HERMES_HOME="${OPS_HERMES_HOME:-$HERMES_HOME_RAW}"
HERMES_HOME=$(expand_home "$HERMES_HOME")
HERMES_STATE_RAW=$(yaml_get_target "hermes" "enabled")
HERMES_STATE_RAW="${HERMES_STATE_RAW:-auto}"
HERMES_STATE="${OPS_SYNC_HERMES:-$HERMES_STATE_RAW}"

# Antigravity detection path (test-only override; not a yaml target).
# Default is the macOS app-support path — Antigravity is currently macOS-only.
# Override with OPS_ANTIGRAVITY_PATH for tests or future non-macOS support.
ANTIGRAVITY_PATH="${OPS_ANTIGRAVITY_PATH:-$HOME/Library/Application Support/Antigravity}"

# --- Build installation target arrays ---
SKILLS_DESTS=("$OPENCODE_HOME/skills")
AGENTS_DESTS=("$OPENCODE_HOME/agents")

codex_enabled=0
if is_enabled "$CODEX_STATE" "$CODEX_HOME"; then
    SKILLS_DESTS+=("$CODEX_HOME/skills")
    codex_enabled=1
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

if is_enabled "$CURSOR_STATE" "$CURSOR_HOME"; then
    SKILLS_DESTS+=("$CURSOR_HOME/skills")
    echo "Cursor integration: enabled (skills -> $CURSOR_HOME/skills)"
else
    echo "Cursor integration: disabled"
fi

# Hermes discovers SKILL.md files recursively under HERMES_HOME/skills/ and
# treats top-level directories there as categories. Install into a dedicated
# `processing` category dir so the curated Hermes skill tree stays tidy and
# this repo's footprint remains identifiable (and trivially removable).
hermes_enabled=0
HERMES_SKILLS_DEST="$HERMES_HOME/skills/processing"
if is_enabled "$HERMES_STATE" "$HERMES_HOME"; then
    SKILLS_DESTS+=("$HERMES_SKILLS_DEST")
    hermes_enabled=1
    echo "Hermes integration: enabled (skills -> $HERMES_SKILLS_DEST)"
else
    echo "Hermes integration: disabled"
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
CURSOR_TARGET_HOME=""
OPENCODE_TARGET_HOME="$OPENCODE_HOME"
if [ "$PROJECT_MODE" = true ]; then
    PROJECT_HOME="$PWD/.opencode"
    OPENCODE_TARGET_HOME="$PROJECT_HOME"
    echo "Project mode: installing into $PROJECT_HOME"
    echo ""
    SKILLS_DESTS=("$PROJECT_HOME/skills")
    AGENTS_DESTS=("$PROJECT_HOME/agents")
    if is_enabled "$CURSOR_STATE" "$CURSOR_HOME"; then
        CURSOR_TARGET_HOME="$PWD/.cursor"
        SKILLS_DESTS+=("$CURSOR_TARGET_HOME/skills")
        echo "Project mode: Cursor target -> $CURSOR_TARGET_HOME"
        echo ""
    fi
    # In project mode, skip Codex/Claude/Hermes global sync — only local OpenCode structure
elif is_enabled "$CURSOR_STATE" "$CURSOR_HOME"; then
    CURSOR_TARGET_HOME="$CURSOR_HOME"
fi

echo ""

# --- Helper: read model for an agent from config.yaml ---
# Returns the model string, or empty if not configured.
# Uses grep on root-level keys — works correctly for hyphenated names like doc-explorer.
get_model_for_agent() {
    local config
    config=$(get_agent_config "$1" 2>/dev/null)
    echo "${config%% *}"
}

# --- Helper: read model + options for a root-level agent key from config.yaml ---
# Output format: "model [key=val ...]" (space-separated)
# Supports both scalar and object syntax:
#   delegate: provider/model
#   delegate:
#     model: provider/model
#     reasoningEffort: high
get_agent_config() {
    local agent_name="$1"
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi

    awk -v agent_name="$agent_name" '
        function ltrim(s) { sub(/^[[:space:]]+/, "", s); return s }
        function rtrim(s) { sub(/[[:space:]]+$/, "", s); return s }
        function trim(s)  { return rtrim(ltrim(s)) }

        function strip_inline_comment(s,    i, ch, out, in_sq, in_dq, prev) {
            out = ""
            in_sq = 0
            in_dq = 0
            prev = ""

            for (i = 1; i <= length(s); i++) {
                ch = substr(s, i, 1)

                if (ch == "\"" && !in_sq && prev != "\\") in_dq = !in_dq
                else if (ch == "\x27" && !in_dq && prev != "\\") in_sq = !in_sq

                if (ch == "#" && !in_sq && !in_dq) {
                    if (i == 1 || substr(s, i - 1, 1) ~ /[[:space:]]/) break
                }

                out = out ch
                prev = ch
            }

            return rtrim(out)
        }

        function unquote(s,    q) {
            s = trim(s)
            if (length(s) >= 2) {
                q = substr(s, 1, 1)
                if ((q == "\"" || q == "\x27") && substr(s, length(s), 1) == q) {
                    s = substr(s, 2, length(s) - 2)
                }
            }
            return s
        }

        BEGIN {
            in_block = 0
            model = ""
            opts = ""
        }

        {
            line = $0

            if (!in_block) {
                if (line ~ ("^" agent_name ":[[:space:]]*")) {
                    rest = substr(line, length(agent_name) + 2)
                    rest = strip_inline_comment(rest)
                    rest = trim(rest)

                    # Scalar syntax: agent: provider/model
                    if (rest != "") {
                        model = unquote(rest)
                        if (model != "") print model
                        exit
                    }

                    # Object syntax starts on following indented lines
                    in_block = 1
                }
                next
            }

            # End of object block at next root-level key
            if (line ~ /^[^[:space:]#][^:]*:[[:space:]]*/) {
                if (model != "") {
                    out = model
                    if (opts != "") out = out " " opts
                    print out
                }
                in_block = 0  # Prevent END block from printing again
                exit
            }

            # Skip empty/comment lines inside block
            if (line ~ /^[[:space:]]*$/ || line ~ /^[[:space:]]*#/) next

            # Object entries must be indented
            if (line ~ /^[^[:space:]]/) next

            entry = line
            sub(/^[[:space:]]+/, "", entry)

            colon = index(entry, ":")
            if (colon == 0) next

            key = substr(entry, 1, colon - 1)
            val = substr(entry, colon + 1)
            key = rtrim(key)
            val = strip_inline_comment(val)
            val = unquote(val)

            # Ignore nested object/list fields for options output
            if (val == "") next

            if (key == "model") model = val
            else opts = (opts == "" ? key "=" val : opts " " key "=" val)
        }

        END {
            if (in_block && model != "") {
                out = model
                if (opts != "") out = out " " opts
                print out
            }
        }
    ' "$CONFIG_FILE"
}

# --- Helper: inject model and options into agent frontmatter ---
# Writes "model: <model>" and optionally "options:" block after the description line.
# Also handles removal if model is empty.
# Usage: inject_agent_config <file> <model> [options_str]
#   options_str format: "key1=val1 key2=val2" (space-separated key=value pairs)
inject_agent_config() {
    local file="$1"
    local model="$2"
    local options_str="${3:-}"
    local tmp_file
    tmp_file="$(mktemp)"

    awk -v model="$model" -v options_str="$options_str" '
        BEGIN {
            in_options = 0
            n_opts = 0
            if (options_str != "") {
                n_opts = split(options_str, opts, " ")
            }
        }
        {
            # Remove existing model line.
            if ($0 ~ /^model:[[:space:]]*/) next

            # Remove existing options block.
            if (in_options) {
                if ($0 ~ /^[a-z][a-zA-Z0-9_-]*:[[:space:]]*/) {
                    in_options = 0
                } else {
                    next
                }
            }
            if ($0 ~ /^options:[[:space:]]*$/) {
                in_options = 1
                next
            }

            print $0

            # Insert model/options directly after description.
            if ($0 ~ /^description:/) {
                if (model != "") {
                    print "model: " model
                }
                if (n_opts > 0) {
                    print "options:"
                    for (i = 1; i <= n_opts; i++) {
                        if (opts[i] == "") continue
                        split(opts[i], kv, "=")
                        key = kv[1]
                        val = substr(opts[i], length(key) + 2)
                        print "  " key ": " val
                    }
                }
            }
        }
    ' "$file" > "$tmp_file"

    cat "$tmp_file" > "$file"
    rm "$tmp_file"
}

# --- Helper: parse additional_delegates from config.yaml ---
# Returns lines of "suffix model [key=val ...]"
# Supports both scalar (fast: provider/model) and object syntax:
#   fast:
#     model: provider/model
#     reasoningEffort: high
get_additional_delegates() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    awk '
        function flush() {
            if (cur_suffix != "" && cur_model != "") {
                gsub(/^[[:space:]]+/, "", cur_opts)
                print cur_suffix, cur_model, cur_opts
            }
            cur_suffix = ""; cur_model = ""; cur_opts = ""; in_obj = 0
        }
        /^additional_delegates:/ { in_section=1; next }
        /^[a-zA-Z]/ && in_section { flush(); exit }
        !in_section { next }
        {
            line = $0
            depth = 0
            for (i = 1; i <= length(line); i++) {
                if (substr(line, i, 1) == " ") depth++
                else break
            }
            gsub(/^[[:space:]]+/, "")
            if (substr($0, 1, 1) == "#") next

            colon = index($0, ":")
            if (colon == 0) next
            key = substr($0, 1, colon - 1)
            val = substr($0, colon + 1)
            gsub(/^[[:space:]]+/, "", val)
            gsub(/[[:space:]]+$/, "", key)

            cpos = index(val, "#")
            if (cpos > 0) {
                val = substr(val, 1, cpos - 1)
                gsub(/[[:space:]]+$/, "", val)
            }

            if (depth <= 4 && val == "") {
                # Object header: new suffix — flush previous first
                flush()
                cur_suffix = key
                in_obj = 1
                next
            }
            if (in_obj && depth >= 4) {
                # Inside object: collect fields
                if (key == "model") cur_model = val
                else if (val != "") cur_opts = cur_opts " " key "=" val
                next
            }
            if (depth <= 4 && val != "" && val ~ /\//) {
                # Scalar: suffix model
                flush()
                cur_suffix = key
                cur_model = val
                in_obj = 0
            }
        }
        END { flush() }
    ' "$CONFIG_FILE"
}

# --- Helper: parse additional_implementers from config.yaml ---
# Returns lines of "suffix model [key=val ...]"
# Same format and rules as get_additional_delegates
get_additional_implementers() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    awk '
        function flush() {
            if (cur_suffix != "" && cur_model != "") {
                gsub(/^[[:space:]]+/, "", cur_opts)
                print cur_suffix, cur_model, cur_opts
            }
            cur_suffix = ""; cur_model = ""; cur_opts = ""; in_obj = 0
        }
        /^additional_implementers:/ { in_section=1; next }
        /^[a-zA-Z]/ && in_section { flush(); exit }
        !in_section { next }
        {
            line = $0
            depth = 0
            for (i = 1; i <= length(line); i++) {
                if (substr(line, i, 1) == " ") depth++
                else break
            }
            gsub(/^[[:space:]]+/, "")
            if (substr($0, 1, 1) == "#") next

            colon = index($0, ":")
            if (colon == 0) next
            key = substr($0, 1, colon - 1)
            val = substr($0, colon + 1)
            gsub(/^[[:space:]]+/, "", val)
            gsub(/[[:space:]]+$/, "", key)

            cpos = index(val, "#")
            if (cpos > 0) {
                val = substr(val, 1, cpos - 1)
                gsub(/[[:space:]]+$/, "", val)
            }

            if (depth <= 4 && val == "") {
                flush()
                cur_suffix = key
                in_obj = 1
                next
            }
            if (in_obj && depth >= 4) {
                if (key == "model") cur_model = val
                else if (val != "") cur_opts = cur_opts " " key "=" val
                next
            }
            if (depth <= 4 && val != "" && val ~ /\//) {
                flush()
                cur_suffix = key
                cur_model = val
                in_obj = 0
            }
        }
        END { flush() }
    ' "$CONFIG_FILE"
}

# --- Helper: create a delegate variant from the delegate template ---
create_delegate_variant() {
    local suffix="$1"
    local model="$2"
    local agents_dest="$3"
    local options_str="$4"
    local template="$SCRIPT_DIR/agents/delegate.md"
    local dest="$agents_dest/delegate-${suffix}.md"

    # Symlink safety: same check as main install loops
    if [ -L "$dest" ]; then
        echo "  Symlink (skipping): delegate-${suffix}.md"
        return
    fi

    cp "$template" "$dest"

    sed_inplace "s|^description:.*|description: Model alias '${suffix}' of the canonical delegate persona, using ${model}.|" "$dest"
    sed_inplace "s|^# Delegate.*|# Delegate (${suffix})|" "$dest"

    inject_agent_config "$dest" "$model" "$options_str"

    local opts_note=""
    [ -n "$options_str" ] && opts_note=", options: $options_str"
    echo "  Generated: delegate-${suffix}.md -> model: $model${opts_note}"
}

# --- Helper: parse additional_implementers from config.yaml ---
# Returns lines of "suffix model [key=val ...]"
# Same format and rules as get_additional_delegates
get_additional_implementers() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    awk '
        function flush() {
            if (cur_suffix != "" && cur_model != "") {
                gsub(/^[[:space:]]+/, "", cur_opts)
                print cur_suffix, cur_model, cur_opts
            }
            cur_suffix = ""; cur_model = ""; cur_opts = ""; in_obj = 0
        }
        /^additional_implementers:/ { in_section=1; next }
        /^[a-zA-Z]/ && in_section { flush(); exit }
        !in_section { next }
        {
            line = $0
            depth = 0
            for (i = 1; i <= length(line); i++) {
                if (substr(line, i, 1) == " ") depth++
                else break
            }
            gsub(/^[[:space:]]+/, "")
            if (substr($0, 1, 1) == "#") next

            colon = index($0, ":")
            if (colon == 0) next
            key = substr($0, 1, colon - 1)
            val = substr($0, colon + 1)
            gsub(/^[[:space:]]+/, "", val)
            gsub(/[[:space:]]+$/, "", key)

            cpos = index(val, "#")
            if (cpos > 0) {
                val = substr(val, 1, cpos - 1)
                gsub(/[[:space:]]+$/, "", val)
            }

            if (depth <= 4 && val == "") {
                flush()
                cur_suffix = key
                in_obj = 1
                next
            }
            if (in_obj && depth >= 4) {
                if (key == "model") cur_model = val
                else if (val != "") cur_opts = cur_opts " " key "=" val
                next
            }
            if (depth <= 4 && val != "" && val ~ /\//) {
                # Scalar: suffix model
                flush()
                cur_suffix = key
                cur_model = val
                in_obj = 0
            }
        }
        END { flush() }
    ' "$CONFIG_FILE"
}

# --- Helper: create an implementer variant from the implementer template ---
create_implementer_variant() {
    local suffix="$1"
    local model="$2"
    local agents_dest="$3"
    local options_str="$4"
    local template="$SCRIPT_DIR/agents/implementer.md"
    local dest="$agents_dest/implementer-${suffix}.md"

    # Symlink safety: same check as main install loops
    if [ -L "$dest" ]; then
        echo "  Symlink (skipping): implementer-${suffix}.md"
        return
    fi

    cp "$template" "$dest"

    sed_inplace "s|^description:.*|description: Implementer variant '${suffix}' with model ${model}. Use for specific implementation needs.|" "$dest"
    sed_inplace "s|^# Implementer.*|# Implementer (${suffix})|" "$dest"

    inject_agent_config "$dest" "$model" "$options_str"

    local opts_note=""
    [ -n "$options_str" ] && opts_note=", options: $options_str"
    echo "  Generated: implementer-${suffix}.md -> model: $model${opts_note}"
}

# --- Cursor target: subagents, ops bootstrap, orchestrator skills ---
CURSOR_SUBAGENT_NAMES=(delegate doc-explorer implementer legacy-curator)

cursor_strip_frontmatter() {
    awk 'BEGIN { in_fm=0; fm_done=0 }
        /^---$/ { if (!fm_done) { in_fm = !in_fm; if (!in_fm) fm_done=1; next } }
        fm_done { print }' "$1"
}

cursor_install_subagents() {
    local script_dir="$1"
    local cursor_home="$2"
    local dest="$cursor_home/subagents"
    local name agent_file out

    echo "  Subagents -> $dest"
    mkdir -p "$dest"

    for name in "${CURSOR_SUBAGENT_NAMES[@]}"; do
        agent_file="$script_dir/agents/${name}.md"
        out="$dest/${name}.md"
        if [ ! -f "$agent_file" ]; then
            echo "    Warning: missing $agent_file (skipping)" >&2
            continue
        fi
        if [ -L "$out" ]; then
            echo "    Symlink (skipping): ${name}.md"
            continue
        fi
        cursor_strip_frontmatter "$agent_file" > "$out"
        echo "    Installed: ${name}.md"
    done
}

cursor_install_ops_bootstrap() {
    local script_dir="$1"
    local cursor_home="$2"
    local src="$script_dir/cursor/AGENTS.snippet.md"
    local dest="$cursor_home/ops/AGENTS.snippet.md"

    if [ ! -f "$src" ]; then
        echo "  Warning: $src not found (skipping ops bootstrap)" >&2
        return
    fi
    if [ -L "$dest" ]; then
        echo "  Symlink (skipping): ops/AGENTS.snippet.md"
        return
    fi
    mkdir -p "$cursor_home/ops"
    cp "$src" "$dest"
    echo "  Ops bootstrap -> $dest"
}

cursor_install_orchestrator_skills() {
    local script_dir="$1"
    local cursor_home="$2"
    local skills_dest="$cursor_home/skills"
    local skill_dir skill_name dest task_src

    echo "  Orchestrator skills -> $skills_dest"
    mkdir -p "$skills_dest"

    for skill_dir in "$script_dir/cursor/skills"/*/; do
        [ -d "$skill_dir" ] || continue
        skill_name="$(basename "$skill_dir")"
        dest="$skills_dest/$skill_name"

        if [ -L "$dest" ]; then
            echo "    Symlink (skipping): $skill_name"
            continue
        fi
        if [ -d "$dest" ]; then
            echo "    Updating: $skill_name"
            rm -rf "$dest"
        else
            echo "    Installing: $skill_name"
        fi
        mkdir -p "$dest"
        cp -R "$skill_dir/." "$dest/"

        task_src="$script_dir/cursor/task-delegation.md"
        if [ -f "$task_src" ]; then
            cp "$task_src" "$dest/task-delegation.md"
        fi
    done
}

cursor_install_project_rule() {
    local script_dir="$1"
    local cursor_home="$2"
    local src="$script_dir/cursor/tpl-orchestrator.mdc"
    local dest="$cursor_home/rules/ops-orchestrator.mdc"

    if [ ! -f "$src" ]; then
        return
    fi
    if [ -L "$dest" ]; then
        echo "  Symlink (skipping): rules/ops-orchestrator.mdc"
        return
    fi
    mkdir -p "$cursor_home/rules"
    cp "$src" "$dest"
    echo "  Project rule -> $dest"
}

cursor_install_extras() {
    local script_dir="$1"
    local cursor_home="$2"
    local project_mode="$3"

    cursor_install_subagents "$script_dir" "$cursor_home"
    cursor_install_ops_bootstrap "$script_dir" "$cursor_home"
    cursor_install_orchestrator_skills "$script_dir" "$cursor_home"
    if [ "$project_mode" = true ]; then
        cursor_install_project_rule "$script_dir" "$cursor_home"
    fi
}

install_opencode_checkpoint_file() {
    local source="$1"
    local dest="$2"
    local label="$3"

    if [ -L "$dest" ]; then
        echo "  Symlink (skipping): $label"
        return
    fi
    cp "$source" "$dest"
    echo "  Installed: $label"
}

CHECKPOINT_WATCH_NATIVE_PATH=""

install_optional_native_checkpoint_watch() (
    local native_dir="$HOME/.local/bin"
    local native_dest="$native_dir/checkpoint-watch"
    local stage=""
    local live_pid=""
    local atomic_temp=""

    cleanup_native_checkpoint_watch() {
        if [ -n "$live_pid" ] && kill -0 "$live_pid" 2>/dev/null; then
            kill -TERM "$live_pid" 2>/dev/null || true
            sleep 0.05
            if kill -0 "$live_pid" 2>/dev/null; then
                kill -KILL "$live_pid" 2>/dev/null || true
            fi
            wait "$live_pid" 2>/dev/null || true
        fi
        [ -z "$atomic_temp" ] || rm -f "$atomic_temp"
        [ -z "$stage" ] || rm -rf "$stage"
    }

    native_fallback() {
        echo "  Native watcher unavailable: $1; using installed Node fallback."
        return 1
    }

    wait_for_native_output() {
        local output_file="$1"
        local expected="$2"
        local attempt=0
        while [ "$attempt" -lt 100 ]; do
            if grep -Fq "$expected" "$output_file" 2>/dev/null; then
                return 0
            fi
            if [ -n "$live_pid" ] && ! kill -0 "$live_pid" 2>/dev/null; then
                return 1
            fi
            sleep 0.05
            attempt=$((attempt + 1))
        done
        return 1
    }

    trap cleanup_native_checkpoint_watch EXIT INT TERM

    if [ -L "$native_dest" ]; then
        native_fallback "preserving user-managed symlink $native_dest"
        return 1
    fi
    if ! command -v scriptc >/dev/null 2>&1; then
        native_fallback "scriptc was not found"
        return 1
    fi
    if ! stage="$(mktemp -d "${TMPDIR:-/tmp}/checkpoint-watch-native.XXXXXX")"; then
        native_fallback "could not create disposable build staging"
        return 1
    fi
    if ! mkdir -p "$stage/bin" "$stage/src" "$stage/once/.agent-checkpoints" "$stage/live/.agent-checkpoints"; then
        native_fallback "could not prepare disposable build staging"
        return 1
    fi
    if ! cp "$SCRIPT_DIR/packages/checkpoint-core/bin/checkpoint-watch.js" "$stage/bin/checkpoint-watch.js" \
        || ! cp "$SCRIPT_DIR/packages/checkpoint-core/src/index.js" "$stage/src/index.js"; then
        native_fallback "could not stage watcher sources"
        return 1
    fi
    if ! scriptc coverage "$stage/bin/checkpoint-watch.js" >"$stage/coverage.txt" 2>&1; then
        native_fallback "scriptc coverage failed"
        return 1
    fi
    if grep -q "SC2002" "$stage/coverage.txt" \
        || grep -Eq "Number of unknown values.*SC2020|SC2020.*Number of unknown values" "$stage/coverage.txt"; then
        native_fallback "scriptc coverage retained a required-path type fence"
        return 1
    fi
    if ! scriptc build "$stage/bin/checkpoint-watch.js" -o "$stage/checkpoint-watch" --no-keep-c \
        >"$stage/build.txt" 2>&1; then
        native_fallback "scriptc build failed"
        return 1
    fi
    if [ ! -x "$stage/checkpoint-watch" ]; then
        native_fallback "scriptc did not produce an executable"
        return 1
    fi
    if ! "$stage/checkpoint-watch" --help >"$stage/help.txt" 2>"$stage/help.err" \
        || ! grep -Fq "Usage: checkpoint-watch" "$stage/help.txt"; then
        native_fallback "native --help smoke failed"
        return 1
    fi
    if ! (cd "$stage/once" && ../checkpoint-watch --once >"$stage/once.txt" 2>"$stage/once.err"); then
        local once_error=""
        IFS= read -r once_error < "$stage/once.err" || true
        native_fallback "native --once smoke failed${once_error:+: $once_error}"
        return 1
    fi
    if ! grep -Fq "Checkpoint sessions" "$stage/once.txt"; then
        native_fallback "native --once smoke produced no dashboard"
        return 1
    fi

    (
        cd "$stage/live"
        exec env CHECKPOINT_WATCH_REFRESH_MS=60000 ../checkpoint-watch \
            </dev/null >"$stage/live.txt" 2>"$stage/live.err"
    ) &
    live_pid=$!
    if ! wait_for_native_output "$stage/live.txt" "Checkpoint sessions"; then
        native_fallback "native live startup failed"
        return 1
    fi
    sleep 0.2
    local marker_timestamp
    marker_timestamp="$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')"
    printf '%s\n' \
        "{\"timestamp\":\"$marker_timestamp\",\"session_id\":\"native-installer-smoke\",\"done\":\"Native refresh observed\",\"next\":\"Continue Node fallback\",\"step_failed\":false,\"context_used\":null,\"agent\":\"installer\",\"session_title\":\"native-refresh\"}" \
        > "$stage/live/.agent-checkpoints/native-installer-smoke.jsonl"
    if ! wait_for_native_output "$stage/live.txt" "native-refresh"; then
        native_fallback "native live filesystem refresh failed"
        return 1
    fi
    if ! kill -TERM "$live_pid" 2>/dev/null; then
        native_fallback "native live signal failed"
        return 1
    fi
    if ! wait "$live_pid"; then
        live_pid=""
        native_fallback "native live exit failed"
        return 1
    fi
    live_pid=""
    if ! grep -Fq "$(printf '\033[?25h')" "$stage/live.txt"; then
        native_fallback "native live cursor restoration failed"
        return 1
    fi

    if ! mkdir -p "$native_dir"; then
        native_fallback "could not create $native_dir"
        return 1
    fi
    if ! atomic_temp="$(mktemp "$native_dir/.checkpoint-watch.XXXXXX")"; then
        native_fallback "could not create atomic destination staging"
        return 1
    fi
    if ! cp "$stage/checkpoint-watch" "$atomic_temp" || ! chmod 755 "$atomic_temp"; then
        native_fallback "could not prepare atomic executable"
        return 1
    fi
    if ! mv -f "$atomic_temp" "$native_dest"; then
        native_fallback "could not atomically install $native_dest"
        return 1
    fi
    atomic_temp=""
    echo "  Native watcher installed: $native_dest"
    return 0
)

required_checkpoint_reader_symlink_error() {
    local dest="$1"
    local label="$2"

    echo "ERROR: required checkpoint reader/core is a symlink: $dest ($label)" >&2
    echo "Update the user-managed symlink target to the compatible checkpoint reader/core, or deliberately remove/replace the symlink, then rerun install.sh." >&2
    return 1
}

preflight_required_checkpoint_reader() {
    local dest="$1"
    local label="$2"

    if [ -L "$dest" ]; then
        required_checkpoint_reader_symlink_error "$dest" "$label"
    fi
}

preflight_required_checkpoint_reader_components() {
    local base="$1"
    local relative_path="$2"
    local label="$3"
    local component
    local candidate="$base"
    local -a components

    IFS='/' read -r -a components <<< "$relative_path"
    for component in "${components[@]}"; do
        [ -n "$component" ] || continue
        candidate="${candidate%/}/$component"
        preflight_required_checkpoint_reader "$candidate" "$label"
    done
}

preflight_checkpoint_reader_dependencies() {
    local target_home="$1"

    preflight_required_checkpoint_reader_components \
        "$target_home" \
        "lib/opencode-processing-skills/checkpoint-core.mjs" \
        "OpenCode shared checkpoint core"
    preflight_required_checkpoint_reader_components \
        "$target_home" \
        "lib/opencode-processing-skills/checkpoint-watch" \
        "OpenCode checkpoint watcher tree"
    preflight_required_checkpoint_reader_components \
        "$target_home" \
        "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js" \
        "OpenCode checkpoint watcher executable"
    preflight_required_checkpoint_reader_components \
        "$target_home" \
        "lib/opencode-processing-skills/checkpoint-watch/src/index.js" \
        "OpenCode checkpoint watcher core"

    if [ "$PROJECT_MODE" = false ] && [ "$codex_enabled" = "1" ]; then
        local adapter_dir="$CODEX_HOME/agent-checkpoint"
        preflight_required_checkpoint_reader \
            "$adapter_dir" \
            "Codex user-managed adapter directory with bundled core"
        preflight_required_checkpoint_reader \
            "$adapter_dir/checkpoint-core.mjs" \
            "Codex bundled checkpoint core"
    fi

    if [ "$PROJECT_MODE" = false ] && [ "$claude_enabled" = "1" ]; then
        preflight_required_checkpoint_reader_components \
            "$CLAUDE_HOME" \
            "skills/agent-checkpoint/server/checkpoint-core.mjs" \
            "Claude bundled checkpoint core"
    fi
}

install_opencode_checkpoint() {
    local target_home="$1"
    local support_dir="$target_home/lib/opencode-processing-skills"
    local watch_dir="$support_dir/checkpoint-watch"

    echo "Step 5: Installing OpenCode checkpoint plugin to $target_home"
    mkdir -p "$target_home/plugins" "$support_dir"

    install_opencode_checkpoint_file \
        "$SCRIPT_DIR/packages/checkpoint-core/src/index.js" \
        "$support_dir/checkpoint-core.mjs" \
        "lib/opencode-processing-skills/checkpoint-core.mjs"
    if [ -L "$watch_dir" ]; then
        echo "  Symlink (skipping): lib/opencode-processing-skills/checkpoint-watch"
    else
        mkdir -p "$watch_dir/bin" "$watch_dir/src"
        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/packages/checkpoint-core/bin/checkpoint-watch.js" \
            "$watch_dir/bin/checkpoint-watch.js" \
            "lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js"
        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/packages/checkpoint-core/src/index.js" \
            "$watch_dir/src/index.js" \
            "lib/opencode-processing-skills/checkpoint-watch/src/index.js"
    fi
    if [ "$PROJECT_MODE" = false ]; then
        if install_optional_native_checkpoint_watch; then
            CHECKPOINT_WATCH_NATIVE_PATH="$HOME/.local/bin/checkpoint-watch"
        fi
    fi
    install_opencode_checkpoint_file \
        "$SCRIPT_DIR/opencode/checkpoint-runtime.mjs" \
        "$support_dir/checkpoint-runtime.mjs" \
        "lib/opencode-processing-skills/checkpoint-runtime.mjs"
    install_opencode_checkpoint_file \
        "$SCRIPT_DIR/opencode/checkpoint-plugin.ts" \
        "$target_home/plugins/checkpoint.ts" \
        "plugins/checkpoint.ts"
    echo ""
}

install_opencode_checkpoint_instruction() {
    local target_home="$1"
    local agents_dir="$target_home/agents"
    local fragment="$SCRIPT_DIR/opencode/checkpoint-instruction.md"
    local marker="<!-- opencode-checkpoint-instruction -->"
    local previous_input_fragment previous_current_fragment legacy_fragment initial_legacy_fragment current_length
    local agent_file marker_matches marker_count marker_offset replacement
    local candidate candidate_length matched_legacy matched_length

    previous_input_fragment="$(mktemp "${TMPDIR:-/tmp}/opencode-checkpoint-previous-input.XXXXXX")"
    cat > "$previous_input_fragment" <<'EOF'
<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful, role-appropriate bounded units and call `checkpoint` after each completed or failed unit, not after every tiny action. Follow any more specific role cadence. Write `done` and `next` as exactly three words, and reuse the previous `next` text verbatim as the following `done`.

Where possible, include `checkpoint` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as `done`, set `step_failed=true`, and make `next` the corrective step. This records work progress and is not itself a Canary failure.

Checkpoint feedback may describe the previous completed step or latest harness snapshot and therefore lag the active turn. Treat unknown telemetry as unknown. Before deliberately starting another context-heavy unit, consider the latest feedback, remaining work, and available headroom.

Approximately 75% context use and approximately 220k used tokens are soft planning signals only, never stop conditions. Continuing toward approximately 300k used tokens is acceptable when the remaining work is bounded. Do not deliberately open another context-heavy branch without first assessing the remaining work and headroom. If continued work is no longer controlled, complete the current bounded unit, write a final checkpoint, and return a compact handoff stating progress and the next announced step.

Checkpointing records progress but does not prove work quality.

Every successful checkpoint lazily confirms the persisted session as open. `close_session` defaults to `false`. A subagent sets `close_session=true` only on its final checkpoint immediately before returning a digest, summary, or handoff. A Maintainer or parent leaves it false unless intentionally ending the whole persisted session.

Closure is independent of `step_failed` and does not prove work succeeded. An interrupted session or missing final call remains open; any later checkpoint confirms it open again.

<!-- /opencode-checkpoint-instruction -->
EOF
    previous_current_fragment="$(mktemp "${TMPDIR:-/tmp}/opencode-checkpoint-previous-current.XXXXXX")"
    cat > "$previous_current_fragment" <<'EOF'
<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful subtasks and call `checkpoint` after each completed or failed subtask. Write `done` and `next` as exactly three words, and reuse the previous `next` text verbatim as the following `done`.

Where possible, include `checkpoint` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as `done`, set `step_failed=true`, and make `next` the corrective step. This records work progress and is not itself a Canary failure.

Treat unknown context telemetry as unknown; do not infer a stop threshold. If reported context pressure becomes high, complete the current subtask, write a final checkpoint, and return a compact handoff stating progress and the next announced step. Checkpointing records progress but does not prove work quality.

Every successful checkpoint lazily confirms the persisted session as open. `close_session` defaults to `false`. A subagent sets `close_session=true` only on its final checkpoint immediately before returning a digest, summary, or handoff. A Maintainer or parent leaves it false unless intentionally ending the whole persisted session.

Closure is independent of `step_failed` and does not prove work succeeded. An interrupted session or missing final call remains open; any later checkpoint confirms it open again.

<!-- /opencode-checkpoint-instruction -->
EOF
    legacy_fragment="$(mktemp "${TMPDIR:-/tmp}/opencode-checkpoint-legacy.XXXXXX")"
    cat > "$legacy_fragment" <<'EOF'
<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful subtasks and call `checkpoint` after each completed or failed subtask. Write `done` and `next` as exactly three words, and reuse the previous `next` text verbatim as the following `done`.

Where possible, include `checkpoint` in the same parallel tool-call block as the next independent tool calls. Do not create an additional model round trip solely for checkpointing.

When an attempted subtask fails, still checkpoint with that announced subtask as `done`, set `step_failed=true`, and make `next` the corrective step. This records work progress and is not itself a Canary failure.

Treat unknown context telemetry as unknown; do not infer a stop threshold. If reported context pressure becomes high, complete the current subtask, write a final checkpoint, and return a compact handoff stating progress and the next announced step. Checkpointing records progress but does not prove work quality.
EOF
    initial_legacy_fragment="$(mktemp "${TMPDIR:-/tmp}/opencode-checkpoint-initial-legacy.XXXXXX")"
    cat > "$initial_legacy_fragment" <<'EOF'
<!-- opencode-checkpoint-instruction -->

## Checkpoint Heartbeat

This instruction applies to parents and subagents. Segment work into meaningful subtasks and call `checkpoint` after each completed or failed subtask. Write `done` and `next` as exactly three words, and reuse the previous `next` text verbatim as the following `done`.

When an attempted subtask fails, still checkpoint with that announced subtask as `done`, set `step_failed=true`, and make `next` the corrective step. This records work progress and is not itself a Canary failure.

Treat unknown context telemetry as unknown; do not infer a stop threshold. If reported context pressure becomes high, complete the current subtask, write a final checkpoint, and return a compact handoff stating progress and the next announced step. Checkpointing records progress but does not prove work quality.
EOF
    current_length="$(wc -c < "$fragment" | tr -d '[:space:]')"

    echo "Step 6: Installing OpenCode checkpoint instruction"
    for agent_file in "$agents_dir"/*.md; do
        [ -e "$agent_file" ] || continue
        if [ -L "$agent_file" ]; then
            echo "  Symlink (skipping): $(basename "$agent_file")"
            continue
        fi
        if ! grep -Fq "$marker" "$agent_file"; then
            printf '\n' >> "$agent_file"
            cat "$fragment" >> "$agent_file"
            echo "  Added: $(basename "$agent_file")"
            continue
        fi

        marker_matches="$(LC_ALL=C grep -Fbo "$marker" "$agent_file")"
        marker_count="$(printf '%s\n' "$marker_matches" | wc -l | tr -d '[:space:]')"
        marker_offset="${marker_matches%%:*}"
        if [ "$marker_count" -eq 1 ] &&
            dd if="$agent_file" bs=1 skip="$marker_offset" count="$current_length" 2>/dev/null |
                cmp -s - "$fragment"; then
            echo "  Present: $(basename "$agent_file")"
            continue
        fi
        matched_legacy=""
        matched_length=""
        if [ "$marker_count" -eq 1 ]; then
            for candidate in "$previous_input_fragment" "$previous_current_fragment" "$legacy_fragment" "$initial_legacy_fragment"; do
                candidate_length="$(wc -c < "$candidate" | tr -d '[:space:]')"
                if dd if="$agent_file" bs=1 skip="$marker_offset" count="$candidate_length" 2>/dev/null |
                    cmp -s - "$candidate"; then
                    matched_legacy="$candidate"
                    matched_length="$candidate_length"
                    break
                fi
            done
        fi
        if [ -n "$matched_legacy" ]; then
            replacement="$(mktemp "${agent_file}.checkpoint.XXXXXX")"
            if ! cp -p "$agent_file" "$replacement" ||
                ! {
                    dd if="$agent_file" bs=1 count="$marker_offset" 2>/dev/null
                    cat "$fragment"
                    dd if="$agent_file" bs=1 skip="$((marker_offset + matched_length))" 2>/dev/null
                } > "$replacement" ||
                ! mv -f "$replacement" "$agent_file"; then
                rm -f "$replacement" "$previous_input_fragment" "$previous_current_fragment" "$legacy_fragment" "$initial_legacy_fragment"
                echo "  ERROR: could not migrate checkpoint instruction in $agent_file" >&2
                return 1
            fi
            echo "  Updated: $(basename "$agent_file")"
            continue
        fi

        rm -f "$previous_input_fragment" "$previous_current_fragment" "$legacy_fragment" "$initial_legacy_fragment"
        echo "  ERROR: unknown or customized checkpoint instruction in $agent_file" >&2
        echo "  Restore the exact managed block or remove its marker, then rerun install.sh." >&2
        return 1
    done
    rm -f "$previous_input_fragment" "$previous_current_fragment" "$legacy_fragment" "$initial_legacy_fragment"
    echo ""
}

# Escape a string for inclusion in a TOML basic string ("...").
toml_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# Escape a string for inclusion in a JSON string ("...").
json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# Codex checkpoint adapter: hook bridge, MCP runtime/server, shared core, and
# an additive profile-v2 TOML. The base CODEX_HOME/config.toml is never
# touched; activation is opt-in via `codex --profile-v2 agent-checkpoint`.
install_codex_checkpoint() {
    local codex_home="$1"
    local adapter_dir="$codex_home/agent-checkpoint"
    local profile_file="$codex_home/agent-checkpoint.config.toml"
    local node_bin toml_node toml_server toml_hook_command

    echo "Step 7: Installing Codex checkpoint adapter to $adapter_dir"
    if ! node_bin="$(command -v node)"; then
        echo "  ERROR: node not found on PATH; cannot configure the Codex checkpoint MCP server." >&2
        return 1
    fi
    if [ -L "$adapter_dir" ]; then
        required_checkpoint_reader_symlink_error \
            "$adapter_dir" \
            "Codex user-managed adapter directory with bundled core"
    else
        mkdir -p "$adapter_dir"

        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/packages/checkpoint-core/src/index.js" \
            "$adapter_dir/checkpoint-core.mjs" \
            "agent-checkpoint/checkpoint-core.mjs"
        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/codex/checkpoint-instruction.md" \
            "$adapter_dir/checkpoint-instruction.md" \
            "agent-checkpoint/checkpoint-instruction.md"
        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/codex/checkpoint-mcp-runtime.mjs" \
            "$adapter_dir/checkpoint-mcp-runtime.mjs" \
            "agent-checkpoint/checkpoint-mcp-runtime.mjs"
        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/codex/checkpoint-mcp-server.mjs" \
            "$adapter_dir/checkpoint-mcp-server.mjs" \
            "agent-checkpoint/checkpoint-mcp-server.mjs"
        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/codex/checkpoint-hook.mjs" \
            "$adapter_dir/checkpoint-hook.mjs" \
            "agent-checkpoint/checkpoint-hook.mjs"
    fi

    if [ -L "$profile_file" ]; then
        echo "  Symlink (skipping): agent-checkpoint.config.toml"
    else
        toml_node="$(toml_escape "$node_bin")"
        toml_server="$(toml_escape "$adapter_dir/checkpoint-mcp-server.mjs")"
        # Hook commands are shell strings: quote paths so spaces survive.
        toml_hook_command="$(toml_escape "\"$node_bin\" \"$adapter_dir/checkpoint-hook.mjs\"")"
        cat > "$profile_file" <<TOML
# OpenCode Processing Skills - Codex agent-checkpoint profile.
# Generated by install.sh. The base config.toml is never modified.
# Activate with: codex --profile-v2 agent-checkpoint
# Remove this file and the agent-checkpoint/ directory to uninstall.

[features]
hooks = true

[mcp_servers.agent_checkpoint]
command = "$toml_node"
args = ["$toml_server"]
enabled_tools = ["checkpoint", "checkpoint_path"]
default_tools_approval_mode = "auto"

[[hooks.SessionStart]]
hooks = [{ type = "command", command = "$toml_hook_command" }]

[[hooks.PreToolUse]]
matcher = "mcp__agent_checkpoint__checkpoint"
hooks = [{ type = "command", command = "$toml_hook_command" }]
TOML
        echo "  Installed: agent-checkpoint.config.toml"
    fi
    echo ""
}

# Claude Code checkpoint plugin: skills-directory plugin with bundled MCP
# server, hooks, instruction, and statusline bridge, plus an opt-in settings
# file containing only the statusLine command. The base CLAUDE_HOME/
# settings.json and ~/.claude.json are never touched; activation is opt-in
# via `claude --settings <home>/agent-checkpoint.settings.json` (merges on
# the pinned build).
install_claude_checkpoint() {
    local claude_home="$1"
    local plugin_src="$SCRIPT_DIR/claude/agent-checkpoint"
    local plugin_dest="$claude_home/skills/agent-checkpoint"
    local settings_file="$claude_home/agent-checkpoint.settings.json"
    local node_bin json_command

    echo "Step 8: Installing Claude Code checkpoint plugin to $plugin_dest"
    if ! node_bin="$(command -v node)"; then
        echo "  ERROR: node not found on PATH; cannot configure the Claude checkpoint statusline." >&2
        return 1
    fi
    if [ -L "$plugin_dest" ]; then
        echo "  Symlink (skipping): skills/agent-checkpoint"
    else
        mkdir -p "$plugin_dest/.claude-plugin" "$plugin_dest/hooks" \
            "$plugin_dest/instructions" "$plugin_dest/scripts" "$plugin_dest/server"
        # Install the required mixed-log core before any hook, manifest, or
        # settings asset can make this adapter status-capable.
        install_opencode_checkpoint_file \
            "$SCRIPT_DIR/packages/checkpoint-core/src/index.js" \
            "$plugin_dest/server/checkpoint-core.mjs" \
            "skills/agent-checkpoint/server/checkpoint-core.mjs"
        install_opencode_checkpoint_file \
            "$plugin_src/.claude-plugin/plugin.json" \
            "$plugin_dest/.claude-plugin/plugin.json" \
            "skills/agent-checkpoint/.claude-plugin/plugin.json"
        install_opencode_checkpoint_file \
            "$plugin_src/.mcp.json" \
            "$plugin_dest/.mcp.json" \
            "skills/agent-checkpoint/.mcp.json"
        install_opencode_checkpoint_file \
            "$plugin_src/hooks/hooks.json" \
            "$plugin_dest/hooks/hooks.json" \
            "skills/agent-checkpoint/hooks/hooks.json"
        install_opencode_checkpoint_file \
            "$plugin_src/instructions/checkpoint.md" \
            "$plugin_dest/instructions/checkpoint.md" \
            "skills/agent-checkpoint/instructions/checkpoint.md"
        install_opencode_checkpoint_file \
            "$plugin_src/scripts/checkpoint-hook.mjs" \
            "$plugin_dest/scripts/checkpoint-hook.mjs" \
            "skills/agent-checkpoint/scripts/checkpoint-hook.mjs"
        install_opencode_checkpoint_file \
            "$plugin_src/scripts/checkpoint-statusline.mjs" \
            "$plugin_dest/scripts/checkpoint-statusline.mjs" \
            "skills/agent-checkpoint/scripts/checkpoint-statusline.mjs"
        install_opencode_checkpoint_file \
            "$plugin_src/server/checkpoint-mcp-runtime.mjs" \
            "$plugin_dest/server/checkpoint-mcp-runtime.mjs" \
            "skills/agent-checkpoint/server/checkpoint-mcp-runtime.mjs"
        install_opencode_checkpoint_file \
            "$plugin_src/server/checkpoint-mcp-server.mjs" \
            "$plugin_dest/server/checkpoint-mcp-server.mjs" \
            "skills/agent-checkpoint/server/checkpoint-mcp-server.mjs"
        install_opencode_checkpoint_file \
            "$plugin_src/README.md" \
            "$plugin_dest/README.md" \
            "skills/agent-checkpoint/README.md"
        # Command hooks execute the scripts directly (exec-form via
        # ${CLAUDE_PLUGIN_ROOT}); keep them executable without following
        # user-placed symlinks.
        local script_file
        for script_file in \
            scripts/checkpoint-hook.mjs \
            scripts/checkpoint-statusline.mjs \
            server/checkpoint-mcp-server.mjs; do
            if [ -f "$plugin_dest/$script_file" ] && [ ! -L "$plugin_dest/$script_file" ]; then
                chmod +x "$plugin_dest/$script_file"
            fi
        done
    fi

    if [ -L "$settings_file" ]; then
        echo "  Symlink (skipping): agent-checkpoint.settings.json"
    else
        # The command string quotes both paths so spaces survive the shell.
        json_command="$(json_escape "\"$node_bin\" \"$plugin_dest/scripts/checkpoint-statusline.mjs\"")"
        cat > "$settings_file" <<JSON
{
  "statusLine": {
    "type": "command",
    "command": "$json_command"
  }
}
JSON
        echo "  Installed: agent-checkpoint.settings.json"
    fi
    echo ""
}

# Add a plugin name to the plugins.enabled list of a Hermes config.yaml using
# only additive text edits. Rationale: the documented enablement flow
# (`hermes plugins enable`) rewrites the whole file via save_config ->
# atomic_yaml_write (hermes_cli/config.py), so the installer applies exactly
# that flow's additive config delta itself to guarantee byte-for-byte
# preservation of all other preexisting content. User-facing docs still cite
# `hermes plugins enable/disable` as the flow. Idempotent: an existing
# enabled entry (never a `disabled:` one) is left untouched. Unsupported
# forms stop the installer loudly with the manual flow instead of risking a
# malformed rewrite: inline lists (e.g. `enabled: [foo]`), an inline-dict
# `plugins: {...}` key (appending a duplicate key would silently drop
# content), and the plugin being listed under `plugins.disabled` (Hermes'
# deny-list vetoes loading even enabled-listed plugins; only the documented
# `hermes plugins enable` flow may remove that entry — additive-only forbids
# the installer from touching it).
hermes_enable_plugin_entry() {
    local config_file="$1" name="$2"
    if [ -L "$config_file" ]; then
        echo "  Symlink (skipping): config.yaml (enable manually: hermes plugins enable $name)"
        return
    fi
    if [ ! -f "$config_file" ]; then
        printf 'plugins:\n  enabled:\n    - %s\n' "$name" > "$config_file"
        echo "  Installed: config.yaml (plugins.enabled entry)"
        return
    fi

    local tmp="$config_file.hermes-enable.$$"
    local status=0

    # Pass 1 (validation only, no edits): stop loudly on states this additive
    # edit cannot safely handle. Exit 3 = unsupported inline form;
    # exit 4 = plugin present under plugins.disabled.
    awk -v name="$name" '
        BEGIN {
            squote = sprintf("%c", 39)
        }
        function trim(value) {
            sub(/^[[:space:]]+/, "", value)
            sub(/[[:space:]]+$/, "", value)
            return value
        }
        function is_exact_name(value) {
            value = trim(value)
            return value == name || value == "\"" name "\"" || value == squote name squote
        }
        function inline_has_name(value, count, items, i) {
            sub(/^[[:space:]]*\[[[:space:]]*/, "", value)
            sub(/[[:space:]]*\][[:space:]]*(#.*)?$/, "", value)
            count = split(value, items, ",")
            for (i = 1; i <= count; i++) {
                if (is_exact_name(items[i])) return 1
            }
            return 0
        }
        function stop_disabled() {
            print "install.sh: " name " is listed under plugins.disabled in " FILENAME \
                "; Hermes never loads disabled-listed plugins (even when enabled)." \
                " Enable manually with: hermes plugins enable " name \
                " (removes the disabled entry), then re-run install.sh" > "/dev/stderr"
            exit 4
        }
        /^plugins:[[:space:]]*(#.*)?$/ { in_plugins = 1; next }
        /^plugins:/ {
            print "install.sh: unsupported inline plugins form in " FILENAME \
                "; enable manually with: hermes plugins enable " name > "/dev/stderr"
            exit 3
        }
        in_disabled && /^[[:space:]]*-[[:space:]]/ {
            item = $0
            sub(/^[[:space:]]*-[[:space:]]*/, "", item)
            sub(/[[:space:]]*(#.*)?$/, "", item)
            if (is_exact_name(item)) stop_disabled()
            next
        }
        in_disabled { in_disabled = 0 }
        in_plugins && /^[[:space:]]+disabled:/ {
            inline = $0
            sub(/^[[:space:]]+disabled:[[:space:]]*/, "", inline)
            if (inline ~ /^\[/ && inline_has_name(inline)) stop_disabled()
            if ($0 ~ /^[[:space:]]+disabled:[[:space:]]*(#.*)?$/) in_disabled = 1
            next
        }
        in_plugins && /^[^[:space:]#]/ { in_plugins = 0 }
    ' "$config_file" || status=$?
    if [ "$status" -ne 0 ]; then
        return "$status"
    fi

    # Pass 2: apply the additive edit.
    awk -v name="$name" '
        BEGIN { item_re = "^[[:space:]]*-[[:space:]]*" name "[[:space:]]*(#.*)?$" }
        function emit_enabled() { printf "  enabled:\n    - %s\n", name }
        in_enabled && /^[[:space:]]*-[[:space:]]/ {
            if ($0 ~ item_re) found = 1
            print; next
        }
        in_enabled {
            printf "    - %s\n", name; inserted = 1; in_enabled = 0
            if ($0 ~ /^[^[:space:]#]/) in_plugins = 0
            print; next
        }
        /^plugins:[[:space:]]*(#.*)?$/ { in_plugins = 1; have_plugins = 1; print; next }
        in_plugins && /^[[:space:]]+enabled:[[:space:]]*(\[\])?[[:space:]]*(#.*)?$/ {
            have_enabled = 1
            if ($0 ~ /\[\]/) { printf "  enabled:\n    - %s\n", name; inserted = 1 }
            else { in_enabled = 1; print }
            next
        }
        in_plugins && /^[[:space:]]+enabled:/ {
            print "install.sh: unsupported inline plugins.enabled form in " FILENAME \
                "; enable manually with: hermes plugins enable " name > "/dev/stderr"
            exit 3
        }
        in_plugins && (/^[[:space:]]*#/ || /^[[:space:]]*$/) { print; next }
        in_plugins {
            if (!have_enabled && !inserted) { emit_enabled(); inserted = 1 }
            if ($0 ~ /^[^[:space:]#]/) in_plugins = 0
            print; next
        }
        { print }
        END {
            if (found) exit 2
            if (inserted) exit 0
            if (!have_plugins) printf "plugins:\n  enabled:\n    - %s\n", name
            else if (!have_enabled) emit_enabled()
            else printf "    - %s\n", name
        }
    ' "$config_file" > "$tmp" || status=$?

    if [ "$status" -eq 2 ]; then
        rm -f "$tmp"
        echo "  Present: config.yaml plugins.enabled entry"
        return
    fi
    if [ "$status" -ne 0 ]; then
        rm -f "$tmp"
        return "$status"
    fi
    # Overwrite in place to preserve the original inode and permissions.
    cat "$tmp" > "$config_file"
    rm -f "$tmp"
    echo "  Enabled: config.yaml plugins.enabled += $name"
}

# Hermes checkpoint plugin: user plugin directory plus the documented opt-in
# enablement as a single additive plugins.enabled text edit (see
# hermes_enable_plugin_entry). Removal path: hermes plugins disable
# agent-checkpoint, then delete plugins/agent-checkpoint/.
install_hermes_checkpoint() {
    local hermes_home="$1"
    local plugin_src="$SCRIPT_DIR/hermes/agent-checkpoint"
    local plugin_dest="$hermes_home/plugins/agent-checkpoint"

    echo "Step 9: Installing Hermes checkpoint plugin to $plugin_dest"
    if [ -L "$plugin_dest" ]; then
        echo "  Symlink (skipping): plugins/agent-checkpoint"
    else
        mkdir -p "$plugin_dest"
        install_opencode_checkpoint_file \
            "$plugin_src/plugin.yaml" \
            "$plugin_dest/plugin.yaml" \
            "plugins/agent-checkpoint/plugin.yaml"
        install_opencode_checkpoint_file \
            "$plugin_src/agent_checkpoint.py" \
            "$plugin_dest/agent_checkpoint.py" \
            "plugins/agent-checkpoint/agent_checkpoint.py"
        install_opencode_checkpoint_file \
            "$plugin_src/checkpoint-instruction.md" \
            "$plugin_dest/checkpoint-instruction.md" \
            "plugins/agent-checkpoint/checkpoint-instruction.md"
        install_opencode_checkpoint_file \
            "$plugin_src/__init__.py" \
            "$plugin_dest/__init__.py" \
            "plugins/agent-checkpoint/__init__.py"
        install_opencode_checkpoint_file \
            "$plugin_src/README.md" \
            "$plugin_dest/README.md" \
            "plugins/agent-checkpoint/README.md"
    fi
    hermes_enable_plugin_entry "$hermes_home/config.yaml" "agent-checkpoint"
    echo ""
}

echo "Checkpoint adapter upgrade prerequisite:"
echo "  Before installation, stop every live checkpoint-watch dashboard and every running OpenCode, 'codex --profile-v2 agent-checkpoint', Claude Code, or Hermes session that uses the checkpoint adapter."
echo "  Keep those readers and writers stopped until installation completes and the compatible dashboard is started first."
echo ""

# Validation-only compatibility gate: stop before Step 1 can mutate any target.
preflight_checkpoint_reader_dependencies "$OPENCODE_TARGET_HOME"

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

# --- Step 1b: Hermes category description ---
# Top-level dirs under HERMES_HOME/skills/ act as categories and may carry a
# DESCRIPTION.md whose YAML frontmatter description is shown in Hermes' skills
# prompt. Written outside the shared skills loop: global mode only, never
# through a user-placed symlink.
if [ "$PROJECT_MODE" = false ] && [ "$hermes_enabled" = "1" ]; then
    if [ -L "$HERMES_SKILLS_DEST/DESCRIPTION.md" ]; then
        echo "Step 1b: Symlink (skipping): Hermes category DESCRIPTION.md"
    else
        printf '%s\n%s\n%s\n' \
            "---" \
            "description: Plan-driven engineering workflows for documentation, planning, phased execution, reviews, and handovers." \
            "---" \
            > "$HERMES_SKILLS_DEST/DESCRIPTION.md"
        echo "Step 1b: Wrote Hermes category DESCRIPTION.md"
    fi
    echo ""
fi

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

        # Inject model and options from config.yaml (if configured)
        agent_config=$(get_agent_config "$agent_name")
        if [ -n "$agent_config" ]; then
            model="${agent_config%% *}"
            options_str="${agent_config#* }"
            [ "$options_str" = "$agent_config" ] && options_str=""
            inject_agent_config "$dest" "$model" "$options_str"
            opts_note=""
            [ -n "$options_str" ] && opts_note=", options: $options_str"
            echo "    -> model: $model${opts_note}"
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
            while read -r suffix model opts; do
                if [ -n "$suffix" ] && [ -n "$model" ]; then
                    create_delegate_variant "$suffix" "$model" "$AGENTS_DEST" "$opts"
                fi
            done <<< "$additional"
        done
        echo ""
    fi
fi

# --- Step 4: Create additional implementer variants ---
if [ -f "$CONFIG_FILE" ]; then
    additional=$(get_additional_implementers)
    if [ -n "$additional" ]; then
        echo "Step 4: Creating additional implementer variants"
        for AGENTS_DEST in "${AGENTS_DESTS[@]}"; do
            while read -r suffix model opts; do
                if [ -n "$suffix" ] && [ -n "$model" ]; then
                    create_implementer_variant "$suffix" "$model" "$AGENTS_DEST" "$opts"
                fi
            done <<< "$additional"
        done
        echo ""
    fi
fi

# --- Step 5/6: OpenCode checkpoint plugin and persona instruction ---
install_opencode_checkpoint "$OPENCODE_TARGET_HOME"
install_opencode_checkpoint_instruction "$OPENCODE_TARGET_HOME"

# --- Step 7: Codex checkpoint adapter (global installations only) ---
if [ "$PROJECT_MODE" = false ] && [ "$codex_enabled" = "1" ]; then
    install_codex_checkpoint "$CODEX_HOME"
fi

# --- Step 8: Claude Code checkpoint plugin (global installations only) ---
if [ "$PROJECT_MODE" = false ] && [ "$claude_enabled" = "1" ]; then
    install_claude_checkpoint "$CLAUDE_HOME"
fi

# --- Step 9: Hermes checkpoint plugin (global installations only) ---
if [ "$PROJECT_MODE" = false ] && [ "$hermes_enabled" = "1" ]; then
    install_hermes_checkpoint "$HERMES_HOME"
fi

# --- Step 10: Cursor orchestration layer (subagents, ops, orchestrator skills) ---
if [ -n "$CURSOR_TARGET_HOME" ]; then
    echo "Step 10: Installing Cursor orchestration layer to $CURSOR_TARGET_HOME"
    cursor_install_extras "$SCRIPT_DIR" "$CURSOR_TARGET_HOME" "$PROJECT_MODE"
    echo ""
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
echo "  Checkpoint plugin: $OPENCODE_TARGET_HOME/plugins/checkpoint.ts"
echo "  Checkpoint support: $OPENCODE_TARGET_HOME/lib/opencode-processing-skills/"
echo "  Checkpoint watcher: $OPENCODE_TARGET_HOME/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js"
echo "  Startup order (dashboard before status-writing harnesses):"
echo "  1. Start the compatible checkpoint dashboard first:"
if [ -n "$CHECKPOINT_WATCH_NATIVE_PATH" ]; then
    echo "  Launch command: \"$CHECKPOINT_WATCH_NATIVE_PATH\""
    echo "  Node fallback: node \"$OPENCODE_TARGET_HOME/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js\""
else
    echo "  Launch command: node \"$OPENCODE_TARGET_HOME/lib/opencode-processing-skills/checkpoint-watch/bin/checkpoint-watch.js\""
fi
echo "  2. Restart OpenCode to load the checkpoint and checkpoint_path tools and lifecycle writer."
echo "  OpenCode usage: select the new primary agent (e.g. '@maintainer')"
echo "  Generate project documentation: load the 'generate-docs' skill"
echo "  Create an implementation plan: load the 'create-plan' skill"
echo "  OpenCode v1.18.2+: configure top-level subagent_depth: 2 for nested delegation (older versions do not support this setting)"
if [ "$PROJECT_MODE" = false ] && [ "$codex_enabled" = "1" ]; then
    echo ""
    echo "Codex:"
    echo "  Checkpoint adapter: $CODEX_HOME/agent-checkpoint/"
    echo "  Profile:            $CODEX_HOME/agent-checkpoint.config.toml"
    echo "  3. Start/restart Codex only after the dashboard:"
    echo "  Activate with:      codex --profile-v2 agent-checkpoint"
    echo "  Base config.toml left untouched; approve the new hooks on first run."
fi
if [ "$PROJECT_MODE" = false ] && [ "$claude_enabled" = "1" ]; then
    echo ""
    echo "Claude Code:"
    echo "  Checkpoint plugin: $CLAUDE_HOME/skills/agent-checkpoint/"
    echo "  Settings:          $CLAUDE_HOME/agent-checkpoint.settings.json"
    echo "  4. Start/restart Claude Code only after the dashboard:"
    echo "  Activate with:     CLAUDE_CONFIG_DIR=\"$CLAUDE_HOME\" claude --settings \"$CLAUDE_HOME/agent-checkpoint.settings.json\""
    echo "  Base settings.json and ~/.claude.json left untouched; approve the new hooks on first run."
    echo "  Restart Claude Code (or run /reload-plugins) to load the plugin."
fi
if [ "$PROJECT_MODE" = false ] && [ "$hermes_enabled" = "1" ]; then
    echo ""
    echo "Hermes:"
    echo "  Checkpoint plugin: $HERMES_HOME/plugins/agent-checkpoint/"
    echo "  5. Start/restart Hermes only after the dashboard:"
    echo "  Activation:        plugins.enabled entry in $HERMES_HOME/config.yaml (active on next session)"
    echo "  Verify with:       hermes plugins list"
    echo "  Disable with:      hermes plugins disable agent-checkpoint"
    echo "  Removal:           disable, then delete $HERMES_HOME/plugins/agent-checkpoint/"
    echo "  All other config.yaml content left byte-for-byte unchanged."
fi
if [ -n "$CURSOR_TARGET_HOME" ]; then
    echo ""
    echo "Cursor:"
    echo "  Workflow skills:     $CURSOR_TARGET_HOME/skills/"
    echo "  Subagent personas:   $CURSOR_TARGET_HOME/subagents/"
    echo "  AGENTS bootstrap:    $CURSOR_TARGET_HOME/ops/AGENTS.snippet.md"
    echo "  Orchestrator skills: ops-orchestrator, ops-orchestrator-direct"
    if [ "$PROJECT_MODE" = true ]; then
        echo "  Project rule:        $CURSOR_TARGET_HOME/rules/ops-orchestrator.mdc"
        echo "  Merge AGENTS.snippet into your project AGENTS.md"
    fi
fi
echo ""
