---
name: obsidian-markdown
description: Create and edit Obsidian Flavored Markdown (.md) with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax. Always-on reference for any markdown the agent writes into the vault.
---

# obsidian-markdown

Use Obsidian Flavored Markdown (OFM), not generic Markdown.

## Wikilinks

```
[[Page Name]]                  → link
[[Page Name|alias]]            → link with custom text
[[Page Name#Heading]]          → link to a heading
![[Page Name]]                 → embed (transclude) the page
![[Page Name#Heading]]         → embed a section
```

## Properties (YAML frontmatter)

```yaml
---
title: My Note
type: resource
tags: [rust, async, ownership]
created: 2026-08-29
updated: 2026-08-29
source: https://example.com/article
source_hash: a1b2c3...
aliases: [Note Alias]
status: seedling
---
```

- `type` — required, drives folder routing (see wiki skill)
- `created` — set once, never overwrite
- `updated` — set on every write
- `source` / `source_hash` — provenance for ingested content

## Callouts

```markdown
> [!note]
> Plain callout body.

> [!warning] Optional title
> Body with a title.

> [!quote] Title
> For quoted material with attribution.
```

Other useful types: `tip`, `info`, `example`, `question`, `success`, `failure`, `danger`, `bug`.

## Standard markdown

Headings, lists, tables, code blocks, links, blockquotes, images: standard
CommonMark works. Do not re-introduce it from scratch in a skill body.
