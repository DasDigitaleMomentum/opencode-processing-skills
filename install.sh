#!/usr/bin/env bash
# install.sh - Install or uninstall OpenCode Processing Skills globally
#
# Usage:
#   ./install.sh                     # Install / update managed skills and agents
#   ./install.sh --force             # Force overwrite conflicting names
#   ./install.sh --uninstall         # Remove only managed skills and agents
#   ./install.sh --uninstall --force # Force remove by name (legacy cleanup)
#
# What it does:
#   1. Copies skills to ~/.config/opencode/skills/ (global)
#   2. Copies agent definitions to ~/.config/opencode/agents/ (global)
#   3. Tracks ownership markers to avoid clobbering other skill packs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ID="flitzrrr-opencode-processing-skills"
SKILL_MARKER_FILE=".opencode-processing-skills.owner"
AGENT_MARKER_SUFFIX=".opencode-processing-skills.owner"

FORCE=0
UNINSTALL=0

usage() {
    cat <<'EOF'
OpenCode Processing Skills - Installer

Usage:
  ./install.sh                     Install/update managed skills and agents
  ./install.sh --force             Force overwrite conflicting names
  ./install.sh --uninstall         Remove only managed skills and agents
  ./install.sh --uninstall --force Force remove by name (legacy cleanup)
EOF
}

skill_marker_path() {
    local skill_path="$1"
    printf '%s/%s' "$skill_path" "$SKILL_MARKER_FILE"
}

agent_marker_path() {
    local agent_path="$1"
    printf '%s%s' "$agent_path" "$AGENT_MARKER_SUFFIX"
}

is_managed_skill() {
    local skill_path="$1"
    local marker
    marker="$(skill_marker_path "$skill_path")"
    [[ -f "$marker" ]] && grep -Fxq "$PACKAGE_ID" "$marker"
}

is_managed_agent() {
    local agent_path="$1"
    local marker
    marker="$(agent_marker_path "$agent_path")"
    [[ -f "$marker" ]] && grep -Fxq "$PACKAGE_ID" "$marker"
}

for arg in "$@"; do
    case "$arg" in
        --force)
            FORCE=1
            ;;
        --uninstall)
            UNINSTALL=1
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Error: unknown argument '$arg'" >&2
            echo "" >&2
            usage
            exit 1
            ;;
    esac
done

mapfile -t SKILL_DIRS < <(find "$SCRIPT_DIR/skills" -mindepth 1 -maxdepth 1 -type d | sort)
mapfile -t AGENT_FILES < <(find "$SCRIPT_DIR/agents" -mindepth 1 -maxdepth 1 -type f -name '*.md' | sort)

# --- Uninstall Mode ---
if [[ "$UNINSTALL" -eq 1 ]]; then
    echo "OpenCode Processing Skills - Uninstaller"
    echo "========================================="
    echo ""

    SKILLS_DEST="$HOME/.config/opencode/skills"
    AGENTS_DEST="$HOME/.config/opencode/agents"
    removed_skills=0
    removed_agents=0
    skipped_conflicts=0

    echo "Removing skills..."
    for skill_dir in "${SKILL_DIRS[@]}"; do
        skill_name="$(basename "$skill_dir")"
        dest="$SKILLS_DEST/$skill_name"
        if [ -d "$dest" ]; then
            if is_managed_skill "$dest" || [[ "$FORCE" -eq 1 ]]; then
                rm -rf "$dest"
                echo "  Removed: $skill_name"
                removed_skills=$((removed_skills + 1))
            else
                echo "  Skipped (unmanaged conflict): $skill_name"
                skipped_conflicts=$((skipped_conflicts + 1))
            fi
        fi
    done

    echo ""
    echo "Removing agents..."
    for agent_file in "${AGENT_FILES[@]}"; do
        agent_name="$(basename "$agent_file")"
        dest="$AGENTS_DEST/$agent_name"
        marker="$(agent_marker_path "$dest")"
        if [[ -f "$dest" ]]; then
            if is_managed_agent "$dest" || [[ "$FORCE" -eq 1 ]]; then
                rm -f "$dest"
                rm -f "$marker"
                echo "  Removed: $agent_name"
                removed_agents=$((removed_agents + 1))
            else
                echo "  Skipped (unmanaged conflict): $agent_name"
                skipped_conflicts=$((skipped_conflicts + 1))
            fi
        elif [[ -f "$marker" ]]; then
            rm -f "$marker"
        fi
    done

    echo ""
    echo "Summary:"
    printf "  Skills removed: %d\n" "$removed_skills"
    printf "  Agents removed: %d\n" "$removed_agents"
    if [[ "$skipped_conflicts" -gt 0 ]]; then
        printf "  Skipped unmanaged entries: %d\n" "$skipped_conflicts"
        if [[ "$FORCE" -eq 0 ]]; then
            echo "  Tip: rerun with --uninstall --force to remove conflicting names."
        fi
    fi
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
mkdir -p "$SKILLS_DEST"
installed_skills=0
updated_skills=0
skipped_skills=0

for skill_dir in "${SKILL_DIRS[@]}"; do
    skill_name="$(basename "$skill_dir")"
    dest="$SKILLS_DEST/$skill_name"

    if [ -d "$dest" ]; then
        if is_managed_skill "$dest"; then
            echo "  Updating: $skill_name"
            rm -rf "$dest"
            updated_skills=$((updated_skills + 1))
        elif [[ "$FORCE" -eq 1 ]]; then
            echo "  Force-updating conflicting skill: $skill_name"
            rm -rf "$dest"
            updated_skills=$((updated_skills + 1))
        else
            echo "  Skipping conflicting unmanaged skill: $skill_name"
            skipped_skills=$((skipped_skills + 1))
            continue
        fi
    else
        echo "  Installing: $skill_name"
        installed_skills=$((installed_skills + 1))
    fi

    mkdir -p "$dest"

    # Copy entire skill directory (no symlinks)
    # Use "/." to include hidden files if present.
    cp -R "$skill_dir/." "$dest/"
    printf '%s\n' "$PACKAGE_ID" > "$(skill_marker_path "$dest")"
done

echo ""

# --- Step 2: Install Agents (global) ---
AGENTS_DEST="$HOME/.config/opencode/agents"
echo "Step 2: Installing agents to $AGENTS_DEST"
mkdir -p "$AGENTS_DEST"
installed_agents=0
updated_agents=0
skipped_agents=0

for agent_file in "${AGENT_FILES[@]}"; do
    agent_name="$(basename "$agent_file")"
    dest="$AGENTS_DEST/$agent_name"
    marker="$(agent_marker_path "$dest")"

    if [ -f "$dest" ]; then
        if is_managed_agent "$dest"; then
            echo "  Updating: $agent_name"
            updated_agents=$((updated_agents + 1))
        elif [[ "$FORCE" -eq 1 ]]; then
            echo "  Force-updating conflicting agent: $agent_name"
            updated_agents=$((updated_agents + 1))
        else
            echo "  Skipping conflicting unmanaged agent: $agent_name"
            skipped_agents=$((skipped_agents + 1))
            continue
        fi
    else
        echo "  Installing: $agent_name"
        installed_agents=$((installed_agents + 1))
    fi
    cp "$agent_file" "$dest"
    printf '%s\n' "$PACKAGE_ID" > "$marker"
done

echo ""
echo "✅ Installation complete!"
echo ""
echo "Installed:"
printf "  Skills installed: %d\n" "$installed_skills"
printf "  Skills updated:   %d\n" "$updated_skills"
printf "  Agents installed: %d\n" "$installed_agents"
printf "  Agents updated:   %d\n" "$updated_agents"
if [[ "$skipped_skills" -gt 0 || "$skipped_agents" -gt 0 ]]; then
    printf "  Skills skipped:   %d\n" "$skipped_skills"
    printf "  Agents skipped:   %d\n" "$skipped_agents"
    echo "  Note: skipped entries are unmanaged conflicts (safety guard)."
    if [[ "$FORCE" -eq 0 ]]; then
        echo "  Tip: rerun with --force to overwrite conflicting names."
    fi
fi
echo ""
echo "Next steps:"
echo "  1. In OpenCode, select the primary agent: @engineer"
echo "  2. Start a session: load the 'smart-start' skill"
echo "  3. Or generate docs: load the 'generate-docs' skill"
echo ""
