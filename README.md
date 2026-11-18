# UniVRse Workflow

Unified cross-harness multi-agent engineering workflow for **Claude Code**, **OpenAI Codex**, and **Google Antigravity / Gemini CLI**.

It enforces a closed-loop **8-Stage Delivery Pipeline**:

> **GitHub Issues** (`gh issue` / GitHub MCP) $\rightarrow$ **Isolated Git Worktree** (`worktrees/<type>-issue-<num>-<slug>`) $\rightarrow$ **`.env` Parity & Local Self-Test** $\rightarrow$ **Independent `qa-engineer` Sign-Off** $\rightarrow$ **User Checkpoint #1: PR & Merge to `staging`** $\rightarrow$ **Staging CI + Staging Verification (`60000000001` Smoke Test Lock)** $\rightarrow$ **User Checkpoint #2: Merge `staging` $\rightarrow$ `main` (`master`) & Cleanup**

---

## Workspace Layout

```text
<your-destination-folder>/
├── AGENTS.md                   # Canonical cross-harness workflow & orchestration spec
├── CLAUDE.md -> AGENTS.md      # Relative symlink for Claude Code
├── GEMINI.md -> AGENTS.md      # Relative symlink for Google Antigravity / Gemini CLI
├── README.md                   # Setup & usage guide
├── install.sh                  # Portable workspace installer (local & remote bootstrap)
├── .gitignore                  # Ignores nested repos (UniVRse-2.0/), worktrees/, and .env*
├── .mcp.json                   # Unified workspace MCP servers (slack, supabase)
├── .agents/
│   ├── mcp_config.json         # Agent MCP server config
│   └── agents/                 # 9 specialist subagent profiles (pro/flash, no invalid tool keys)
└── UniVRse-2.0/                # (Optional via --with-repo) UniVRse-Interactive/UniVRse-OS.git
```

---

## Installation & Destination Setup

Choose any of the options below to download, install, and configure the workflow into your desired folder.

### Option 1 — One-Command Remote Download & Install to Custom Destination (via GitHub CLI `gh`)

```bash
bash <(gh api repos/UniVRse-Interactive/UniVRse-workflow/contents/install.sh -H "Accept: application/vnd.github.raw") --dest "/path/to/your/folder"
```

*(With `UniVRse-2.0` repo auto-cloned inside the destination)*:

```bash
bash <(gh api repos/UniVRse-Interactive/UniVRse-workflow/contents/install.sh -H "Accept: application/vnd.github.raw") --dest "/path/to/your/folder" --with-repo
```

### Option 2 — Clone & Run Installer with Destination Path

```bash
git clone https://github.com/UniVRse-Interactive/UniVRse-workflow.git /tmp/univrse-workflow && /tmp/univrse-workflow/install.sh --dest "/path/to/your/folder"
```

### Option 3 — Direct Clone into Target Destination

```bash
gh repo clone UniVRse-Interactive/UniVRse-workflow "/path/to/your/folder" && "/path/to/your/folder/install.sh" --dest "/path/to/your/folder"
```

### Option 4 — `curl` One-Liner (Public Repo)

```bash
curl -fsSL https://raw.githubusercontent.com/UniVRse-Interactive/UniVRse-workflow/main/install.sh | bash -s -- --dest "/path/to/your/folder"
```

### Additional Installer Flags

- `--dest <path>` / `-d <path>`: Set the destination directory (or pass as first positional arg; interactive shells prompt with default `$HOME/Desktop/UniVRse workflow`).
- `--with-repo`: Clone `UniVRse-Interactive/UniVRse-OS` into `<dest>/UniVRse-2.0` if not present and verify `worktrees/` is in `.gitignore`.
- `--repo <owner/name>`: Clone any additional GitHub repository into `<dest>/<name>` and ensure `worktrees/` is present in its `.gitignore`.
- `-h` / `--help`: Display CLI usage help.

---

## Core Safety & Domain Locks (`UniVRse-2.0/CLAUDE.md`)

- **GitHub Issues Only**: All tasks are tracked via GitHub Issues (`gh issue` / GitHub MCP).
- **Smoke Test Phone Lock**: All internal and staging smoke tests MUST use `60000000001` exclusively — production line `60187777876` is strictly banned from tests.
- **Worktree & Branch Isolation**: Never commit directly to `main`, `master`, or `staging`; always develop in `worktrees/<type>-issue-<num>-<slug>` on `<type>/issue-<num>-<slug>`.
- **Two Mandatory User Checkpoints**: Always ask user approval before merging to `staging` (Checkpoint #1) and before merging `staging` to `main`/`master` (Checkpoint #2).
