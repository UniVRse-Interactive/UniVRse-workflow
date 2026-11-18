#!/usr/bin/env bash
set -euo pipefail

WORKFLOW_REPO="UniVRse-Interactive/UniVRse-workflow"
WORKFLOW_GIT_URL="https://github.com/UniVRse-Interactive/UniVRse-workflow.git"
DEFAULT_UNIVRSE_REPO="UniVRse-Interactive/UniVRse-OS"

DEST=""
WITH_REPO=false
EXTRA_REPOS=()

usage() {
  cat <<'EOF'
UniVRse Workflow Installer (Claude Code + OpenAI Codex + Google Antigravity)

Usage:
  install.sh [OPTIONS] [<destination-path>]

Options:
  -d, --dest <path>     Target workspace directory
      --with-repo       Also clone UniVRse-Interactive/UniVRse-OS into <dest>/UniVRse-2.0
      --repo <owner/name>
                        Clone an additional GitHub repo into <dest>/<name> and ensure
                        worktrees/ is in its .gitignore (can be passed multiple times)
  -h, --help            Show this help message and exit

Examples:
  ./install.sh --dest "$HOME/Desktop/UniVRse workflow"
  ./install.sh --dest "$HOME/Desktop/UniVRse workflow" --with-repo
  ./install.sh --dest "$HOME/Projects/my-app" --repo my-org/my-app
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dest)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Error: $1 requires a path argument." >&2
        exit 1
      fi
      DEST="$2"
      shift 2
      ;;
    --dest=*)
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

if [[ -z "$DEST" ]]; then
  if [[ -t 0 ]]; then
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

SOURCE_DIR=""
TMP_DIR=""
cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

SCRIPT_PATH="${BASH_SOURCE[0]:-}"
if [[ -n "$SCRIPT_PATH" && -f "$SCRIPT_PATH" ]]; then
  CANDIDATE_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
  if [[ -f "$CANDIDATE_DIR/AGENTS.md" && -d "$CANDIDATE_DIR/.agents" ]]; then
    SOURCE_DIR="$CANDIDATE_DIR"
  fi
fi

if [[ -z "$SOURCE_DIR" ]]; then
  echo "-> Running in remote bootstrap mode; fetching $WORKFLOW_REPO..."
  TMP_DIR="$(mktemp -d)"
  if has_authenticated_gh; then
    gh repo clone "$WORKFLOW_REPO" "$TMP_DIR/workflow" -- --depth 1
  else
    git clone --depth 1 "$WORKFLOW_GIT_URL" "$TMP_DIR/workflow"
  fi
  SOURCE_DIR="$TMP_DIR/workflow"
fi

if [[ "$SOURCE_DIR" == "$DEST" ]]; then
  echo "-> Source and destination are identical ($DEST); skipping self-copy."
else
  echo "-> Installing UniVRse workflow files into: $DEST"
  for item in AGENTS.md README.md install.sh .gitignore .mcp.json; do
    if [[ -e "$SOURCE_DIR/$item" ]]; then
      cp -f "$SOURCE_DIR/$item" "$DEST/$item"
    fi
  done
  if [[ -d "$SOURCE_DIR/.agents" ]]; then
    mkdir -p "$DEST/.agents"
    cp -R "$SOURCE_DIR/.agents/." "$DEST/.agents/"
  fi
  if [[ -d "$SOURCE_DIR/.github" ]]; then
    mkdir -p "$DEST/.github"
    cp -R "$SOURCE_DIR/.github/." "$DEST/.github/"
  fi
fi

if [[ -f "$DEST/install.sh" ]]; then
  chmod +x "$DEST/install.sh"
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
echo "UniVRse Workflow Installed Successfully"
echo "============================================================"
echo "Destination : $DEST"
echo "Files       : AGENTS.md, README.md, install.sh, .gitignore, .mcp.json, .agents/, .github/"
echo "Agents (10) : product-manager, software-architect, security-engineer, orchestrator,"
echo "              backend-engineer, frontend-engineer, devops-engineer, qa-engineer,"
echo "              auditor, taskboard-manager"
echo "Symlinks    : CLAUDE.md -> AGENTS.md"
echo "              GEMINI.md -> AGENTS.md"
if [[ ${#UPDATED_REPOS[@]} -gt 0 ]]; then
  echo "Git Repos   : ${UPDATED_REPOS[*]}"
else
  echo "Git Repos   : None found directly under $DEST (re-run or add --with-repo / --repo <owner/name>)"
fi
echo ""
echo "Next Steps:"
echo "  1. Open \"$DEST\" in Claude Code, OpenAI Codex, or Google Antigravity."
echo "  2. If working on UniVRse-2.0, copy .env.example -> .env in any new worktree (never commit .env)."
echo "  3. Submit features under Milestone \"Feature Request\" (gh issue create --milestone \"Feature Request\")"
echo "     and follow the 8-Stage PM Review -> Worktree -> staging -> main workflow in AGENTS.md."
