#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');

const DEFAULT_UNIVRSE_REPO = 'UniVRse-Interactive/UniVRse-OS';

const AGENTS = {
  'claude-code': {
    id: 'claude-code',
    label: 'Claude Code',
    entryFile: 'CLAUDE.md -> AGENTS.md',
  },
  codex: {
    id: 'codex',
    label: 'OpenAI Codex',
    entryFile: 'AGENTS.md',
  },
  antigravity: {
    id: 'antigravity',
    label: 'Antigravity CLI',
    entryFile: 'GEMINI.md -> AGENTS.md (and AGENTS.md)',
  },
  all: {
    id: 'all',
    label: 'All (Claude Code + OpenAI Codex + Antigravity CLI)',
    entryFile: 'AGENTS.md (with CLAUDE.md -> AGENTS.md & GEMINI.md -> AGENTS.md)',
  },
};

const AGENT_ALIASES = new Map([
  ['1', 'claude-code'],
  ['claude', 'claude-code'],
  ['claude-code', 'claude-code'],
  ['claudecode', 'claude-code'],
  ['2', 'codex'],
  ['codex', 'codex'],
  ['openai-codex', 'codex'],
  ['3', 'antigravity'],
  ['antigravity', 'antigravity'],
  ['antigravity-cli', 'antigravity'],
  ['gemini', 'antigravity'],
  ['gemini-cli', 'antigravity'],
  ['4', 'all'],
  ['all', 'all'],
]);

const ROLES = {
  hezri: {
    id: 'hezri',
    label: 'Hezri (Project Owner)',
    focus:
      'Stage 1 Intake & PM Review Gate, Stage 6 & Stage 8 User Checkpoints, Stage 7 PM Staging Sign-Off ([PM APPROVED FOR MAIN]), and Stage 8 Release Closure.',
    responsibilities: [
      'Stage 1 (Intake & PM Review Gate): Triage Feature Request Milestone issues (`status:pm-review`), refine Problem Statement, User Story, and Gherkin ACs (Happy Path, Validation/Error Handling, Boundary/Tenant Isolation + `60000000001` smoke lock), verify Modified Fibonacci Story Points (`<= 8`; split `13`), post PM Review Sign-Off, and swap `status:pm-review` -> `status:pm-approved`.',
      'Stage 6 (User Checkpoint #1): Review local QA verification summary, `.env` parity status, and diffs before authorizing PR & merge into `staging`.',
      'Stage 7 (PM Staging Sign-Off): Audit Staging Verification Report against every Gherkin AC on `https://n8n.univrse.io` (`60000000001` smoke lock only), then post `[PM APPROVED FOR MAIN]` (`status:staging-verified`) or `[PM REJECTED]`.',
      'Stage 8 (User Checkpoint #2 & Release Closure): Authorize `staging` -> `main`/`master` release merge and confirm release closure (`status:done`).',
    ],
    commands: [
      'gh -R UniVRse-Interactive/UniVRse-OS issue list --milestone "Feature Request" --label "status:pm-review"',
      'gh -R UniVRse-Interactive/UniVRse-OS issue edit <num> --remove-label "status:pm-review" --add-label "status:pm-approved"',
      'gh -R UniVRse-Interactive/UniVRse-OS issue comment <num> --body "[PM APPROVED FOR MAIN] Verified Gherkin ACs on staging (60000000001 lock intact)."',
    ],
  },
  asyraaf: {
    id: 'asyraaf',
    label: 'Asyraaf (Frontend and Backend Engineer)',
    focus:
      'Stage 2 Isolated Git Worktree setup, Stage 3 .env Parity, Stage 4 Feature Implementation & Local Self-Testing, Stage 5 Local QA Verification, and Stage 6 Staging PR.',
    responsibilities: [
      'Stage 1 & 2 (Worktree Isolation): Begin only after `status:pm-approved` and locked `Allowed Paths` (`status:in-progress`); create isolated worktree `worktrees/<type>-issue-<num>-<slug>` on `<type>/issue-<num>-<slug>` off `origin/staging` (never commit directly to `main`, `master`, or `staging`).',
      'Stage 3 (`.env` Parity): Copy `.env` into the worktree and verify all required keys against `.env.example` before builds or tests (fail-fast on missing keys; never print or commit secrets).',
      'Stage 4 (Isolated Implementation & Self-Test): Implement strictly inside locked `Allowed Paths`, respecting Hani/Hermes bridge constraints (`run_brain()`, frozen 68/71-node n8n chassis `An5boYbCZW5BaPse`, RAG thresholds `0.65`/`0.55`/`< 0.70`, SLA v2.1 floors), and run `unittest` / `pytest` / lint / typecheck.',
      'Stage 5 & 6 (Local QA & Staging PR): Run full Stage 5 verification using smoke test phone `60000000001` ONLY (never `60187777876`), present results at User Checkpoint #1, and open `staging` PR upon user approval.',
    ],
    commands: [
      'git worktree add worktrees/<type>-issue-<num>-<slug> -b <type>/issue-<num>-<slug> origin/staging',
      'cp .env worktrees/<type>-issue-<num>-<slug>/.env',
      'PYTHONPATH=. python3 -m unittest tests/test_link_full.py tests/test_link_typed.py -v && PYTHONPATH=. python3 -m pytest -v',
      'gh -R UniVRse-Interactive/UniVRse-OS pr create --base staging --head <type>/issue-<num>-<slug>',
    ],
  },
  brendon: {
    id: 'brendon',
    label: 'Brendon (Cloud Architect and DevOps Engineer)',
    focus:
      'Tech Lead Allowed Paths & Architecture contracts, Stage 2 staging branch & CI/CD governance, Stage 3-7 VPS/Docker/n8n lane & security compliance, and Stage 8 Production release & worktree cleanup.',
    responsibilities: [
      'Stage 1 & 2 (Tech Lead Decomposition & Infra Guardrails): Lock disjoint `Allowed Paths`, interface contracts, and Stark 1 Lock impact after PM Review Gate; maintain `origin/staging`, `.github/ISSUE_TEMPLATE/`, and `worktrees/` `.gitignore` rules.',
      'Stage 3, 4 & 5 (Environment, VPS & Security Baseline): Enforce `.env` parity, secrets hygiene, Supabase/VPS/Docker & Tailscale chassis stability, and strict `60000000001` smoke test lock compliance.',
      'Stage 6 & 7 (Staging CI & Lane Separation): Monitor `staging` GitHub Actions CI, verify `https://n8n.univrse.io` (port `5678`) health and SLA v2.1 latency floors, and protect PROD (`n8n-prod.univrse.io` / port `5679` / `nginx`) unless written Stark + Hezri directive exists.',
      'Stage 8 (Production Release & Cleanup): After `[PM APPROVED FOR MAIN]` and User Checkpoint #2 approval, open & merge `staging` -> `main`/`master` release PR, verify prod deploy, and run `git worktree remove` / `git worktree prune`.',
    ],
    commands: [
      'gh -R UniVRse-Interactive/UniVRse-OS run list --branch staging --limit 5',
      'gh -R UniVRse-Interactive/UniVRse-OS pr create --base master --head staging --title "release: merge verified staging (#<num>)"',
      'git worktree remove worktrees/<type>-issue-<num>-<slug> && git worktree prune',
    ],
  },
};

const ROLE_ALIASES = new Map([
  ['1', 'hezri'],
  ['hezri', 'hezri'],
  ['po', 'hezri'],
  ['pm', 'hezri'],
  ['project-owner', 'hezri'],
  ['2', 'asyraaf'],
  ['asyraaf', 'asyraaf'],
  ['dev', 'asyraaf'],
  ['engineer', 'asyraaf'],
  ['fullstack', 'asyraaf'],
  ['3', 'brendon'],
  ['brendon', 'brendon'],
  ['architect', 'brendon'],
  ['devops', 'brendon'],
  ['cloud-architect', 'brendon'],
]);

function expandHome(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function lstatSafe(targetPath) {
  try {
    return fs.lstatSync(targetPath);
  } catch {
    return null;
  }
}

function isDir(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function isFile(targetPath) {
  try {
    return fs.statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

function detectDefaultProjectPath() {
  const cwd = process.cwd();
  const cwdUniVRse = path.resolve(cwd, 'UniVRse-2.0');
  if (isDir(cwdUniVRse)) {
    return cwdUniVRse;
  }

  const base = path.basename(cwd);
  if (
    base === 'UniVRse-2.0' ||
    base === 'UniVRse-OS' ||
    (isFile(path.join(cwd, '.env.example')) && isDir(path.join(cwd, 'hermes')))
  ) {
    return cwd;
  }

  const desktopUniVRse = path.join(os.homedir(), 'Desktop', 'UniVRse workflow', 'UniVRse-2.0');
  if (isDir(desktopUniVRse)) {
    return desktopUniVRse;
  }

  return cwdUniVRse;
}

function printPostinstallBanner() {
  console.log(`
====================================================================
  UniVRse Workflow — NPM Install Instructions
====================================================================
  Standardizes AGENTS.md inside your UniVRse OS project directory
  for Claude Code, OpenAI Codex, and Antigravity CLI with role-based
  Stage 1-8 guidance (Hezri, Asyraaf, Brendon).

  Run the interactive installer:
    npx univrse-workflow
    # or inside this package:
    npm run setup

  Non-interactive flags:
    npx univrse-workflow --agent <claude-code|codex|antigravity|all> \\
                         --role <hezri|asyraaf|brendon> \\
                         --dest <path-to-UniVRse-OS>

  Examples:
    npx univrse-workflow --agent all --role brendon --dest ./UniVRse-2.0
    npx univrse-workflow --agent claude-code --role asyraaf --with-repo --dest ./UniVRse-2.0
    npx univrse-workflow --help
====================================================================
`);
}

function printHelp() {
  console.log(`UniVRse Workflow CLI Installer (Zero-Dependency Node.js ESM)

Usage:
  univrse-workflow [OPTIONS] [<destination-path>]

Options:
  --agent <name>        Coding agent: claude-code | codex | antigravity | all
                        (aliases: claude, antigravity-cli)
  --role <name>         Team role: hezri | asyraaf | brendon
  -d, --dest <path>     Target UniVRse OS project directory
  --project <path>      Alias for --dest
  --with-repo           Clone ${DEFAULT_UNIVRSE_REPO} into <dest> if missing
  --repo <owner/name>   Clone an additional GitHub repo and ensure worktrees/ is gitignored
  -y, --yes             Accept defaults non-interactively without prompting
  --postinstall         Print NPM postinstall usage instructions and exit 0
  -h, --help            Show this help message and exit

Coding Agents:
  1) Claude Code                  (reads CLAUDE.md -> AGENTS.md)
  2) OpenAI Codex                 (reads AGENTS.md)
  3) Antigravity CLI              (reads GEMINI.md -> AGENTS.md)
  4) All [default]                (standardizes all three on AGENTS.md)

Team Roles:
  1) Hezri   (Project Owner)
  2) Asyraaf (Frontend and Backend Engineer)
  3) Brendon (Cloud Architect and DevOps Engineer) [default]

Examples:
  npx univrse-workflow
  npx univrse-workflow --agent all --role brendon --dest "./UniVRse-2.0"
  npx univrse-workflow --agent claude-code --role asyraaf --with-repo --dest ./UniVRse-2.0
`);
}

function printInstallInstructionsBanner() {
  console.log(`
====================================================================
  UniVRse OS — Engineering Delivery Workflow Setup
====================================================================
  This installer sets up the canonical End-to-End 8-Stage Delivery
  Pipeline inside your UniVRse OS project directory:

    Stage 1: Feature Issue & PM Review Gate (Feature Request Milestone)
    Stage 2: Isolated Git Worktree (worktrees/<type>-issue-<num>-<slug>)
    Stage 3: .env Parity Check (.env vs .env.example — fail-fast)
    Stage 4: Isolated Implementation & Local Self-Testing
    Stage 5: Local QA Verification (60000000001 Smoke Lock)
    Stage 6: User Checkpoint #1 (PR & Merge -> staging)
    Stage 7: Staging Verify & PM Staging Sign-Off ([PM APPROVED FOR MAIN])
    Stage 8: User Checkpoint #2 (Release -> main/master & Cleanup)

  All selected coding agents (Claude Code, OpenAI Codex, Antigravity CLI)
  are standardized onto AGENTS.md as the single source of truth via
  relative symlinks (CLAUDE.md -> AGENTS.md, GEMINI.md -> AGENTS.md).
====================================================================
`);
}

function normalizeAgent(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  const mapped = AGENT_ALIASES.get(key);
  return mapped || null;
}

function normalizeRole(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  const mapped = ROLE_ALIASES.get(key);
  return mapped || null;
}

function parseArgs(argv) {
  const opts = {
    postinstall: false,
    help: false,
    yes: false,
    withRepo: false,
    extraRepos: [],
    agent: null,
    role: null,
    dest: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--postinstall') {
      opts.postinstall = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
      continue;
    }
    if (arg === '-y' || arg === '--yes') {
      opts.yes = true;
      continue;
    }
    if (arg === '--with-repo') {
      opts.withRepo = true;
      continue;
    }
    if (arg === '--agent' || arg.startsWith('--agent=')) {
      const val = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[++i];
      if (!val) throw new Error('Option --agent requires a value.');
      const normalized = normalizeAgent(val);
      if (!normalized) {
        throw new Error(
          `Invalid --agent value "${val}". Expected: claude-code, codex, antigravity, or all.`
        );
      }
      opts.agent = normalized;
      continue;
    }
    if (arg === '--role' || arg.startsWith('--role=')) {
      const val = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[++i];
      if (!val) throw new Error('Option --role requires a value.');
      const normalized = normalizeRole(val);
      if (!normalized) {
        throw new Error(
          `Invalid --role value "${val}". Expected: hezri, asyraaf, or brendon.`
        );
      }
      opts.role = normalized;
      continue;
    }
    if (
      arg === '-d' ||
      arg === '--dest' ||
      arg === '--project' ||
      arg.startsWith('--dest=') ||
      arg.startsWith('--project=')
    ) {
      const val = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[++i];
      if (!val) throw new Error(`Option ${arg.split('=')[0]} requires a path argument.`);
      opts.dest = val;
      continue;
    }
    if (arg === '--repo' || arg.startsWith('--repo=')) {
      const val = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[++i];
      if (!val) throw new Error('Option --repo requires an <owner/name> argument.');
      opts.extraRepos.push(val);
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (!opts.dest) {
      opts.dest = arg;
    } else {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
  }

  return opts;
}

function hasAuthenticatedGh() {
  const res = spawnSync('gh', ['auth', 'status'], { stdio: 'ignore' });
  return res.status === 0;
}

function cloneGitHubRepo(repoSlug, targetDir) {
  if (lstatSafe(targetDir)) {
    console.log(`-> Skipping clone for ${repoSlug} (${targetDir} already exists)`);
    return;
  }

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  console.log(`-> Cloning ${repoSlug} into ${targetDir}...`);

  let res;
  if (hasAuthenticatedGh()) {
    res = spawnSync('gh', ['repo', 'clone', repoSlug, targetDir], { stdio: 'inherit' });
  } else {
    res = spawnSync('git', ['clone', `https://github.com/${repoSlug}.git`, targetDir], {
      stdio: 'inherit',
    });
  }

  if (res.status !== 0) {
    throw new Error(`Failed to clone repository ${repoSlug} into ${targetDir}.`);
  }
}

function ensureGitignoreEntries(dirPath, entries) {
  const giPath = path.join(dirPath, '.gitignore');
  let content = '';
  if (fs.existsSync(giPath)) {
    content = fs.readFileSync(giPath, 'utf8');
  }

  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const added = [];

  for (const entry of entries) {
    if (!lines.includes(entry)) {
      if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
      }
      content += `${entry}\n`;
      lines.push(entry);
      added.push(entry);
    }
  }

  if (added.length > 0 || !fs.existsSync(giPath)) {
    fs.writeFileSync(giPath, content, 'utf8');
  }

  return added;
}

function buildOperatorProfileHeader(agentMeta, roleMeta, hasDomainManual) {
  const domainManualLine = hasDomainManual
    ? '- **Domain Manual**: [`./docs/UNIVRSE_OS_DOMAIN_MANUAL.md`](./docs/UNIVRSE_OS_DOMAIN_MANUAL.md) *(preserved from original repository `CLAUDE.md` — MUST be read and honored alongside this 8-stage delivery workflow)*.'
    : '- **Domain Manual**: Honor `./docs/UNIVRSE_OS_DOMAIN_MANUAL.md` (or repo domain manual) whenever present alongside this 8-stage delivery workflow.';

  const responsibilitiesBlock = roleMeta.responsibilities
    .map((item) => `  - ${item}`)
    .join('\n');
  const commandsBlock = roleMeta.commands.map((cmd) => `  - \`${cmd}\``).join('\n');

  return `<!-- UNIVRSE_OPERATOR_PROFILE_START -->
## Active UniVRse OS Operator Profile

- **Coding Agent**: ${agentMeta.label} (\`${agentMeta.id}\`)
- **Active Role**: **${roleMeta.label}** (\`${roleMeta.id}\`)
- **Role Focus**: ${roleMeta.focus}
- **Standardization**: All coding agents (Claude Code, OpenAI Codex, Antigravity CLI) read \`AGENTS.md\` as the single canonical source of truth (\`CLAUDE.md -> AGENTS.md\`, \`GEMINI.md -> AGENTS.md\`).
${domainManualLine}

### Role Stage 1–8 Responsibilities (${roleMeta.label})
${responsibilitiesBlock}

### Role Quick Command Reminders
${commandsBlock}
<!-- UNIVRSE_OPERATOR_PROFILE_END -->

`;
}

function createRelativeSymlink(targetFileName, linkPath) {
  const existing = lstatSafe(linkPath);
  if (existing) {
    if (existing.isDirectory() && !existing.isSymbolicLink()) {
      fs.rmSync(linkPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(linkPath);
    }
  }
  fs.symlinkSync(targetFileName, linkPath);
}

async function promptSelection(rl, promptText, normalizer, defaultKey, invalidMsg) {
  while (true) {
    const answer = await rl.question(promptText);
    const trimmed = answer.trim();
    if (!trimmed && defaultKey) {
      return defaultKey;
    }
    const normalized = normalizer(trimmed);
    if (normalized) {
      return normalized;
    }
    console.log(invalidMsg);
  }
}

async function resolveInteractiveSelections(opts) {
  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const defaultDest = detectDefaultProjectPath();

  if (opts.yes || !isTTY) {
    return {
      agent: opts.agent || 'all',
      role: opts.role || 'brendon',
      dest: path.resolve(expandHome(opts.dest || defaultDest)),
    };
  }

  printInstallInstructionsBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let agent = opts.agent;
    if (!agent) {
      console.log('Select Coding Agent:');
      console.log('  1) Claude Code');
      console.log('  2) OpenAI Codex');
      console.log('  3) Antigravity CLI');
      console.log('  4) All (Claude Code + Codex + Antigravity CLI) [default]');
      agent = await promptSelection(
        rl,
        'Enter choice [1-4, default 4]: ',
        normalizeAgent,
        'all',
        'Invalid selection. Please enter 1, 2, 3, or 4 (or agent name).'
      );
      console.log('');
    }

    let role = opts.role;
    if (!role) {
      console.log('Select Team Role:');
      console.log('  1) Hezri (Project Owner)');
      console.log('  2) Asyraaf (Frontend and Backend Engineer)');
      console.log('  3) Brendon (Cloud Architect and DevOps Engineer) [default]');
      role = await promptSelection(
        rl,
        'Enter choice [1-3, default 3]: ',
        normalizeRole,
        'brendon',
        'Invalid selection. Please enter 1, 2, or 3 (or role name).'
      );
      console.log('');
    }

    let rawDest = opts.dest;
    if (!rawDest) {
      const answer = await rl.question(
        `Project Location (UniVRse OS) [default: ${defaultDest}]: `
      );
      rawDest = answer.trim() || defaultDest;
      console.log('');
    }

    return {
      agent,
      role,
      dest: path.resolve(expandHome(rawDest)),
    };
  } finally {
    rl.close();
  }
}

function installIntoProject({ agent, role, dest, withRepo, extraRepos }) {
  const agentMeta = AGENTS[agent];
  const roleMeta = ROLES[role];

  if (dest === PACKAGE_ROOT) {
    throw new Error(
      `Refusing to overwrite template source AGENTS.md in package root (${PACKAGE_ROOT}). Pass --dest <UniVRse-OS-path> (for example, ${path.join(PACKAGE_ROOT, 'UniVRse-2.0')}).`
    );
  }

  // 1. Ensure <dest> exists (optionally clone UniVRse-OS if --with-repo)
  if (withRepo && !lstatSafe(dest)) {
    cloneGitHubRepo(DEFAULT_UNIVRSE_REPO, dest);
  } else {
    fs.mkdirSync(dest, { recursive: true });
    if (withRepo && !lstatSafe(path.join(dest, '.git'))) {
      const entries = fs.readdirSync(dest);
      if (entries.length === 0) {
        fs.rmdirSync(dest);
        cloneGitHubRepo(DEFAULT_UNIVRSE_REPO, dest);
      } else {
        console.log(`-> Skipping clone for ${DEFAULT_UNIVRSE_REPO} (${dest} already exists and is non-empty)`);
      }
    }
  }

  // 2. Preserve pre-existing regular-file CLAUDE.md Domain Manual before replacing with symlink
  const claudePath = path.join(dest, 'CLAUDE.md');
  const domainManualPath = path.join(dest, 'docs', 'UNIVRSE_OS_DOMAIN_MANUAL.md');
  const claudeStat = lstatSafe(claudePath);
  let preservedDomainManual = false;

  if (claudeStat && claudeStat.isFile() && !claudeStat.isSymbolicLink()) {
    if (!fs.existsSync(domainManualPath)) {
      fs.mkdirSync(path.dirname(domainManualPath), { recursive: true });
      fs.copyFileSync(claudePath, domainManualPath);
      preservedDomainManual = true;
    }
  }
  const hasDomainManual = fs.existsSync(domainManualPath);

  // 3. Install standardized <dest>/AGENTS.md with Active UniVRse OS Operator Profile
  const templateAgentsPath = path.join(PACKAGE_ROOT, 'AGENTS.md');
  if (!fs.existsSync(templateAgentsPath)) {
    throw new Error(`Template AGENTS.md not found at ${templateAgentsPath}`);
  }
  const templateContent = fs.readFileSync(templateAgentsPath, 'utf8');
  const operatorHeader = buildOperatorProfileHeader(agentMeta, roleMeta, hasDomainManual);
  const destAgentsPath = path.join(dest, 'AGENTS.md');
  fs.writeFileSync(destAgentsPath, `${operatorHeader}${templateContent}`, 'utf8');

  // 4. Standardize all coding agents via relative symlinks to AGENTS.md
  createRelativeSymlink('AGENTS.md', path.join(dest, 'CLAUDE.md'));
  createRelativeSymlink('AGENTS.md', path.join(dest, 'GEMINI.md'));

  // 5. Copy .github/ISSUE_TEMPLATE/{feature_request.yml,config.yml}
  const srcTemplateDir = path.join(PACKAGE_ROOT, '.github', 'ISSUE_TEMPLATE');
  const destTemplateDir = path.join(dest, '.github', 'ISSUE_TEMPLATE');
  const syncedTemplates = [];
  if (isDir(srcTemplateDir)) {
    fs.mkdirSync(destTemplateDir, { recursive: true });
    for (const fileName of ['feature_request.yml', 'config.yml']) {
      const srcFile = path.join(srcTemplateDir, fileName);
      if (isFile(srcFile)) {
        fs.copyFileSync(srcFile, path.join(destTemplateDir, fileName));
        syncedTemplates.push(fileName);
      }
    }
  }

  // 6. Copy .mcp.json and .agents/mcp_config.json if missing
  const copiedConfigs = [];
  const srcMcp = path.join(PACKAGE_ROOT, '.mcp.json');
  const destMcp = path.join(dest, '.mcp.json');
  if (isFile(srcMcp) && !fs.existsSync(destMcp)) {
    fs.copyFileSync(srcMcp, destMcp);
    copiedConfigs.push('.mcp.json');
  }

  const srcAgentsMcp = path.join(PACKAGE_ROOT, '.agents', 'mcp_config.json');
  const destAgentsMcp = path.join(dest, '.agents', 'mcp_config.json');
  if (isFile(srcAgentsMcp) && !fs.existsSync(destAgentsMcp)) {
    fs.mkdirSync(path.dirname(destAgentsMcp), { recursive: true });
    fs.copyFileSync(srcAgentsMcp, destAgentsMcp);
    copiedConfigs.push('.agents/mcp_config.json');
  }

  // 7. Ensure worktrees/ and .univrse-workflow.json are in <dest>/.gitignore
  const addedGitignore = ensureGitignoreEntries(dest, ['worktrees/', '.univrse-workflow.json']);

  // Optional --repo clones
  const clonedExtraRepos = [];
  for (const repoSlug of extraRepos) {
    const rawName = repoSlug.split('/').pop() || repoSlug;
    const repoName = rawName.replace(/\.git$/, '');
    const extraTarget = lstatSafe(path.join(dest, '.git'))
      ? path.join(path.dirname(dest), repoName)
      : path.join(dest, repoName);
    cloneGitHubRepo(repoSlug, extraTarget);
    if (isDir(extraTarget)) {
      ensureGitignoreEntries(extraTarget, ['worktrees/', '.univrse-workflow.json']);
      clonedExtraRepos.push(`${repoSlug} -> ${extraTarget}`);
    }
  }

  // 8. Write <dest>/.univrse-workflow.json
  const metadata = {
    codingAgent: agentMeta.id,
    codingAgentLabel: agentMeta.label,
    role: roleMeta.id,
    roleLabel: roleMeta.label,
    projectPath: dest,
    standardizedFile: 'AGENTS.md',
    symlinks: ['CLAUDE.md -> AGENTS.md', 'GEMINI.md -> AGENTS.md'],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(dest, '.univrse-workflow.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8'
  );

  // 9. Print completion summary
  console.log('====================================================================');
  console.log('  UniVRse OS Workflow Standardized Successfully');
  console.log('====================================================================');
  console.log(`Project Path     : ${dest}`);
  console.log(`Coding Agent     : ${agentMeta.label} (${agentMeta.id})`);
  console.log(`Active Role      : ${roleMeta.label}`);
  console.log('Standardized     : AGENTS.md (with Active UniVRse OS Operator Profile)');
  console.log('Symlinks         : CLAUDE.md -> AGENTS.md');
  console.log('                   GEMINI.md -> AGENTS.md');
  if (preservedDomainManual) {
    console.log('Domain Manual    : Preserved original CLAUDE.md -> docs/UNIVRSE_OS_DOMAIN_MANUAL.md');
  } else if (hasDomainManual) {
    console.log('Domain Manual    : docs/UNIVRSE_OS_DOMAIN_MANUAL.md (detected)');
  }
  if (syncedTemplates.length > 0) {
    console.log(`Issue Templates  : .github/ISSUE_TEMPLATE/{${syncedTemplates.join(', ')}}`);
  }
  if (copiedConfigs.length > 0) {
    console.log(`MCP Configs      : ${copiedConfigs.join(', ')} (copied)`);
  } else {
    console.log('MCP Configs      : Existing configs preserved');
  }
  console.log(
    `Gitignore        : ${
      addedGitignore.length > 0
        ? `Added ${addedGitignore.join(', ')}`
        : 'worktrees/ and .univrse-workflow.json already ignored'
    }`
  );
  console.log('State Metadata   : .univrse-workflow.json');
  if (clonedExtraRepos.length > 0) {
    console.log(`Extra Repos      : ${clonedExtraRepos.join('; ')}`);
  }

  console.log('\nRole-Specific Next Steps:');
  roleMeta.responsibilities.forEach((step, idx) => {
    console.log(`  ${idx + 1}. ${step}`);
  });
  console.log('\nQuick Commands:');
  roleMeta.commands.forEach((cmd) => {
    console.log(`  $ ${cmd}`);
  });
  console.log('');
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Run with --help to see supported options.');
    process.exit(1);
  }

  if (opts.postinstall) {
    printPostinstallBanner();
    process.exit(0);
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const resolved = await resolveInteractiveSelections(opts);
  installIntoProject({
    agent: resolved.agent,
    role: resolved.role,
    dest: resolved.dest,
    withRepo: opts.withRepo,
    extraRepos: opts.extraRepos,
  });
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
