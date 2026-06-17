# Core-Gate

**Core-Gate is an open-source PR quality gate for Bitcoin Core built as a GitHub Actions workflow. It automatically scores every incoming pull request against Bitcoin Core's official contribution guidelines and routes it before a single maintainer reads it — high-quality PRs go straight to the review queue, low-quality PRs get specific AI-generated feedback telling the contributor exactly what to fix.**

Bitcoin Core is the reference implementation powering the global Bitcoin network. It is one of the most security-critical open source projects in existence — a bug in consensus code can cost the ecosystem billions. Yet maintainers are increasingly buried under a flood of low-quality and AI-generated pull requests. As of March 2026, AI agents alone generate 17 million PRs per month across GitHub — a 325% increase in six months — and only 1 in 10 is legitimate. Bitcoin Core's existing CI pipeline takes over an hour per PR and only verifies that code compiles and tests pass. It does nothing to filter contribution quality.

Core-Gate fixes that. It runs as a second, parallel workflow alongside Bitcoin Core's existing CI — touching nothing they already have — and gives maintainers a labeled, scored queue instead of a raw pile of PRs.

---

## The Problem

Bitcoin Core has 325+ open pull requests at any given time. Each one requires a maintainer to open it, read the description, scan the diff, check for tests, and decide if it deserves deeper review. That process takes 10-15 minutes minimum per PR even before any code review happens.

Bitcoin Core's existing CI checks whether the code is correct. It runs builds, fuzz tests, linting, and functional tests. What it does not check is whether the PR is worth reviewing in the first place. That gap is what Core-Gate fills.

Critically, even the `CI failed` label on Bitcoin Core is applied **manually** by maintainers today — a world-class maintainer spending time on something a bot should handle in 30 seconds. Core-Gate automates that entire triage layer.

---

## What Core-Gate Does

Core-Gate runs as a GitHub Actions workflow on every PR opened or updated. It fetches the PR data via the GitHub API, scores it against Bitcoin Core's CONTRIBUTING.md, and routes it into one of three lanes:

| Lane | Score | Label | What happens |
|---|---|---|---|
| Needs Work | < 40/100 | `needs-work` | AI posts specific fix instructions. Maintainer skips it. |
| Needs Attention | 40-64/100 | `needs-attention` | Close but incomplete. AI posts targeted feedback. |
| Ready for Review | 65+/100 | `ready-for-review` | Routed to maintainer queue with full score breakdown. |

The workflow posts its result in **under 30 seconds**. Bitcoin Core's CI takes over an hour. Core-Gate fires first.

---

## Scoring (100 points total)

Five checks, 20 points each, derived directly from Bitcoin Core's [CONTRIBUTING.md](https://github.com/bitcoin/bitcoin/blob/master/CONTRIBUTING.md):

| Check | Pass condition | Points |
|---|---|---|
| Component prefix in title | Title starts with a valid area prefix | 20 |
| PR description quality | 100+ chars, issue link, no @mentions, no buzzwords | 20 |
| Commit message format | Subject under 50 chars, specific, no fixup commits | 20 |
| Diff size and focus | Under 200 changed lines, under 10 files | 20 |
| Test coverage | Code changes include test file changes | 20 |

Pass threshold: **65/100**

### Valid Component Prefixes

Taken directly from Bitcoin Core's CONTRIBUTING.md:

`consensus` `doc` `qt` `gui` `log` `mining` `net` `p2p` `refactor` `rpc` `rest` `zmq` `contrib` `cli` `test` `qa` `ci` `util` `lib` `wallet` `build` `guix` `kernel` `mempool` `fees` `fuzz` `bench` `depends` `validation` `index` `script` `crypto` `interfaces` `node` `init`

---

## Risk Profiling

Core-Gate profiles every PR by the code it touches and applies additional labels accordingly:

| Risk Level | Paths | Label | Notes |
|---|---|---|---|
| High | `src/consensus/` `src/crypto/` `src/secp256k1/` | `high-risk` + `Consensus` | Requires BIP reference in description |
| Medium | `src/wallet/` `src/rpc/` `src/validation/` `src/net/` | `Wallet` | Functional tests required |
| GUI | `src/qt/` `src/gui/` | `gui-change` | GUI-only PRs flagged to target bitcoin-core/gui repo |
| Low | `doc/` `contrib/` `test/` | — | Standard review |

---

## AI Slop Detection

Core-Gate detects AI-generated or low-effort contributions by scanning descriptions and commit messages for buzzword patterns:

> "improves performance", "enhances security", "fixes various", "general improvements", "refactors code", "cleaner code", "misc fixes" and similar phrases

High density of these phrases deducts points from the description and commit scores and is flagged in the AI feedback.

---

## Additional Checks

**Linked issue** — PRs should reference an existing issue with `Fixes #XXXX` or `Closes #XXXX`. Missing issue links deduct 5 points from the description score.

**BIP requirement** — PRs touching consensus code (`src/consensus/`) must include a BIP reference in the description. CONTRIBUTING.md states consensus changes must be preceded by extensive mailing list discussion and have a numbered BIP.

**Fixup commits** — CONTRIBUTING.md requires squashing fixup commits before requesting review. Core-Gate detects `fixup!` and `squash!` commit subjects and flags them.

**New contributor refactoring** — CONTRIBUTING.md explicitly states refactoring PRs should not be made by new contributors. Core-Gate notes this in the comment when a new account opens a refactoring PR.

**GUI repo routing** — PRs that only touch `src/qt/` should target the [bitcoin-core/gui](https://github.com/bitcoin-core/gui) repository. Core-Gate flags these automatically.

---

## Live Bitcoin Core Labels

Core-Gate fetches Bitcoin Core's actual labels from the GitHub API at runtime and reuses their exact names and colors when labeling PRs on your fork. This means Core-Gate's labels integrate cleanly into the existing maintainer workflow rather than introducing unfamiliar label names.

---

## How It Works

```
PR opened or updated
        ↓
pr-gate.yml fires (GitHub Actions, ~30 seconds)
        ↓
Fetch PR data + Bitcoin Core labels in parallel
        ↓
getRiskProfile() — file path analysis
        ↓
scorePullRequest() — 5 deterministic checks
        ↓
Score >= 65  →  ready-for-review, score breakdown posted
Score 40-64  →  needs-attention, AI feedback posted
Score < 40   →  needs-work, AI feedback posted
        ↓
Labels applied, comment upserted
```

The AI never makes labeling decisions. Labels are applied by a deterministic rules engine. The AI only writes the human-readable feedback comment for low-scoring PRs.

---

## Example Output

### Needs Work (20/100)

```
⚠️ PR Quality Gate — Needs Work (20/100)

This PR did not meet the baseline quality threshold (65/100).

🟢 Low Risk — touches documentation, tests, or non-consensus code.

|   | Check                 | Score | Detail                                                        |
|---|-----------------------|------:|---------------------------------------------------------------|
| ❌ | Component prefix     |  0/20 | Title "fixed stuff" missing a prefix like "wallet:", "rpc:"  |
| ❌ | PR description       |  0/20 | Description too short — explain the problem, approach, impact |
| ❌ | Commit message format |  0/20 | Vague subjects: "fixed stuff"                                |
| ✅ | Diff size and focus  | 20/20 | Small focused diff: 2 changed lines across 1 file             |
| ❌ | Test coverage        |  0/20 | No tests found. Add tests in src/test/ or test/functional/    |
|   | Total                | 20/100 |                                                              |

### What to Fix
...specific AI-generated feedback here...
```

### Ready for Review (100/100)

```
✅ PR Quality Gate — Passed (100/100)

This PR meets Bitcoin Core's contribution guidelines.

🔶 Medium Risk — touches wallet code. Functional tests required.

|   | Check                 | Score  | Detail                                          |
|---|-----------------------|-------:|-------------------------------------------------|
| ✅ | Component prefix     | 20/20  | Found valid prefix: wallet:                     |
| ✅ | PR description       | 20/20  | Sufficient detail. ✓ Issue reference found      |
| ✅ | Commit message format | 20/20 | Commit subjects are specific and concise        |
| ✅ | Diff size and focus  | 20/20  | Small focused diff: 75 lines across 2 files     |
| ✅ | Test coverage        | 20/20  | Test coverage: src/test/wallet_tests.cpp        |
|   | Total                | 100/100 |                                                |
```

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| CI runner | GitHub Actions | Free, runs in the repo, no infrastructure |
| GitHub API | `@octokit/rest` + `GITHUB_TOKEN` | Auto-injected, no auth setup |
| Scoring engine | Node.js rules engine | Deterministic, fully auditable, FOSS |
| AI feedback | Kimi API (Anthropic fallback) | Generates specific, convention-aware feedback |
| Bitcoin Core labels | Fetched live via GitHub API | Always current, integrates with existing workflow |
| Runtime | Node.js 20 | Available on all GitHub Actions runners |
| License | MIT | FOSS |

---

## Setup

### 1. Fork Bitcoin Core

```bash
# Fork https://github.com/bitcoin/bitcoin on GitHub
git clone https://github.com/YOUR_USERNAME/bitcoin
cd bitcoin
```

### 2. Add Core-Gate files to your fork

```bash
cp -r /path/to/core-gate/.github ./
cp -r /path/to/core-gate/scripts ./
cp /path/to/core-gate/package.json ./
npm install
```

### 3. Add your AI API key as a repo secret

Repo → Settings → Secrets and variables → Actions → New repository secret

```
Name:  KIMI_API_KEY
Value: your key here
```

`GITHUB_TOKEN` is injected automatically. No other secrets needed.

### 4. Push and open a test PR

```bash
git checkout -b test/bad-pr
echo "// test" >> src/bitcoin-cli.cpp
git add . && git commit -m "fixed stuff"
git push origin test/bad-pr
```

Open the PR on GitHub. The `PR Quality Gate` workflow fires within seconds.

---

## Local Testing

Test without a real PR using mock mode:

```bash
npm install

# Simulate a bad PR
npm run mock:bad

# Simulate a good PR
npm run mock:good
```

No GitHub token or API key needed for mock mode.

---

## Repo Structure

```
core-gate/
├── .github/
│   └── workflows/
│       └── pr-gate.yml     # Workflow trigger and job definition
├── scripts/
│   ├── scorer.js           # Rules engine — scores PRs 0-100
│   └── feedback.js         # AI layer — generates contributor feedback
├── package.json
└── README.md
```

---

## What Core-Gate Does Not Do

- Does not compile or run any code
- Does not replace Bitcoin Core's existing CI — runs in parallel
- Does not block PRs from being opened — labels and comments only
- Does not require external hosting, a server, or a database
- Does not make labeling decisions using AI — all labels are deterministic

---

## Why This Matters Beyond Bitcoin Core

The PR spam problem is not unique to Bitcoin Core. Core-Gate is portable — the scoring rules and component prefixes are the only Bitcoin Core-specific parts. Adapting it to another project means updating the prefix list and pointing it at a different CONTRIBUTING.md. The architecture stays identical.

---

## Built At

Bitcoin++ Open Source Edition Hackathon
Nairobi, Kenya — June 2026

---

## License

MIT