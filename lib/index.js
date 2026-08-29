/**
 * index.ts — DSH plugin entry point for dsh-obsidian.
 *
 * Registers the four mechanical tools (`wiki_query`, `wiki_write`,
 * `wiki_lint`, `wiki_scaffold`) and the bundled skill set discovered under
 * `skills/`. All file I/O is funneled through the helpers in vault.ts so
 * path safety, frontmatter rules, and index/log bookkeeping stay consistent.
 *
 * Required config (in your profile's cordis.patch.yml):
 *
 *   - id: dsh-obsidian
 *     config:
 *       vaultPath: /absolute/path/to/your/obsidian/vault
 *       # optional:
 *       typeFolders: { domain: "wiki/areas" }
 *       maxQueryResults: 10
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { resolveLayout } from './vault.js';
import { search } from './search.js';
import { writePage, renamePage, listAllTitles } from './vault.js';
import { lint, writeLintReport } from './lint.js';
import { scaffold } from './scaffold.js';
import { registerAllSkills } from './skills.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
function requireVaultPath(ctx) {
    const p = ctx.config.vaultPath;
    if (!p) {
        throw new Error('dsh-obsidian: vaultPath is required. ' +
            'Set it in your profile cordis.patch.yml under the dsh-obsidian row, e.g.\n' +
            '  - id: dsh-obsidian\n' +
            '    config:\n' +
            '      vaultPath: /absolute/path/to/vault');
    }
    if (!existsSync(p)) {
        ctx.logger.warn(`dsh-obsidian: vaultPath does not exist: ${p} (create it or fix the path)`);
    }
    return p;
}
export const name = 'dsh-obsidian';
export const inject = ['tools', 'skills'];
export function apply(ctx) {
    ctx.logger.info('dsh-obsidian activating…');
    const vaultPath = requireVaultPath(ctx);
    const config = ctx.config;
    const layout = resolveLayout(vaultPath, config);
    // ── tools ────────────────────────────────────────────────────────────────
    ctx.tools.register({
        name: 'wiki_query',
        description: 'Search the Obsidian vault via BM25. Standard mode returns hits with snippets, ' +
            'inbound/outbound link graph, and verbatim hot.md + index.md. Quick mode returns ' +
            'only the hot + index (the skill read-order).',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'search query' },
                limit: { type: 'number', description: 'max hits (default 10)' },
                mode: { type: 'string', enum: ['quick', 'standard'], description: 'quick returns hot+index only' },
            },
            required: ['query'],
        },
        handler: async ({ params }) => {
            const p = params;
            const limit = p.limit ?? config.maxQueryResults ?? 10;
            const mode = p.mode ?? 'standard';
            return search(layout.wikiDir, { query: p.query, limit, mode });
        },
    });
    ctx.tools.register({
        name: 'wiki_write',
        description: 'Write one page to the vault with full bookkeeping: type→folder routing, ' +
            'frontmatter completion (keeps `created` and unknown fields on update), ' +
            'filename-uniqueness guard, master-index entry, log entry. With source_path, ' +
            'records the source SHA-256 and skips unchanged sources unless `force`. ' +
            'Returns unresolvedLinks (forward links during multi-page ingests are legitimate).',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'page title (becomes the filename)' },
                type: { type: 'string', description: 'page type: domain|area|project|resource|source|archive' },
                content: { type: 'string', description: 'markdown body (no frontmatter; it is added automatically)' },
                tags: { type: 'array', items: { type: 'string' }, description: 'optional tags' },
                source_path: { type: 'string', description: 'optional path to source file; hash recorded for delta' },
                force: { type: 'boolean', description: 'overwrite even when source hash unchanged' },
            },
            required: ['title', 'type', 'content'],
        },
        handler: async ({ params }) => {
            const p = params;
            return writePage(vaultPath, config, {
                title: p.title,
                type: p.type,
                content: p.content,
                tags: p.tags,
                source_path: p.source_path,
                force: p.force,
            });
        },
    });
    ctx.tools.register({
        name: 'wiki_lint',
        description: 'Vault health check: duplicate filenames, dead wikilinks, orphan pages, ' +
            'frontmatter gaps, empty sections, stale index entries, stale hot cache. ' +
            'Returns structured report and writes a human-readable Markdown copy to ' +
            'wiki/meta/Lint Report <date>.md.',
        parameters: {
            type: 'object',
            properties: {
                fix: { type: 'boolean', description: 'placeholder for parity with future versions; report-only in v0.1' },
            },
        },
        handler: async ({ params }) => {
            const p = params;
            const report = lint(vaultPath, config, { fix: p.fix });
            const reportPath = writeLintReport(vaultPath, config, report);
            return { ...report, reportPath };
        },
    });
    ctx.tools.register({
        name: 'wiki_scaffold',
        description: 'Initialize a vault with the LLM Wiki layout: wiki/, .raw/, wiki/meta/, ' +
            'and seed files (index.md, hot.md, log.md, Inbox.md). Dry-run by default; ' +
            'pass `apply: true` to actually create files.',
        parameters: {
            type: 'object',
            properties: {
                template: { type: 'string', enum: ['default', 'minimal', 'research'], description: 'scaffold template' },
                apply: { type: 'boolean', description: 'actually write files (default false = dry run)' },
            },
        },
        handler: async ({ params }) => {
            const p = params;
            return scaffold(vaultPath, config, { template: p.template, apply: p.apply });
        },
    });
    ctx.tools.register({
        name: 'wiki_rename',
        description: 'Rename a page and update its [[wikilink]] references. Refuses machinery ' +
            'pages (lint reports) and case-only renames that would collide on ' +
            'case-insensitive filesystems.',
        parameters: {
            type: 'object',
            properties: {
                old_title: { type: 'string' },
                new_title: { type: 'string' },
            },
            required: ['old_title', 'new_title'],
        },
        handler: async ({ params }) => {
            const p = params;
            return renamePage(vaultPath, p.old_title, p.new_title);
        },
    });
    ctx.tools.register({
        name: 'wiki_list',
        description: 'List all page titles in the vault (excluding machinery pages).',
        parameters: { type: 'object', properties: {} },
        handler: async () => {
            return { titles: [...listAllTitles(layout.wikiDir)] };
        },
    });
    // ── skills ───────────────────────────────────────────────────────────────
    // Try both layouts: src/ (dev) and lib/ (built) so this works in either.
    const candidates = [join(__dirname, 'skills'), join(__dirname, '..', 'skills')];
    const skillsDir = candidates.find(p => existsSync(p));
    if (skillsDir) {
        const registered = registerAllSkills(ctx, skillsDir);
        ctx.logger.info(`dsh-obsidian: registered ${registered.length} skill(s): ${registered.join(', ')}`);
    }
    else {
        ctx.logger.warn(`dsh-obsidian: no skills/ directory found (looked in ${candidates.join(', ')})`);
    }
    ctx.logger.info(`dsh-obsidian ready. vault=${vaultPath} wiki=${layout.wikiDir}`);
}
// default export for tooling that expects the module form
const _default = { name, inject, apply };
export default _default;
//# sourceMappingURL=index.js.map