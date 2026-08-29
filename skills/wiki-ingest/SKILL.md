---
name: wiki-ingest
description: Ingest a source (URL, file, or pasted text) into the vault: extract entities and concepts, cross-reference existing notes, log the operation. Trigger when the user says "save this to my vault", "ingest this article", or "capture this".
---

# wiki-ingest

Ingest external sources into the vault as first-class wiki pages.

## When to use

- "Save this article to my vault" / "ingest this URL"
- "Capture these notes" / "add this to my second brain"
- Pasted text + "remember this"

## Workflow

1. **Plan**: parse the source into one or more wiki pages. Pick a `type`
   per page (resource/source/project/etc.). Avoid putting a single source
   into multiple pages unless the user asked for a split.
2. **Pre-flight check**: call `wiki_query` with the source's main topics to
   find existing notes. Plan links from the new page to those notes.
3. **Write**: for each page, call `wiki_write` with:
   - `title` — short noun phrase, becomes the filename
   - `type` — pick from the wiki SKILL routing table
   - `content` — markdown body with `[[wikilinks]]` to existing pages
   - `source_path` — the local path or `inbox/` file; SHA-256 is recorded
   - `tags` — 2-5 lower-case tags
4. **Acknowledge unresolved links**: `wiki_write` returns
   `unresolvedLinks`. Tell the user about any forward links and, if
   reasonable, draft placeholder pages in a second pass.
5. **Log the operation**: the tool appends to `wiki/log.md` automatically.

## Don't

- Do not write to `wiki/` directly. Always go through `wiki_write`.
- Do not paraphrase a source as if it were original work; copy quotes with
  a clear `> quote` block and a `source:` frontmatter entry.
- Do not invent claims or page numbers. If the source doesn't say it,
  don't write it.
