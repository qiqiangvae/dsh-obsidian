/**
 * lint.ts — vault health check.
 *
 * Re-implementation of dsh-plugin-wiki-tools' lint contract. Report only by
 * default; suggestions are emitted but no auto-fix is performed unless the
 * caller passes `{ fix: true }`.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { walkMd, isMachineryPage, parseFrontmatter, resolveLayout } from './vault.js';
const LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const H2_RE = /^##\s+(.+)$/;
export function lint(vaultPath, config, opts = {}) {
    const layout = resolveLayout(vaultPath, config);
    const issues = [];
    const titles = new Set();
    const filenameCount = new Map();
    const fileByTitle = new Map();
    for (const p of walkMd(layout.wikiDir)) {
        const title = basename(p, extname(p));
        if (isMachineryPage(title))
            continue;
        titles.add(title);
        filenameCount.set(title, (filenameCount.get(title) ?? 0) + 1);
        if (!fileByTitle.has(title))
            fileByTitle.set(title, p);
    }
    // duplicates
    for (const [title, n] of filenameCount) {
        if (n > 1) {
            issues.push({
                severity: 'error',
                category: 'duplicate-filename',
                file: title,
                message: `filename "${title}" used ${n} times`,
                suggestion: 'merge or rename the duplicates',
            });
        }
    }
    // per-file checks
    for (const p of walkMd(layout.wikiDir)) {
        const title = basename(p, extname(p));
        if (isMachineryPage(title))
            continue;
        const raw = readFileSync(p, 'utf8');
        const { fm, body } = parseFrontmatter(raw);
        // frontmatter gaps
        if (!fm.type) {
            issues.push({ severity: 'warn', category: 'frontmatter', file: p, message: 'missing `type`', suggestion: 'add `type: resource` (or domain/area/project/source)' });
        }
        if (!fm.created) {
            issues.push({ severity: 'info', category: 'frontmatter', file: p, message: 'missing `created`', suggestion: 'add `created: YYYY-MM-DD`' });
        }
        // dead links
        for (const m of body.matchAll(LINK_RE)) {
            const target = m[1].trim();
            if (!titles.has(target)) {
                issues.push({ severity: 'warn', category: 'dead-link', file: p, message: `unresolved [[${target}]]`, suggestion: `create "${target}" or fix the link` });
            }
        }
        // empty sections
        for (const m of body.matchAll(/\n## ([^\n]+)\n+(?=\n|## )/g)) {
            issues.push({ severity: 'info', category: 'empty-section', file: p, message: `section "${m[1]}" is empty`, suggestion: 'add content or remove the heading' });
        }
    }
    // orphan pages: no inbound [[wikilink]] from any *content* page.
    // The master index.md, hot.md, log.md, and Lint Report files are machinery
    // — entries there do not count as real inbound links.
    const MACHINERY = new Set(['index', 'hot', 'log']);
    const inbound = new Map();
    for (const p of walkMd(layout.wikiDir)) {
        const srcTitle = basename(p, extname(p));
        if (isMachineryPage(srcTitle) || MACHINERY.has(srcTitle))
            continue;
        const { body } = parseFrontmatter(readFileSync(p, 'utf8'));
        for (const m of body.matchAll(LINK_RE)) {
            const t = m[1].trim();
            inbound.set(t, (inbound.get(t) ?? 0) + 1);
        }
    }
    for (const title of titles) {
        if (MACHINERY.has(title) || isMachineryPage(title))
            continue;
        if (!inbound.has(title)) {
            issues.push({ severity: 'info', category: 'orphan', file: fileByTitle.get(title), message: `"${title}" has no inbound links`, suggestion: 'link it from a related page or remove' });
        }
    }
    // stale index
    if (existsSync(layout.indexFile)) {
        const idxBody = readFileSync(layout.indexFile, 'utf8');
        for (const title of titles) {
            if (isMachineryPage(title))
                continue;
            if (!idxBody.includes(`[[${title}]]`)) {
                issues.push({ severity: 'info', category: 'stale-index', file: layout.indexFile, message: `"${title}" missing from index`, suggestion: 're-run `wiki_write` or add manually' });
            }
        }
    }
    // stale hot
    if (existsSync(layout.hotFile)) {
        const hotMtime = statSync(layout.hotFile).mtimeMs;
        const ageDays = (Date.now() - hotMtime) / 86400000;
        if (ageDays > 30) {
            issues.push({ severity: 'info', category: 'stale-hot', file: layout.hotFile, message: `hot cache is ${Math.floor(ageDays)} days old`, suggestion: 'regenerate via `wiki_query` quick mode' });
        }
    }
    const totals = { error: 0, warn: 0, info: 0 };
    for (const i of issues)
        totals[i.severity]++;
    const report = {
        generatedAt: new Date().toISOString(),
        totals,
        issues,
    };
    if (opts.fix) {
        // report-only build: no auto-fix yet. Hooked in for parity with future
        // versions; not silently destructive in v0.1.
    }
    return report;
}
export function writeLintReport(vaultPath, config, report) {
    const layout = resolveLayout(vaultPath, config);
    if (!existsSync(layout.metaDir))
        mkdirSync(layout.metaDir, { recursive: true });
    const date = report.generatedAt.slice(0, 10);
    const path = join(layout.metaDir, `Lint Report ${date}.md`);
    const lines = [];
    lines.push(`# Lint Report — ${date}`, '');
    lines.push(`Totals: ${report.totals.error} error(s), ${report.totals.warn} warn(s), ${report.totals.info} info(s)`, '');
    for (const sev of ['error', 'warn', 'info']) {
        const group = report.issues.filter(i => i.severity === sev);
        if (group.length === 0)
            continue;
        lines.push(`## ${sev.toUpperCase()} (${group.length})`, '');
        for (const i of group) {
            lines.push(`- **${i.category}** — \`${i.file}\`: ${i.message}`);
            if (i.suggestion)
                lines.push(`  - _suggestion:_ ${i.suggestion}`);
        }
        lines.push('');
    }
    writeFileSync(path, lines.join('\n'), 'utf8');
    return path;
}
//# sourceMappingURL=lint.js.map