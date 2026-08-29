---
name: obsidian-cli
description: Interact with a running Obsidian instance through its CLI: read, create, search, manage notes/tasks/properties, and dev-loop plugins/themes. Use when the user asks to control Obsidian from the terminal or to debug an Obsidian plugin.
---

# obsidian-cli

Talk to a running Obsidian instance. Requires Obsidian to be open and CLI
enabled (Settings → General → Enable CLI).

## Common commands

```bash
obsidian read file="My Note"
obsidian create name="New Note" content="# Hello" template="Template" silent
obsidian append file="My Note" content="New line"
obsidian search query="search term" limit=10
obsidian daily:read
obsidian daily:append content="- [ ] New task"
obsidian property:set name="status" value="done" file="My Note"
obsidian tasks daily todo
obsidian tags sort=count counts
obsidian backlinks file="My Note"
```

- Use `file=<name>` for wikilink-style targeting; `path=<path>` for exact.
- Use `vault=<name>` first to disambiguate when more than one vault is open.
- Pass `--copy` to put the result on the clipboard.

## Plugin / theme dev loop

```bash
obsidian plugin:reload id=my-plugin
obsidian dev:errors
obsidian dev:screenshot path=screenshot.png
obsidian dev:dom selector=".workspace-leaf" text
obsidian dev:console level=error
obsidian eval code="app.vault.getFiles().length"
```

1. Reload → 2. Check errors → 3. Verify visually → 4. Check console → loop.
