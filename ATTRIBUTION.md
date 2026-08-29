# Attribution

`dsh-obsidian` is a merged adaptation of the following MIT-licensed works:

## Code adapted (with modification)

- **[Lion-1209/dsh-plugin-wiki-skills](https://github.com/Lion-1209/dsh-plugin-wiki-skills)** (MIT, © 2026 Lion-1209)
  - Skills content adapted: `wiki`, `wiki-ingest`, `wiki-query`, `wiki-lint`, `save`, `think`
  - Reference skills ported in: `obsidian-markdown`, `obsidian-bases`, `defuddle` (originally from kepano/obsidian-skills)

- **[Lion-1209/dsh-plugin-wiki-tools](https://github.com/Lion-1209/dsh-plugin-wiki-tools)** (MIT, © 2026 Lion-1209)
  - Vault operation contracts (LLM Wiki pattern) followed
  - **Re-implemented from scratch in TypeScript** for the new DSH cordis API (`ctx.tools.register`)
  - BM25 search, type-routing, frontmatter completion, index/log bookkeeping, health check

## Reference (parity target, not directly forked)

- **[AgriciDaniel/claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian)** (MIT, © 2026 AgriciDaniel)
  - Long-term parity target. The `PORTING_PLAN.md` lists which v2.x features we will incrementally port.
  - **No code copied** from this project.

- **[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)** (MIT)
  - Reference for Obsidian Flavored Markdown syntax in skills.

## Changes from upstream

1. **Merged two plugins** (`dsh-plugin-wiki-skills` + `dsh-plugin-wiki-tools`) into a single `dsh-obsidian` plugin.
2. **Re-implemented tools layer** in modern TypeScript using the new cordis `apply(ctx)` + `ctx.tools.register` API (the old `ctx.defineTool` form was deprecated).
3. **Added kepano's `obsidian-cli` and `json-canvas` skills** that the Lion-1209 fork omitted.
4. **Removed the DSH plugin auto-update dependency** — `dsh-obsidian` is self-contained, versioned with this repo, and can be installed from this Git URL.
5. **Roadmap to v2.x parity** tracked in [`PORTING_PLAN.md`](./PORTING_PLAN.md).

## License

- This package: MIT (see [`LICENSE`](./LICENSE))
- All upstream works: MIT (see [`ORIGINAL_LICENSE`](./ORIGINAL_LICENSE))
