/**
 * index.ts — DSH plugin entry point for dsh-obsidian.
 *
 * Re-implementation of dsh-plugin-wiki-tools + dsh-plugin-wiki-skills, using
 * the modern `apply(ctx, config)` signature and the `defineTool()` helper
 * from @deepseek-ai/dsh-tools. Each tool returns structured data; the render
 * function shapes the model-facing text.
 *
 * Required config (in your profile's cordis.patch.yml):
 *
 *   - id: dsh-obsidian
 *     config:
 *       vaultPath: /absolute/path/to/your/obsidian/vault
 *
 * The boot fails loud if vaultPath is missing.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { defineTool } from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
import { resolveLayout } from './vault.js';
import { search } from './search.js';
import { writePage, renamePage, listAllTitles } from './vault.js';
import { lint, writeLintReport } from './lint.js';
import { scaffold } from './scaffold.js';
import { registerAllSkills } from './skills.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
// ──────────────────────────────────────────────────────────────────────────────
// Config schema (validated by Schemastery at load time)
// ──────────────────────────────────────────────────────────────────────────────
export const Config = z.object({
    /** Absolute path to the Obsidian vault root. */
    vaultPath: z.string().required(),
    /** Max wiki_query hits in standard mode. */
    maxQueryResults: z.number().default(10),
    /** Optional per-type folder overrides. */
    typeFolders: z.object({}),
});
// ──────────────────────────────────────────────────────────────────────────────
// Plugin identity
// ──────────────────────────────────────────────────────────────────────────────
export const name = 'dsh-obsidian';
// Inject: `tools` (the dsh-tools service that owns our wiki_query etc.) and
// `skills` (the dsh-skills service that bundles the SKILL.md catalog).
// The loader waits for these to be available before calling apply().
export const inject = ['tools', 'skills'];
// ──────────────────────────────────────────────────────────────────────────────
// register helper — our local ToolDefinition is intentionally loose (the
// dsh-tools types require `execute` to return a strictly-typed `JsonValue`).
// At runtime, our plain objects are JSON-serializable; the cast is safe.
// We pass through defineTool() so dsh-tools still validates the args schema
// and the output schema on every call.
// ──────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reg = (ctx, def) => ctx.tools.register(defineTool(def));
// ──────────────────────────────────────────────────────────────────────────────
// Apply — runs once at boot, after deps are ready
// ──────────────────────────────────────────────────────────────────────────────
export async function apply(ctx, config) {
    ctx.logger.info('dsh-obsidian activating…');
    if (typeof config.vaultPath !== 'string' || config.vaultPath.length === 0) {
        throw new Error('dsh-obsidian: config vaultPath is required. Set it on the dsh-obsidian row ' +
            'in your profile cordis.patch.yml, e.g.\n' +
            '  - id: dsh-obsidian\n' +
            '    config:\n' +
            '      vaultPath: /absolute/path/to/your/obsidian/vault');
    }
    if (!existsSync(config.vaultPath)) {
        ctx.logger.warn(`dsh-obsidian: vaultPath does not exist: ${config.vaultPath} ` +
            `(create it or run wiki_scaffold to initialize)`);
    }
    // Materialize a PluginConfig for the helpers
    const pluginConfig = {
        vaultPath: config.vaultPath,
        typeFolders: (config.typeFolders ?? {}),
        maxQueryResults: config.maxQueryResults ?? 10,
    };
    const layout = resolveLayout(config.vaultPath, pluginConfig);
    // ── tools ────────────────────────────────────────────────────────────────
    // wiki_query
    reg(ctx, {
        name: 'wiki_query',
        description: 'Search the knowledge vault. Quick mode returns the hot cache and master ' +
            'index verbatim (read those before any page). Standard mode runs BM25 full-text ' +
            'search over every wiki page and returns ranked matches with snippets, inbound ' +
            'links, and outbound link counts.',
        parameters: {
            query: { type: 'string', required: true, description: 'search text or topic' },
            limit: { type: 'number', description: 'max hits (default from config)' },
            mode: {
                type: 'string',
                enum: ['quick', 'standard'],
                description: 'quick returns hot.md + index.md only; standard searches all pages',
            },
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [
                { type: 'text', text: renderQuery(value) },
            ],
        },
        execute: async (args) => {
            const limit = args.limit ?? pluginConfig.maxQueryResults ?? 10;
            const mode = args.mode ?? 'standard';
            return search(layout.wikiDir, { query: args.query, limit, mode });
        },
        presentCall: (args) => ({
            card: 'generic',
            title: `Query wiki: ${args.query}`,
            kind: 'read',
            rawInput: args.query,
        }),
    });
    // wiki_write
    reg(ctx, {
        name: 'wiki_write',
        description: 'Write or update one wiki page with full bookkeeping: type-routed folder, ' +
            'frontmatter completion (keeps `created` and unknown fields), filename-uniqueness ' +
            'guard, master-index entry, and log entry. With source_path, records the source ' +
            'SHA-256 and skips unchanged content unless `force`. Returns unresolvedLinks so ' +
            'forward links during multi-page ingests are surfaced for the next pass.',
        parameters: {
            title: { type: 'string', required: true, description: 'page title; also filename' },
            type: {
                type: 'string',
                required: true,
                enum: ['domain', 'area', 'project', 'resource', 'source', 'archive'],
                description: 'page type, drives folder routing',
            },
            content: { type: 'string', required: true, description: 'markdown body (no frontmatter; it is added)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'optional frontmatter tags' },
            source_path: { type: 'string', description: 'optional path to source file; hash recorded for delta' },
            force: { type: 'boolean', description: 'overwrite even when source hash unchanged' },
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (args, value) => [
                { type: 'text', text: renderWrite(args, value) },
            ],
        },
        execute: async (args) => {
            return writePage(config.vaultPath, pluginConfig, {
                title: args.title,
                type: args.type,
                content: args.content,
                tags: args.tags,
                source_path: args.source_path,
                force: args.force,
            });
        },
        presentCall: (args) => ({
            card: 'generic',
            title: `Write wiki page: ${args.title}`,
            kind: 'other',
            rawInput: { title: args.title, type: args.type },
        }),
    });
    // wiki_rename
    reg(ctx, {
        name: 'wiki_rename',
        description: 'Rename a wiki page. Refuses machinery pages (Lint Report, index, hot, log) ' +
            'and rejects non-portable filenames.',
        parameters: {
            old_title: { type: 'string', required: true },
            new_title: { type: 'string', required: true },
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [{ type: 'text', text: renderRename(value) }],
        },
        execute: async (args) => {
            return renamePage(config.vaultPath, pluginConfig, args.old_title, args.new_title);
        },
        presentCall: (args) => ({
            card: 'generic',
            title: `Rename wiki page: ${args.old_title} → ${args.new_title}`,
            kind: 'other',
            rawInput: { from: args.old_title, to: args.new_title },
        }),
    });
    // wiki_lint
    reg(ctx, {
        name: 'wiki_lint',
        description: 'Health-check the knowledge vault: duplicate filenames, dead wikilinks, orphan ' +
            'pages, frontmatter gaps, empty sections, stale index entries, stale hot cache. ' +
            'Report only — every issue carries a suggestion. Writes the dated report to ' +
            'wiki/meta/Lint Report <date>.md.',
        parameters: {
            fix: { type: 'boolean', description: 'placeholder for future parity; report-only in v0.1' },
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [{ type: 'text', text: renderLint(value) }],
        },
        execute: async (args) => {
            const report = lint(config.vaultPath, pluginConfig, { fix: args.fix });
            const reportPath = writeLintReport(config.vaultPath, pluginConfig, report);
            return { ...report, reportPath };
        },
        presentCall: () => ({ card: 'generic', title: 'Lint wiki vault', kind: 'other' }),
    });
    // wiki_scaffold
    reg(ctx, {
        name: 'wiki_scaffold',
        description: 'Scaffold a wiki vault: wiki/, .raw/, wiki/meta/, and seed files (index.md, ' +
            'hot.md, log.md, Inbox.md). Dry-run by default — pass `apply: true` to write.',
        parameters: {
            template: {
                type: 'string',
                enum: ['default', 'minimal', 'research'],
                description: 'scaffold template',
            },
            apply: { type: 'boolean', description: 'actually write files (default false = dry run)' },
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [{ type: 'text', text: renderScaffold(value) }],
        },
        execute: async (args) => {
            return scaffold(config.vaultPath, pluginConfig, {
                template: args.template,
                apply: args.apply,
            });
        },
        presentCall: (args) => ({
            card: 'generic',
            title: `Scaffold wiki vault (${args.template ?? 'default'})`,
            kind: 'other',
            rawInput: { template: args.template, apply: args.apply },
        }),
    });
    // wiki_list
    reg(ctx, {
        name: 'wiki_list',
        description: 'List all page titles in the vault (excluding machinery pages).',
        parameters: {},
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [{ type: 'text', text: renderList(value) }],
        },
        execute: async () => ({ titles: [...listAllTitles(layout.wikiDir)] }),
        presentCall: () => ({ card: 'generic', title: 'List wiki pages', kind: 'read' }),
    });
    // ── skills ───────────────────────────────────────────────────────────────
    const candidates = [join(__dirname, 'skills'), join(__dirname, '..', 'skills')];
    const skillsDir = candidates.find(p => existsSync(p));
    if (skillsDir) {
        const registered = registerAllSkills(ctx, skillsDir);
        ctx.logger.info(`dsh-obsidian: registered ${registered.length} skill(s): ${registered.join(', ')}`);
    }
    else {
        ctx.logger.warn(`dsh-obsidian: no skills/ directory found (looked in ${candidates.join(', ')})`);
    }
    ctx.logger.info(`dsh-obsidian ready. vault=${config.vaultPath} wiki=${layout.wikiDir}`);
}
// ──────────────────────────────────────────────────────────────────────────────
// Render helpers — control what the model sees in tool output
// ──────────────────────────────────────────────────────────────────────────────
function capText(text, max) {
    return text.length <= max ? text : `${text.slice(0, max)}\n… (truncated at ${max} characters)`;
}
function renderQuery(value) {
    const v = value;
    if (!v)
        return 'wiki_query: no result';
    if (v.mode === 'quick') {
        const parts = [];
        if (typeof v.hot === 'string' && v.hot.length > 0) {
            parts.push(`--- wiki/hot.md (recent context cache) ---\n${capText(v.hot, 6000)}`);
        }
        if (typeof v.index === 'string' && v.index.length > 0) {
            parts.push(`--- wiki/index.md (master catalog) ---\n${capText(v.index, 8000)}`);
        }
        if (parts.length === 0)
            return 'wiki_query (quick): the vault has no hot.md or index.md yet';
        return `wiki_query (quick): hot cache and master index follow. Read these before any page.\n\n${parts.join('\n\n')}`;
    }
    if (!Array.isArray(v.results))
        return 'wiki_query: no result';
    const lines = [
        `wiki_query: ${v.results.length} of ${v.totalMatches ?? v.results.length} matching pages. Open a page with the fs read tool for full content.`,
    ];
    for (const hit of v.results) {
        lines.push(`\n### ${hit.name}`);
        lines.push(`path: ${hit.path} · score ${hit.score} · inbound ${hit.inbound.length}${hit.inbound.length > 0 ? ` (${hit.inbound.slice(0, 5).join(', ')})` : ''} · outbound ${hit.outbound.length}`);
        if (hit.snippet)
            lines.push(`> ${hit.snippet}`);
    }
    return capText(lines.join('\n'), 12000);
}
function renderWrite(args, value) {
    const a = args;
    const v = value;
    if (!v)
        return 'wiki_write: failed';
    if (v.alreadyIngested === true) {
        return `wiki_write: skipped ${a.title ?? ''} — source hash unchanged (pass force: true to re-write)`;
    }
    if (v.path) {
        const action = v.created ? 'created' : 'updated';
        const tail = Array.isArray(v.unresolvedLinks) && v.unresolvedLinks.length > 0
            ? `\nwiki_write: note — ${v.unresolvedLinks.length} unresolved wikilink(s) in this page: ${v.unresolvedLinks.slice(0, 8).join(', ')}${v.unresolvedLinks.length > 8 ? ', …' : ''}. Create those pages or fix the targets.`
            : '';
        return `wiki_write: ${action} ${v.path}${tail}`;
    }
    return `wiki_write: skipped ${a.title ?? ''}`;
}
function renderRename(value) {
    const v = value;
    if (!v || !v.path)
        return 'wiki_rename: failed';
    return `wiki_rename: [[${v.from}]] → [[${v.to}]]`;
}
function renderLint(value) {
    const v = value;
    if (!v || !v.totals)
        return 'wiki_lint: failed';
    const t = v.totals;
    const lines = [
        `wiki_lint: ${t.error + t.warn + t.info} issues (${t.error} error, ${t.warn} warn, ${t.info} info)`,
        `report: ${v.reportPath ?? '(not written)'}`,
    ];
    for (const i of (v.issues ?? []).slice(0, 60)) {
        lines.push(`- [${i.severity}] ${i.category} · ${i.file}: ${i.message}${i.suggestion ? ' → ' + i.suggestion : ''}`);
    }
    if ((v.issues ?? []).length > 60)
        lines.push(`… and ${(v.issues ?? []).length - 60} more (see the report file)`);
    return lines.join('\n');
}
function renderScaffold(value) {
    // `scaffold()` returns the bare plan on dry-run and `{applied, plan}` after apply.
    const v = value;
    if (!v)
        return 'wiki_scaffold: failed';
    const plan = 'plan' in v && v.plan ? v.plan : v;
    if (!plan || !Array.isArray(plan.create))
        return 'wiki_scaffold: failed';
    if ('applied' in v && v.applied) {
        return `wiki_scaffold: created ${plan.create.length} dirs, wrote ${plan.write.length} files, skipped ${plan.skipped.length} existing`;
    }
    return `wiki_scaffold (dry-run): would create ${plan.create.length} dirs and write ${plan.write.length} files. Pass apply: true to actually write.`;
}
function renderList(value) {
    const v = value;
    if (!v || !Array.isArray(v.titles))
        return 'wiki_list: failed';
    if (v.titles.length === 0)
        return 'wiki_list: vault is empty';
    return `wiki_list: ${v.titles.length} pages\n\n` + v.titles.map(t => `- [[${t}]]`).join('\n');
}
// default export for tooling that expects the module form
export default { name, inject, Config, apply };
//# sourceMappingURL=index.js.map