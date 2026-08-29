---
name: defuddle
description: Extract clean markdown from a web page (article, blog post, doc page) by stripping nav, ads, cookie banners, and chrome. Use before ingesting a URL into the vault, to save tokens and keep the source readable.
---

# defuddle

Clean a web page down to its article body.

## When to use

- Before any URL ingestion via `wiki-ingest`, prefer running the URL through
  defuddle-style extraction.
- The actual extraction is done by the [Defuddle](https://github.com/kepano/defuddle)
  CLI / npm package. The skill's job is to *instruct* the agent to call it.

## Workflow

1. Fetch the URL. If the response is already markdown, skip defuddle.
2. Otherwise, run `npx defuddle <url>` (or the equivalent in your runtime).
3. Hand the cleaned markdown to `wiki-ingest` to write a `resource` page.

## What defuddle removes

- Nav, header, footer
- Cookie / GDPR banners
- Sidebars, related-article blocks
- Most ads and trackers

## What it preserves

- Article title (h1)
- Author and date metadata
- Headings, paragraphs, lists, code blocks
- Images (with src intact)
