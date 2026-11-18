#!/usr/bin/env bash
set -euo pipefail

ORIGINAL_ARGS=("$@")

WORKFLOW_REPO="UniVRse-Interactive/UniVRse-workflow"
WORKFLOW_GIT_URL="https://github.com/UniVRse-Interactive/UniVRse-workflow.git"
DEFAULT_UNIVRSE_REPO="UniVRse-Interactive/UniVRse-OS"

has_node_18() {
  command -v node >/dev/null 2>&1 || return 1
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  [[ "$major" =~ ^[0-9]+$ ]] && [[ "$major" -ge 18 ]]
}

SCRIPT_PATH="${BASH_SOURCE[0]:-}"
SOURCE_DIR=""
if [[ -n "$SCRIPT_PATH" && -f "$SCRIPT_PATH" ]]; then
  CANDIDATE_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
  if [[ -f "$CANDIDATE_DIR/AGENTS.md" && -d "$CANDIDATE_DIR/.agents" ]]; then
    SOURCE_DIR="$CANDIDATE_DIR"
  fi
fi

# Delegate to zero-dependency Node.js CLI when Node >= 18 and bin/cli.mjs are available
if [[ -n "$SOURCE_DIR" && -f "$SOURCE_DIR/bin/cli.mjs" ]] && has_node_18; then
  exec node "$SOURCE_DIR/bin/cli.mjs" ${ORIGINAL_ARGS[@]+"${ORIGINAL_ARGS[@]}"}
fi

DEST=""
WITH_REPO=false
EXTRA_REPOS=()
CLI_AGENT=""
CLI_ROLE=""
ASSUME_YES=false

usage() {
  cat <<'EOF'
UniVRse Engineering Delivery Workflow Installer (Claude Code + OpenAI Codex + Google Antigravity)

Usage:
  install.sh [OPTIONS] [<destination-path>]

Options:
  --agent <name>        Coding agent: claude-code | codex | antigravity | all (requires Node >= 18)
  --role <name>         Team role: hezri | asyraaf | brendon (requires Node >= 18)
  -d, --dest <path>     Target workspace or UniVRse OS directory
  --project <path>      Alias for --dest
  --with-repo           Also clone UniVRse-Interactive/UniVRse-OS
  --repo <owner/name>   Clone an additional GitHub repo and ensure worktrees/ is in .gitignore
  -y, --yes             Accept defaults non-interactively
  -h, --help            Show this help message and exit

Examples:
  ./install.sh
  ./install.sh --agent all --role brendon --dest "$HOME/Desktop/UniVRse workflow/UniVRse-2.0"
  ./install.sh --dest "$HOME/Desktop/UniVRse workflow/UniVRse-2.0" --with-repo
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Error: $1 requires a value." >&2
        exit 1
      fi
      CLI_AGENT="$2"
      shift 2
      ;;
    --agent=*)
      CLI_AGENT="${1#*=}"
      shift
      ;;
    --role)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Error: $1 requires a value." >&2
        exit 1
      fi
      CLI_ROLE="$2"
      shift 2
      ;;
    --role=*)
      CLI_ROLE="${1#*=}"
      shift
      ;;
    -d|--dest|--project)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Error: $1 requires a path argument." >&2
        exit 1
      fi
      DEST="$2"
      shift 2
      ;;
    --dest=*|--project=*)
      DEST="${1#*=}"
      shift
      ;;
    --with-repo)
      WITH_REPO=true
      shift
      ;;
    --repo)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Error: --repo requires an <owner/name> argument." >&2
        exit 1
      fi
      EXTRA_REPOS+=("$2")
      shift 2
      ;;
    --repo=*)
      EXTRA_REPOS+=("${1#*=}")
      shift
      ;;
    -y|--yes)
      ASSUME_YES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Error: Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -z "$DEST" ]]; then
        DEST="$1"
        shift
      else
        echo "Error: Unexpected positional argument: $1" >&2
        usage >&2
        exit 1
      fi
      ;;
  esac
done

has_authenticated_gh() {
  command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1
}

clone_github_repo() {
  local repo_slug="$1"
  local target_dir="$2"

  if [[ -e "$target_dir" ]]; then
    echo "-> Skipping clone for $repo_slug ($target_dir already exists)"
    return 0
  fi

  echo "-> Cloning $repo_slug into $target_dir..."
  if has_authenticated_gh; then
    gh repo clone "$repo_slug" "$target_dir"
  else
    git clone "https://github.com/${repo_slug}.git" "$target_dir"
  fi
}

TMP_DIR=""
cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

if [[ -z "$SOURCE_DIR" ]]; then
  echo "-> Running in remote bootstrap mode; fetching $WORKFLOW_REPO..."
  TMP_DIR="$(mktemp -d)"
  if has_authenticated_gh; then
    gh repo clone "$WORKFLOW_REPO" "$TMP_DIR/workflow" -- --depth 1
  else
    git clone --depth 1 "$WORKFLOW_GIT_URL" "$TMP_DIR/workflow"
  fi
  SOURCE_DIR="$TMP_DIR/workflow"

  if [[ -f "$SOURCE_DIR/bin/cli.mjs" ]] && has_node_18; then
    node "$SOURCE_DIR/bin/cli.mjs" ${ORIGINAL_ARGS[@]+"${ORIGINAL_ARGS[@]}"}
    exit $?
  fi
fi

# Bash fallback (when Node.js >= 18 is unavailable)
if [[ -z "$DEST" ]]; then
  if [[ "$ASSUME_YES" == false && -t 0 ]]; then
    default_dest="$HOME/Desktop/UniVRse workflow"
    read -r -p "Enter destination folder [default: $default_dest]: " input_dest
    DEST="${input_dest:-$default_dest}"
  else
    DEST="$(pwd)/UniVRse workflow"
  fi
fi

# Expand leading ~/ if provided manually
if [[ "$DEST" == "~/"* ]]; then
  DEST="$HOME/${DEST#~/}"
elif [[ "$DEST" == "~" ]]; then
  DEST="$HOME"
fi

mkdir -p "$DEST"
DEST="$(cd "$DEST" && pwd)"

if [[ "$SOURCE_DIR" == "$DEST" ]]; then
  echo "-> Source and destination are identical ($DEST); skipping self-copy."
else
  echo "-> Installing UniVRse workflow files (bash fallback) into: $DEST"
  for item in AGENTS.md README.md install.sh .gitignore .mcp.json univrse-workflow-diagram.png package.json; do
    if [[ -e "$SOURCE_DIR/$item" ]]; then
      cp -f "$SOURCE_DIR/$item" "$DEST/$item"
    fi
  done
  for dir_item in .agents .github bin; do
    if [[ -d "$SOURCE_DIR/$dir_item" ]]; then
      mkdir -p "$DEST/$dir_item"
      if [[ -n "$(ls -A "$SOURCE_DIR/$dir_item" 2>/dev/null)" ]]; then
        cp -R "$SOURCE_DIR/$dir_item/." "$DEST/$dir_item/"
      fi
    fi
  done
fi

if [[ -f "$DEST/install.sh" ]]; then
  chmod +x "$DEST/install.sh"
fi
if [[ -f "$DEST/bin/cli.mjs" ]]; then
  chmod +x "$DEST/bin/cli.mjs"
fi

echo "-> Creating cross-harness symlinks..."
ln -sfn AGENTS.md "$DEST/CLAUDE.md"
ln -sfn AGENTS.md "$DEST/GEMINI.md"

if [[ "$WITH_REPO" == true ]]; then
  clone_github_repo "$DEFAULT_UNIVRSE_REPO" "$DEST/UniVRse-2.0"
fi

if [[ ${#EXTRA_REPOS[@]} -gt 0 ]]; then
  for repo_slug in "${EXTRA_REPOS[@]}"; do
    repo_name="${repo_slug##*/}"
    repo_name="${repo_name%.git}"
    clone_github_repo "$repo_slug" "$DEST/$repo_name"
  done
fi

echo "-> Verifying worktrees/ .gitignore entries and .github/ISSUE_TEMPLATE/ in nested git repositories..."
TEMPLATE_SRC="$SOURCE_DIR/.github/ISSUE_TEMPLATE"
if [[ ! -d "$TEMPLATE_SRC" && -d "$DEST/.github/ISSUE_TEMPLATE" ]]; then
  TEMPLATE_SRC="$DEST/.github/ISSUE_TEMPLATE"
fi
UPDATED_REPOS=()
for dir in "$DEST"/*/; do
  [[ -d "$dir" ]] || continue
  if [[ -d "${dir}.git" || -f "${dir}.git" ]]; then
    gi="${dir}.gitignore"
    touch "$gi"
    repo_notes=()
    if ! grep -qxF "worktrees/" "$gi" 2>/dev/null; then
      if [[ -s "$gi" ]] && [[ -n "$(tail -c 1 "$gi")" ]]; then
        printf '\n' >> "$gi"
      fi
      printf 'worktrees/\n' >> "$gi"
      repo_notes+=("added worktrees/")
    else
      repo_notes+=("worktrees/ ignored")
    fi
    if [[ -d "$TEMPLATE_SRC" ]]; then
      mkdir -p "${dir}.github/ISSUE_TEMPLATE"
      synced_tpl=false
      for tpl in feature_request.yml config.yml; do
        if [[ -f "$TEMPLATE_SRC/$tpl" ]]; then
          cp -f "$TEMPLATE_SRC/$tpl" "${dir}.github/ISSUE_TEMPLATE/$tpl"
          synced_tpl=true
        fi
      done
      if [[ "$synced_tpl" == true ]]; then
        repo_notes+=("synced .github/ISSUE_TEMPLATE/")
      fi
    fi
    UPDATED_REPOS+=("$(basename "$dir") (${repo_notes[*]})")
  fi
done

echo ""
echo "============================================================"
echo "UniVRse Engineering Delivery Workflow Installed (Fallback)"
echo "============================================================"
echo "Destination : $DEST"
echo "Symlinks    : CLAUDE.md -> AGENTS.md"
echo "              GEMINI.md -> AGENTS.md"
if [[ -n "$CLI_AGENT" || -n "$CLI_ROLE" ]]; then
  echo "Note        : Node.js >= 18 was not detected; install Node 18+ and run 'npx univrse-workflow' for Coding Agent & Role profile injection."
fi
if [[ ${#UPDATED_REPOS[@]} -gt 0 ]]; then
  echo "Git Repos   : ${UPDATED_REPOS[*]}"
fi
