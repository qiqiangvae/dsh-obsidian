---
name: wiki-query
description: Answer a question by reading the vault: search via BM25, follow the link graph, return citations with source locators. Trigger when the user asks "what's in my vault about X", "do I have notes on Y", or wants a synthesis of existing pages.
---

# wiki-query

Answer from the vault with citations.

## When to use

- "What's in my vault about Rust async?"
- "Do I have notes on Karpathy's LLM Wiki pattern?"
- "Summarize what I know about topic X"

## Workflow

1. **Quick check first**: call `wiki_query` in `mode: "quick"` to read
   `hot.md` + `index.md` verbatim — this is the model's recent context
   and the master index. Often enough to answer the question.
2. **Full search**: if not enough, call `wiki_query` in `mode: "standard"`
   (default) with the user's question. Get top-N hits with snippets and
   the inbound/outbound link graph.
3. **Follow links**: if a top hit looks promising, call `wiki_query` again
   on the top hit's outbound titles to expand the context. Up to 2 hops.
4. **Synthesize**: write the answer with explicit `[[wikilink]]` citations.
   Quote verbatim where useful; never invent.

## Don't

- Do not answer from prior knowledge alone if the vault is the source of
  truth for this question. Always cite the page.
- Do not loop indefinitely. Cap at 3-5 `wiki_query` calls per turn.
- Do not return more than ~6 hits to the user; summarize instead.
