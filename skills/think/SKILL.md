---
name: think
description: The 10-principle reasoning loop (OBSERVE → ORIENT → DECIDE → ACT → REVIEW) that every other wiki skill maps onto. Use when the user asks for careful reasoning, a multi-step plan, or a structured decision.
---

# think

A 10-step reasoning loop. Use it before any non-trivial operation.

## The 10 principles

1. **OBSERVE** — what is the actual state? (read tools, don't assume)
2. **ORIENT** — what is the goal? what is the gap?
3. **DECIDE** — pick the smallest reversible action
4. **ACT** — do it (call the right tool)
5. **REVIEW** — did it work? what changed?
6. **REPORT** — tell the user what happened, with citations
7. **REFLECT** — was there a better way? log it for next time
8. **PRESERVE** — if there's a new insight, save it (the `save` skill)
9. **RECORD** — append to the log via `wiki/log.md` (the tool does this)
10. **REST** — stop. Don't loop. Cap at 3-5 tool calls per turn.

## When to use

- "Help me think through this"
- Before any `wiki_write` or `wiki_rename` that touches more than one page
- When the user is about to make a destructive change
