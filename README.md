# UniVRse Engineering Delivery Workflow

Single-workflow **End-to-End 8-Stage Delivery Pipeline** for **Claude Code** (`CLAUDE.md`), **OpenAI Codex** (`AGENTS.md`), and **Google Antigravity** (`GEMINI.md`).

![UniVRse End-to-End 8-Stage Delivery Pipeline](univrse-workflow-diagram.png)

> **Stage 1: Intake & PM Review Gate** (`gh issue create --milestone "Feature Request"` / `status:pm-review` $\rightarrow$ `status:pm-approved`) $\rightarrow$ **Stage 2: Isolated Git Worktree** (`worktrees/<type>-issue-<num>-<slug>`) $\rightarrow$ **Stage 3: `.env` Parity & Docker Pre-Flight** $\rightarrow$ **Stage 4: Implementation & Local Self-Test** $\rightarrow$ **Stage 5: Independent QA Verification** $\rightarrow$ **Stage 6: User Checkpoint #1 (PR & Merge to `staging`)** $\rightarrow$ **Stage 7: Staging CI, QA Verify (`60000000001` Smoke Lock) & PM Staging Sign-Off (`[PM APPROVED FOR MAIN]`)** $\rightarrow$ **Stage 8: User Checkpoint #2 (Merge `staging` $\rightarrow$ `main`/`master`, Release Closure & Cleanup)**

---

## Workspace Layout

```text
<your-destination-folder>/
├── AGENTS.md                       # Canonical cross-harness 8-Stage Delivery Pipeline spec
├── CLAUDE.md -> AGENTS.md          # Relative symlink for Claude Code
├── GEMINI.md -> AGENTS.md          # Relative symlink for Google Antigravity
├── README.md                       # Setup & usage guide
├── install.sh                      # Portable workspace installer (local & remote bootstrap)
├── univrse-workflow-diagram.png    # Visual 8-Stage Delivery Pipeline diagram
├── .gitignore                      # Ignores nested repos (UniVRse-2.0/), worktrees/, and .env*
├── .mcp.json                       # Unified workspace MCP servers (slack, supabase)
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── config.yml              # Disables blank issues; links workflow guide
│       └── feature_request.yml     # Standardized Feature Request Issue Form (Milestone + PM Review)
├── .agents/
│   └── mcp_config.json             # Agent MCP server config
└── UniVRse-2.0/                    # (Optional via --with-repo) UniVRse-Interactive/UniVRse-OS.git
    └── .github/ISSUE_TEMPLATE/     # Synced Feature Request Issue Form & config
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

### PM Review & Checkpoint Gates

1. **Stage 1 — Intake & PM Review Gate (`status:pm-review` $\rightarrow$ `status:pm-approved`)**:
   - New feature issues enter with `type:feature` and `status:pm-review` under the **`Feature Request`** Milestone.
   - PM reviews business value, refines the User Story and Gherkin Acceptance Criteria (Happy Path, Validation/Error Handling, Boundary/Tenant Isolation & `60000000001` Smoke Lock), and verifies Modified Fibonacci Story Points (`<= 8`; `13`-point requests MUST be split before engineering starts).
   - Once approved, swap `status:pm-review` $\rightarrow$ `status:pm-approved` and proceed to **Stage 2 — Worktree** (`worktrees/<type>-issue-<num>-<slug>`).
2. **Stage 6 — Staging PR Checkpoint (User Checkpoint #1)**:
   - After `.env` parity, local implementation, self-tests, and independent QA sign-off pass, ask for explicit user approval before opening/merging the PR into `staging`.
3. **Stage 7 — Staging Verify & PM Staging Sign-Off (`[PM APPROVED FOR MAIN]`)**:
   - After PR merge to `staging`, Staging CI passes, and staging QA verification completes using test phone `60000000001`, PM validates all Gherkin ACs on Staging and posts **`[PM APPROVED FOR MAIN]`** before **User Checkpoint #2**.
4. **Stage 8 — Main Release Checkpoint (User Checkpoint #2) & Release Closure**:
   - Ask for explicit user approval before merging `staging` $\rightarrow$ `main`/`master`; once production deploy succeeds, record release notes, close the `Feature Request` Milestone issue with a release summary comment, and clean up the worktree/branch.

---

## Core Safety & Domain Locks (`UniVRse-2.0/CLAUDE.md`)

- **GitHub Issues & Feature Request Milestone Only**: All tasks are tracked via GitHub Issues (`gh issue` / GitHub MCP), with new features routed through the **`Feature Request`** Milestone and `.github/ISSUE_TEMPLATE/feature_request.yml`.
- **Smoke Test Phone Lock**: All internal and staging smoke tests MUST use `60000000001` exclusively — production line `60187777876` is strictly banned from tests.
- **Worktree & Branch Isolation**: Never commit directly to `main`, `master`, or `staging`; always develop in `worktrees/<type>-issue-<num>-<slug>` on `<type>/issue-<num>-<slug>`.
- **Two Mandatory User Checkpoints**: Always ask user approval before merging to `staging` (Checkpoint #1) and before merging `staging` to `main`/`master` (Checkpoint #2, after `[PM APPROVED FOR MAIN]`).
