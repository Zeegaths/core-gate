# Core-Gate

Core-Gate is a GitHub Actions PR quality gate for Bitcoin Core. It scores incoming pull requests against basic contribution-quality rules before maintainers spend time reviewing them.

It does not replace Bitcoin Core CI. It does not compile code. It triages whether a PR is reviewable enough to enter the maintainer queue.

## What It Does

On every PR open, update, reopen, or edit, Core-Gate:

1. Fetches PR title, body, commits, and changed files.
2. Scores the PR from 0 to 100.
3. Posts or updates a score breakdown comment.
4. Applies `ready-for-review` or `needs-work`.
5. Generates contributor feedback for failed checks.

## Scoring

Each check is worth 20 points:

| Check | Pass condition |
|---|---|
| Component prefix | Title starts with a known prefix like `wallet:`, `rpc:`, `test:`, `doc:`, `build:`, or `consensus:` |
| PR description | Description explains the change with enough detail |
| Commit messages | Commit subjects are specific and concise |
| Diff size/focus | Diff is small enough to review comfortably |
| Test coverage | Source changes include test updates |

Passing threshold: **65/100**

## Local Smoke Tests

Run these before installing into a Bitcoin fork:

```bash
npm run mock:bad
npm run mock:good
```

The bad mock should produce a low score and `needs-work` style feedback.

The good mock should produce a passing score and `ready-for-review` style output.

## Install Into A Bitcoin Core Fork

Use this when testing against your fork:

```bash
git clone https://github.com/Aishagojo/bitcoin.git
cd bitcoin
git checkout -b core-gate-setup

cp -r /path/to/core-gate/.github ./
cp -r /path/to/core-gate/scripts ./
cp /path/to/core-gate/package.json ./
cp /path/to/core-gate/package-lock.json ./

git add .github/workflows/pr-gate.yml scripts package.json package-lock.json
git commit -m "ci: add Core-Gate PR quality workflow"
git push origin core-gate-setup
```

Open a PR from `core-gate-setup` to `main` in the fork. After the workflow is on the base branch, create demo PRs against that branch or merge it into `main` for easier demos.

## Demo PRs

Bad PR example:

```bash
git checkout main
git pull
git checkout -b demo-bad-pr
echo "// demo bad pr" >> src/bitcoin-cli.cpp
git add src/bitcoin-cli.cpp
git commit -m "fixed stuff"
git push origin demo-bad-pr
```

Open `demo-bad-pr -> main`. Expected result: `needs-work`.

Good PR example:

```bash
git checkout main
git pull
git checkout -b demo-good-pr
echo "// demo good pr" >> src/wallet/wallet.cpp
echo "// demo wallet test" >> src/wallet/test/wallet_tests.cpp
git add src/wallet/wallet.cpp src/wallet/test/wallet_tests.cpp
git commit -m "wallet: add fee rounding test"
git push origin demo-good-pr
```

Open `demo-good-pr -> main`. Use a PR title like:

```text
wallet: add fee rounding test
```

Add a description longer than 100 characters explaining the reason for the change.

Expected result: `ready-for-review`.

## Required Permissions

The workflow uses:

```yaml
permissions:
  pull-requests: write
  contents: read
  issues: write
```

`issues: write` is required because GitHub PR comments and labels use the Issues API.

## Optional AI Feedback

If `ANTHROPIC_API_KEY` is present as an Actions secret, Core-Gate asks Anthropic for specific feedback on failed checks. If the key is missing or the API call fails, Core-Gate uses deterministic fallback feedback.
