# Porting Plan: claude-obsidian v2.x parity

`dsh-obsidian` v0.1 ships the **mechanical core** of the LLM Wiki pattern
in pure TypeScript: BM25 search, type-routed writes, frontmatter + index
bookkeeping, and lint. This document tracks the v2.x features we have not
ported yet, and *when* to port each.

## Status matrix

| Feature (claude-obsidian v2.x) | Upstream size | Status | When to port |
| ------------------------------ | ------------- | ------ | ------------ |
| BM25 search                    | bm25.py       | ✅ `src/search.ts` (independent impl) | done |
| Frontmatter + type routing     | vault_ops.py  | ✅ `src/vault.ts`                    | done |
| Master index, log, hot         | ledgers.py    | ✅ partial — index/log only, no full ledger | done |
| Lint / health check            | lint_engine.py| ✅ `src/lint.ts`                     | done |
| Scaffold / init                | cli.py init   | ✅ `src/scaffold.ts`                 | done |
| **Transactional writes**       | transaction.py (180KB) | ❌ | when concurrency > 1 agent |
| **Full source ledgers**        | ledgers.py (53KB)     | ⚠️ partial (source_hash only) | when paragraph-level citations needed |
| **Git checkpointing**          | checkpoint.py (51KB)  | ❌ | when vault is git-backed and auto-commit desired |
| **Capture queue**              | capture.py (84KB)     | ❌ | when ingesting > 10 sources in one batch |
| **v1→v2 migration**            | legacy_lock.py (24KB) | ❌ | only if porting an existing v1 vault |
| **Portable name checks**       | paths.py              | ✅ basic | done |
| **URL safety**                 | url_safety.py         | ❌ | when adding `wiki_ingest` URL support |
| **Plugin / theme dev loop**    | cli.py dev:*          | ✅ partial (use Obsidian CLI skill) | done |
| **Release artifact pipeline**  | release.py (91KB)     | n/a     | not applicable for JS plugin |

## When to port each feature

### Transactional writes

Port when **any** of:

- The vault grows past ~5,000 pages and concurrent agent edits become a concern.
- A second agent process (e.g. background indexer) writes to the same vault.
- You observe `wiki_write` failing with a half-written page after a crash.

Re-implementation sketch:

- `vault.ts` already serializes per-target writes in-process. Extend to
  an OS-level file lock (`proper-lockfile` on npm).
- Add a journal: append a `pending-writes.jsonl` to `.vault-meta/` before
  the write; truncate on success. On startup, replay the journal.

### Full source ledgers

Port when:

- The user needs paragraph / page-number-level citations.
- Research vault: every claim should link back to its source.

Re-implementation sketch:

- Promote `source_hash` to a row in `wiki/meta/ledgers/sources.jsonl`.
- Add `wiki_claim` tool that records `(page, claim, source, locator,
  confidence)` and verifies on lint.

### Git checkpointing

Port when:

- The vault lives in a git repo and you want each `wiki_write` to commit.
- You want a `git log` of the knowledge graph.

Re-implementation sketch:

- Add `simple-git` dependency.
- In `wiki_write`, after the index/log update, call `git.add().commit(<auto msg>)`.
- Gate on a `gitCheckpoint: true` config flag.

### Capture queue

Port when:

- `wiki-ingest` is being called on batches of 10+ URLs.
- A scheduled job pulls RSS / email / bookmarks into the vault.

Re-implementation sketch:

- Add `.vault-meta/queue/` directory.
- `wiki_ingest` enqueues by default; a background worker drains.
- Use `p-queue` for backpressure.

## Out of scope

- **Hooks / Claude Code integration** — DSH uses the cordis plugin system;
  we do not need the Claude Code hook adapter (`hook_adapter.py`).
- **Plugin marketplace metadata** — dsh-obsidian is a single bundle, not a
  marketplace of sub-plugins.
- **Adversarial review scripts** — claude-obsidian has a 10-check release
  matrix; ours is simpler (Node `node --test` + manual smoke).
