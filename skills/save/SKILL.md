---
name: save
description: File conversation insights back into the vault as new pages or annotations. Trigger when the user says "save this", "remember this insight", or "add this to my notes" during a conversation.
---

# save

Persist a conversational insight to the vault.

## When to use

- "Save this insight to my notes"
- "Add a note about this conversation"
- "I want to remember that…"

## Workflow

1. **Identify the type**: is this a resource (a fact / concept), a project
   note (a decision or status), or a source (something external)?
2. **Pick or draft a title**: prefer an existing `[[title]]` if the topic
   is in the vault. Otherwise draft a short noun phrase.
3. **Body**: keep it tight. If the user said something quotable, use a
   `> quote` block with `**Source:** conversation, YYYY-MM-DD`.
4. **Write** via `wiki_write`. Pass `source_path: "conversation"` to record
   provenance without a real file hash.
5. **Confirm** with the user, including the resolved path and the master
   index entry that was added.

## Don't

- Do not save without explicit consent ("save this", "remember this",
  "add a note"). A "huh, interesting" is not consent.
- Do not duplicate an existing page without checking. `wiki_query` first.
