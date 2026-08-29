# dsh-obsidian

Self-organizing AI second brain for Obsidian, as a single [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin.

Targets parity with [AgriciDaniel/claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) (MIT).
Built on the LLM Wiki pattern (Andrej Karpathy).
Merged fork of `dsh-plugin-wiki-skills` + `dsh-plugin-wiki-tools` — see [`ATTRIBUTION.md`](./ATTRIBUTION.md).

## Why this exists

The two upstream DSH plugins were great but:

1. **DSH is in active development and breaks the public cordis API often.**
   When that happens, the two plugins stop loading. The original maintainer
   updates at a slower cadence than the framework.
2. **Splitting skills and tools is good architecture but bad UX for one person.**
   You almost always want both.

So: one plugin, versioned together, with a clear upgrade path to v2.x features
(see [`PORTING_PLAN.md`](./PORTING_PLAN.md)).

## Install

Prerequisites:

- DSH 0.x or newer (with `dsh plugin` CLI), Node ≥ 22.19
- An Obsidian vault somewhere on disk

```bash
# 1. Add the plugin
dsh plugin --profile web add github:qiqiangvae/dsh-obsidian

# 2. Set your vault path in your profile's cordis.patch.yml
#    (~/.dsh/profiles/web/cordis.patch.yml)
#
#   - id: dsh-obsidian
#     config:
#       vaultPath: /absolute/path/to/your/obsidian/vault
#       # optional:
#       # typeFolders: { domain: "wiki/areas" }
#       # maxQueryResults: 10
#
# 3. Restart DSH
dsh web

# 4. (optional) Scaffold a fresh vault
#    In DSH: run the wiki_scaffold tool with { template: "default", apply: true }
```

To install from a local checkout (e.g. while developing this plugin):

```bash
git clone git@github.com:qiqiangvae/dsh-obsidian.git
cd dsh-obsidian
pnpm install      # for dev dependencies (typescript, @types)
pnpm run build    # compiles src/ → lib/
dsh plugin --profile web add link:$(pwd)
```

## What you get

### Tools (registered on `ctx.tools`)

| Tool | What it does |
| ---- | ------------ |
| `wiki_query` | BM25 search with snippet + link graph; quick mode returns hot + index verbatim |
| `wiki_write` | One-page write with type-routing, frontmatter completion, index/log bookkeeping, source-hash delta skip |
| `wiki_lint` | Health check: duplicates, dead links, orphans, frontmatter gaps, empty sections, stale index/hot |
| `wiki_scaffold` | Initialize the LLM Wiki layout (dry-run by default) |
| `wiki_rename` | Rename a page with machinery protection |
| `wiki_list` | List all page titles |

### Skills (registered on `ctx.skills`)

From the Lion-1209 v1 suite:

- `wiki` — vault scaffolding and routing
- `wiki-ingest` — capture sources into the vault
- `wiki-query` — answer from the vault with citations
- `wiki-lint` — health-check workflow
- `save` — file conversation insights
- `think` — 10-principle reasoning loop

Plus reference skills from kepano (Obsidian Flavored Markdown, Bases) and
DSH-flavoured extensions:

- `obsidian-markdown`, `obsidian-bases`, `json-canvas`, `defuddle`, `obsidian-cli`

## Develop

```bash
pnpm install
pnpm run build    # tsc → lib/
pnpm test         # node --test test/
```

Edit code under `src/`, build to `lib/`, restart DSH. To hot-reload during
development, also run `pnpm run dev:web` from the DSH checkout.

## License

MIT. See [`LICENSE`](./LICENSE) and [`ATTRIBUTION.md`](./ATTRIBUTION.md).
