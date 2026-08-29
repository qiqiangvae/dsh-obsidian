---
name: wiki-lint
description: Vault health check. Use to find orphan notes, dead wikilinks, missing frontmatter, empty sections, and stale index/hot entries. The result is written to wiki/meta/Lint Report <date>.md.
---

# wiki-lint

Audit the vault for structural rot.

## When to use

- "Check my vault health" / "lint my vault"
- Before a major rewrite or migration
- After a bulk import

## Workflow

1. Call `wiki_lint`. It returns a structured report and writes a copy to
   `wiki/meta/Lint Report YYYY-MM-DD.md`.
2. Group the issues by category. The categories the linter checks:
   - `duplicate-filename` (error)
   - `dead-link` (warn)
   - `frontmatter` (warn / info)
   - `empty-section` (info)
   - `orphan` (info)
   - `stale-index` (info)
   - `stale-hot` (info)
3. For each error, propose a fix using `wiki_write` / `wiki_rename`. Do
   not auto-fix without user consent.
4. Re-run `wiki_lint` to confirm issues are resolved.

## Don't

- Do not mass-rename pages. Each `wiki_rename` is a separate confirmation.
- Do not delete orphan pages without checking with the user.
- Do not modify `wiki/meta/Lint Report …` files; they are machinery.
