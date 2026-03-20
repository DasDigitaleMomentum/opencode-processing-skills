#!/usr/bin/env bash
# install.sh - Install OpenCode Processing Skills globally
#
# Usage:
#   ./install.sh
#
# What it does:
#   1. Copies skills to ~/.config/opencode/skills/ (global)
#   2. Copies agent definitions to ~/.config/opencode/agents/ (global)
#   3. If config.yaml exists, injects model settings into agent frontmatter

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.yaml"

echo "OpenCode Processing Skills - Installer"
echo "======================================="
echo ""
echo "Source:  $SCRIPT_DIR"
echo ""

# --- Helper: read model for an agent from config.yaml ---
# Returns the model string, or empty if not configured.
get_model_for_agent() {
    local agent_name="$1"
    if [ ! -f "$CONFIG_FILE" ]; then
        return
    fi
    # Parse simple "key: value" YAML (no nesting, no quotes needed)
    # Skips comments and empty lines, matches exact agent name
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
    agent_name="$(basename "$agent_file" .md)"
    dest="$AGENTS_DEST/$(basename "$agent_file")"

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
