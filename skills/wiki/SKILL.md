---
name: wiki
description: Scaffold a new vault, manage wiki/ folders, and handle cross-project referencing. Trigger when the user asks to set up an Obsidian vault, create a wiki structure, or reference notes across projects.
---

# wiki

Scaffold and maintain the LLM Wiki pattern layout in an Obsidian vault.

## When to use

- "Set up a new vault" / "scaffold my Obsidian" / "init a wiki here"
- "Where should I put this note?" / "move this to the right folder"
- "List my wiki structure"

## Operations

### SCAFFOLD (dry-run by default)

Call the `wiki_scaffold` tool with `{ template: "default", apply: false }` to preview.
Pass `apply: true` to write the layout. Typical new vault: `apply: true`.

### TYPE ROUTING

| Type      | Folder (default)   |
| --------- | ------------------ |
| `domain`  | `wiki/areas`       |
| `area`    | `wiki/areas`       |
| `project` | `wiki/projects`    |
| `resource`| `wiki/resources`   |
| `source`  | `wiki/sources`     |
| `archive` | `wiki/archive`     |

Override per-vault by setting `config.typeFolders` in your profile.

### CROSS-PROJECT REFERENCING

The vault is host-local user data outside any session workspace. Pages link
by `[[bare title]]`, which resolves vault-wide via `wiki_query`.

## Don't

- Do not write to `wiki/meta/` directly; tools manage that directory.
- Do not rename `index.md`, `hot.md`, or `log.md`; tools depend on them.
- Do not put page content in `inbox/`; that is for raw sources only.
