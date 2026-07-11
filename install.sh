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
#   - Cursor     -> CURSOR_HOME/skills              (workflow skills, same as OpenCode)
#                   + subagents/, ops/, orchestrator skills from cursor/
#
# Environment overrides (OPS_ prefix avoids collisions with tool-native vars):
#   OPS_OPENCODE_HOME       override OpenCode home
#   OPS_CODEX_HOME          override Codex home
#   OPS_CLAUDE_HOME         override Claude Code home
#   OPS_CURSOR_HOME         override Cursor home
#   OPS_SYNC_CODEX          true|false|auto — override targets.codex.enabled
#   OPS_SYNC_CLAUDE         true|false|auto — override targets.claude.enabled
#   OPS_SYNC_CURSOR         true|false|auto — override targets.cursor.enabled
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

if is_enabled "$CURSOR_STATE" "$CURSOR_HOME"; then
    SKILLS_DESTS+=("$CURSOR_HOME/skills")
    echo "Cursor integration: enabled (skills -> $CURSOR_HOME/skills)"
else
    echo "Cursor integration: disabled"
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
if [ "$PROJECT_MODE" = true ]; then
    PROJECT_HOME="$PWD/.opencode"
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
    # In project mode, skip Codex/Claude global sync — only local OpenCode structure
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

# --- Step 5: Cursor orchestration layer (subagents, ops, orchestrator skills) ---
if [ -n "$CURSOR_TARGET_HOME" ]; then
    echo "Step 5: Installing Cursor orchestration layer to $CURSOR_TARGET_HOME"
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
echo "  1. In OpenCode, select the new primary agent (e.g. '@maintainer')"
echo "  2. Generate project documentation: load the 'generate-docs' skill"
echo "  3. Create an implementation plan: load the 'create-plan' skill"
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
