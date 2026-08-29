/**
 * vault.ts — vault file operations, type routing, frontmatter bookkeeping.
 *
 * Re-implementation of the LLM Wiki pattern's mechanical core (paths,
 * frontmatter, master index, log, source delta tracking). Adapted from
 * dsh-plugin-wiki-tools; now written directly against node:fs in modern
 * TypeScript so it survives cordis API churn.
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, renameSync, unlinkSync, } from 'node:fs';
import { join, dirname, basename, extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
// ──────────────────────────────────────────────────────────────────────────────
// Defaults — overridable via config.typeFolders
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_TYPE_FOLDERS = {
    domain: 'wiki/areas',
    area: 'wiki/areas',
    project: 'wiki/projects',
    resource: 'wiki/resources',
    source: 'wiki/sources',
    archive: 'wiki/archive',
    index: 'wiki',
    log: 'wiki',
    hot: 'wiki',
};
export function resolveLayout(vaultPath, config) {
    const typeFolders = { ...DEFAULT_TYPE_FOLDERS, ...(config.typeFolders ?? {}) };
    return {
        wikiDir: join(vaultPath, 'wiki'),
        rawDir: join(vaultPath, '.raw'),
        metaDir: join(vaultPath, 'wiki', 'meta'),
        indexFile: join(vaultPath, 'wiki', 'index.md'),
        logFile: join(vaultPath, 'wiki', 'log.md'),
        hotFile: join(vaultPath, 'wiki', 'hot.md'),
        typeFolders,
    };
}
// ──────────────────────────────────────────────────────────────────────────────
// Path safety — jail everything inside the configured vaultPath
// ──────────────────────────────────────────────────────────────────────────────
const RESERVED_DEVICE_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
const PORTABLE_BAD_CHARS = /[:<>"|?*\\]/;
const PORTABLE_BAD_TAIL = /[ .]+$/;
export function isMachineryPage(name) {
    // case-insensitive: "Lint Report", "lint report", "LINT REPORT" all count
    return /^lint report\b/i.test(name);
}
export function isPortableFilename(name) {
    if (!name)
        return false;
    if (RESERVED_DEVICE_NAMES.test(name))
        return false;
    if (PORTABLE_BAD_CHARS.test(name))
        return false;
    if (PORTABLE_BAD_TAIL.test(name))
        return false;
    return true;
}
/** Reject any path that resolves outside vaultPath. */
export function assertInsideVault(vaultPath, target) {
    const abs = resolve(target);
    const root = resolve(vaultPath);
    if (abs !== root && !abs.startsWith(root + sep)) {
        throw new Error(`path escapes vault: ${target}`);
    }
}
const FM_RE = /^---\n([\s\S]*?)\n---\n?/;
export function parseFrontmatter(md) {
    const m = FM_RE.exec(md);
    if (!m)
        return { fm: {}, body: md };
    const fm = {};
    for (const line of m[1].split('\n')) {
        const idx = line.indexOf(':');
        if (idx < 0)
            continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
            // YAML-style inline list: [a, b, c] — split, strip quotes
            val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
        else if (typeof val === 'string') {
            val = val.replace(/^["']|["']$/g, '');
        }
        fm[key] = val;
    }
    return { fm, body: md.slice(m[0].length) };
}
export function serializeFrontmatter(fm) {
    const lines = ['---'];
    for (const [k, v] of Object.entries(fm)) {
        if (v === undefined)
            continue;
        if (Array.isArray(v)) {
            lines.push(`${k}: ${JSON.stringify(v)}`);
        }
        else if (typeof v === 'string' && (v.includes(':') || v.startsWith('['))) {
            lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
        }
        else {
            lines.push(`${k}: ${v}`);
        }
    }
    lines.push('---', '');
    return lines.join('\n');
}
export function completeFrontmatter(existing, patch, now = new Date().toISOString().slice(0, 10)) {
    const merged = { ...existing, ...patch };
    if (!merged.created)
        merged.created = existing.created ?? now;
    merged.updated = now;
    return merged;
}
// ──────────────────────────────────────────────────────────────────────────────
// Index / log / hot bookkeeping
// ──────────────────────────────────────────────────────────────────────────────
export function upsertIndexEntry(indexFile, type, sectionHeading, title, style = ':') {
    if (!existsSync(indexFile)) {
        writeFileSync(indexFile, `# Index\n\n`);
    }
    const md = readFileSync(indexFile, 'utf8');
    const sectionRe = new RegExp(`(^## ${escapeRe(sectionHeading)}\\n)([\\s\\S]*?)(?=^## |\\Z)`, 'm');
    const m = sectionRe.exec(md);
    const sep = style === '—' ? ' — ' : ': ';
    const entry = `- [[${title}]]${sep}${type}\n`;
    let next;
    if (m) {
        const body = m[2];
        if (body.includes(`[[${title}]]`))
            return; // already present
        next = md.replace(m[0], m[1] + body + entry + m[3]);
    }
    else {
        next = md + `\n## ${sectionHeading}\n\n` + entry;
    }
    writeFileSync(indexFile, next);
}
export function appendLog(logFile, line) {
    if (!existsSync(dirname(logFile))) {
        mkdirSync(dirname(logFile), { recursive: true });
    }
    const today = new Date().toISOString().slice(0, 10);
    let md = existsSync(logFile) ? readFileSync(logFile, 'utf8') : `# Log\n\n`;
    if (!md.startsWith(`## ${today}`)) {
        md = `## ${today}\n\n` + md.replace(/^# Log\n\n/, '');
    }
    md = `- ${new Date().toISOString()} — ${line}\n` + md;
    writeFileSync(logFile, md);
}
export function safeFilename(title) {
    return title.replace(/[\\/]/g, '-').replace(/[<>:"?*|]/g, '').trim() || 'untitled';
}
export function routePageFolder(layout, type) {
    const folder = layout.typeFolders[type] ?? layout.typeFolders['resource'];
    return join(layout.wikiDir, folder);
}
export function collectUnresolvedLinks(body, knownTitles) {
    const linkRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const out = [];
    const seen = new Set();
    for (const m of body.matchAll(linkRe)) {
        const t = m[1].trim();
        if (knownTitles.has(t) || seen.has(t))
            continue;
        seen.add(t);
        out.push(t);
    }
    return out;
}
export function listAllTitles(wikiDir) {
    const titles = new Set();
    if (!existsSync(wikiDir))
        return titles;
    for (const f of walkMd(wikiDir)) {
        const base = basename(f, extname(f));
        if (!isMachineryPage(base))
            titles.add(base);
    }
    return titles;
}
export function sha256(s) {
    return createHash('sha256').update(s).digest('hex');
}
export function writePage(vaultPath, config, args) {
    const layout = resolveLayout(vaultPath, config);
    const filename = safeFilename(args.title);
    if (isMachineryPage(filename)) {
        throw new Error(`refusing to write machinery page: ${filename}`);
    }
    if (!isPortableFilename(filename)) {
        throw new Error(`non-portable filename: ${filename}`);
    }
    const folder = routePageFolder(layout, args.type);
    assertInsideVault(vaultPath, folder);
    if (!existsSync(folder))
        mkdirSync(folder, { recursive: true });
    const targetPath = join(folder, `${filename}.md`);
    // filename-uniqueness guard
    if (existsSync(targetPath) && args.title !== basename(targetPath, '.md')) {
        throw new Error(`filename collision: ${targetPath}`);
    }
    // source hash + skip-on-unchanged
    let sourceHash;
    if (args.source_path) {
        if (!existsSync(args.source_path)) {
            throw new Error(`source not found: ${args.source_path}`);
        }
        sourceHash = sha256(readFileSync(args.source_path));
    }
    // parse existing page (if any) to preserve `created` and unknown fields
    const existing = existsSync(targetPath)
        ? parseFrontmatter(readFileSync(targetPath, 'utf8'))
        : { fm: {}, body: '' };
    if (existing.fm.source_hash && sourceHash && existing.fm.source_hash === sourceHash && !args.force) {
        return { path: targetPath, unresolvedLinks: [], sourceHash, skipped: true };
    }
    const fm = completeFrontmatter(existing.fm, {
        title: args.title,
        type: args.type,
        tags: args.tags,
        source: args.source_path,
        source_hash: sourceHash,
    });
    const final = serializeFrontmatter(fm) + args.content;
    writeFileSync(targetPath, final, 'utf8');
    // index & log
    const sectionHeading = layout.typeFolders[args.type]?.replace(/^wiki\//, '') ?? args.type;
    upsertIndexEntry(layout.indexFile, args.type, sectionHeading, args.title);
    appendLog(layout.logFile, `${args.type} [[${args.title}]]${args.source_path ? ` (source ${args.source_path})` : ''}`);
    // forward-link report
    const titles = listAllTitles(layout.wikiDir);
    titles.add(args.title);
    const unresolvedLinks = collectUnresolvedLinks(args.content, titles);
    return { path: targetPath, unresolvedLinks, sourceHash };
}
// ──────────────────────────────────────────────────────────────────────────────
// Page rename with machinery protection
// ──────────────────────────────────────────────────────────────────────────────
export function renamePage(vaultPath, oldTitle, newTitle) {
    const oldName = safeFilename(oldTitle);
    const newName = safeFilename(newTitle);
    if (isMachineryPage(oldName) || isMachineryPage(newName)) {
        throw new Error('refusing to rename machinery page');
    }
    const from = join(vaultPath, 'wiki', 'resources', `${oldName}.md`);
    const to = join(vaultPath, 'wiki', 'resources', `${newName}.md`);
    if (!existsSync(from))
        throw new Error(`not found: ${from}`);
    if (existsSync(to))
        throw new Error(`target exists: ${to}`);
    renameSync(from, to);
    return { from, to };
}
export function deletePage(vaultPath, title) {
    const name = safeFilename(title);
    if (isMachineryPage(name))
        throw new Error('refusing to delete machinery page');
    // search in all typeFolders
    for (const folder of Object.values(DEFAULT_TYPE_FOLDERS)) {
        const p = join(vaultPath, folder, `${name}.md`);
        if (existsSync(p)) {
            unlinkSync(p);
            return;
        }
    }
    throw new Error(`not found: ${title}`);
}
// ──────────────────────────────────────────────────────────────────────────────
// Walk helpers
// ──────────────────────────────────────────────────────────────────────────────
export function* walkMd(root) {
    if (!existsSync(root))
        return;
    for (const entry of readdirSync(root)) {
        const p = join(root, entry);
        let st;
        try {
            st = statSync(p);
        }
        catch {
            continue;
        }
        if (st.isDirectory()) {
            if (entry === 'meta' || entry.startsWith('.'))
                continue;
            yield* walkMd(p);
        }
        else if (st.isFile() && p.endsWith('.md')) {
            yield p;
        }
    }
}
function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=vault.js.map