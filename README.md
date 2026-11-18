# UniVRse Workflow

Unified cross-harness multi-agent engineering workflow for **Claude Code**, **OpenAI Codex**, and **Google Antigravity / Gemini CLI**.

It enforces a closed-loop **8-Stage Delivery Pipeline**:

> **Feature Request Milestone & PM Review Gate** (`gh issue create --milestone "Feature Request"` / `status:pm-review` $\rightarrow$ `status:pm-approved`) $\rightarrow$ **Tech Lead Decomposition & Isolated Git Worktree** (`worktrees/<type>-issue-<num>-<slug>`) $\rightarrow$ **`.env` Parity & Local Self-Test** $\rightarrow$ **Independent `qa-engineer` Sign-Off** $\rightarrow$ **User Checkpoint #1: PR & Merge to `staging`** $\rightarrow$ **Staging CI + QA Verification (`60000000001` Smoke Lock) + PM Staging Acceptance (`[PM APPROVED FOR MAIN]`)** $\rightarrow$ **User Checkpoint #2: Merge `staging` $\rightarrow$ `main` (`master`), PM Release Closure & Cleanup**

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
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── config.yml          # Disables blank issues; links workflow guide
│       └── feature_request.yml # Standardized Feature Request Issue Form (Milestone + PM Review)
├── .agents/
│   ├── mcp_config.json         # Agent MCP server config
│   └── agents/                 # 10 specialist subagent profiles (Carbon/Argon/Hydrogen)
│       ├── product-manager.md
│       ├── software-architect.md
│       ├── security-engineer.md
│       ├── orchestrator.md
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       ├── devops-engineer.md
│       ├── qa-engineer.md
│       ├── auditor.md
│       └── taskboard-manager.md
└── UniVRse-2.0/                # (Optional via --with-repo) UniVRse-Interactive/UniVRse-OS.git
    └── .github/ISSUE_TEMPLATE/ # Synced Feature Request Issue Form & config
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

## Feature Request Milestone & PM Review Process

Every new feature request MUST use the standardized GitHub Issue Form at `.github/ISSUE_TEMPLATE/feature_request.yml` (blank issues are disabled via `.github/ISSUE_TEMPLATE/config.yml`) and be assigned to the **`Feature Request`** Milestone:

```bash
gh issue create \
  --milestone "Feature Request" \
  --label "type:feature,status:pm-review" \
  --title "[FEAT]: <concise feature title>" \
  --body-file <structured-feature-body.md>
```

### PM Review Gates (`product-manager`)

1. **Stage 1 — Intake & PM Review Gate (`status:pm-review` $\rightarrow$ `status:pm-approved`)**:
   - New feature issues enter with `type:feature` and `status:pm-review` under the **`Feature Request`** Milestone.
   - `product-manager` (Gemini 4 Carbon) reviews business value, refines the User Story and Gherkin Acceptance Criteria (Happy Path, Validation/Error Handling, Boundary/Tenant Isolation & `60000000001` Smoke Lock), and verifies Modified Fibonacci Story Points (`<= 8`; `13`-point requests MUST be split before engineering starts).
   - Once approved, `product-manager` swaps `status:pm-review` $\rightarrow$ `status:pm-approved` and hands off to `software-architect` (Tech Lead) to define `Allowed Paths` and open/prepare the local Git Worktree implementation.
2. **Stage 7 — PM Staging Acceptance (`[PM APPROVED FOR MAIN]`)**:
   - After PR merge to `staging`, Staging CI passes, and `qa-engineer` completes staging verification using test phone `60000000001`, `product-manager` validates all Gherkin ACs on Staging and posts **`[PM APPROVED FOR MAIN]`** before **User Checkpoint #2** (`staging` $\rightarrow$ `main`/`master`).
3. **Stage 8 — PM Release Closure**:
   - After `staging` merges into `main`/`master` and production deploy succeeds, `product-manager` verifies production release notes, confirms the `Feature Request` Milestone issue closes cleanly with a release summary comment, and ensures worktree/branch cleanup is recorded.

---

## Core Safety & Domain Locks (`UniVRse-2.0/CLAUDE.md`)

- **GitHub Issues & Feature Request Milestone Only**: All tasks are tracked via GitHub Issues (`gh issue` / GitHub MCP), with new features routed through the **`Feature Request`** Milestone and `.github/ISSUE_TEMPLATE/feature_request.yml`.
- **Smoke Test Phone Lock**: All internal and staging smoke tests MUST use `60000000001` exclusively — production line `60187777876` is strictly banned from tests.
- **Worktree & Branch Isolation**: Never commit directly to `main`, `master`, or `staging`; always develop in `worktrees/<type>-issue-<num>-<slug>` on `<type>/issue-<num>-<slug>`.
- **Two Mandatory User Checkpoints**: Always ask user approval before merging to `staging` (Checkpoint #1) and before merging `staging` to `main`/`master` (Checkpoint #2, after `[PM APPROVED FOR MAIN]`).
