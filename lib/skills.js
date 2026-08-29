/**
 * skills.ts — register all SKILL.md files in ./skills/ via ctx.skills.
 *
 * Discovers any directory containing SKILL.md, parses the frontmatter to
 * extract `name` and `description`, and registers it. The body (everything
 * after the frontmatter) becomes the skill's `content`, and `source` is a
 * stable string identifying this plugin bundle. `resourceBase` points back
 * at the skill's own directory so its body can reference references/ files
 * via the standard Agent Skills convention.
 *
 * Why `source` + `content` are required: the `@deepseek-ai/dsh-skill`
 * registry validates a loaded runtime skill strictly — a missing (or
 * non-string) `source` throws `skill provider ... with a non-string source`,
 * and a missing `content` throws `content must be a string`.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const FM_RE = /^---\n([\s\S]*?)\n---\n?/;
/** Stable `source` string for every skill this plugin registers. */
const BUNDLE_SOURCE = 'dsh-obsidian';
function parseSkillFrontmatter(md) {
    const m = FM_RE.exec(md);
    if (!m)
        return {};
    const out = {};
    for (const line of m[1].split('\n')) {
        const idx = line.indexOf(':');
        if (idx < 0)
            continue;
        // Only the first `:` splits key/value; descriptions may contain `:`.
        out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return { name: out.name, description: out.description };
}
/** Strip the leading YAML frontmatter block; returns the body trimmed. */
function stripFrontmatter(md) {
    const m = FM_RE.exec(md);
    return m ? md.slice(m[0].length).trim() : md.trim();
}
export function registerAllSkills(ctx, skillsDir) {
    const registered = [];
    if (!existsSync(skillsDir)) {
        ctx.logger.warn(`skills dir not found: ${skillsDir}`);
        return registered;
    }
    for (const entry of readdirSync(skillsDir)) {
        const dir = join(skillsDir, entry);
        if (!statSync(dir).isDirectory())
            continue;
        const skillFile = join(dir, 'SKILL.md');
        if (!existsSync(skillFile))
            continue;
        const md = readFileSync(skillFile, 'utf8');
        const fm = parseSkillFrontmatter(md);
        if (!fm.name) {
            ctx.logger.warn(`skipping skill (no name in frontmatter): ${entry}`);
            continue;
        }
        const content = stripFrontmatter(md);
        if (content.length === 0) {
            ctx.logger.warn(`skipping skill ${fm.name}: empty body after frontmatter`);
            continue;
        }
        const manifest = {
            name: fm.name,
            description: fm.description ?? '',
            source: BUNDLE_SOURCE,
            content,
            path: skillFile,
            resourceBase: { kind: 'directory', path: dir },
        };
        try {
            ctx.skills.register(manifest);
            registered.push(fm.name);
            ctx.logger.debug(`  registered skill: ${fm.name}`);
        }
        catch (e) {
            ctx.logger.error(`failed to register skill ${fm.name}: ${e.message}`);
        }
    }
    return registered;
}
//# sourceMappingURL=skills.js.map