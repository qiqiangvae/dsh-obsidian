/**
 * skills.ts — register all SKILL.md files in ./skills/ via ctx.skills.
 *
 * Discovers any directory containing SKILL.md, parses the frontmatter to
 * extract `name` and `description`, and registers it. resourceBase points
 * back at the skill's own directory so its body can reference
 * references/ files via the standard Agent Skills convention.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Context, SkillManifest } from './types.js';

const FM_RE = /^---\n([\s\S]*?)\n---\n?/;

function parseSkillFrontmatter(md: string): { name?: string; description?: string } {
  const m = FM_RE.exec(md);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { name: out.name, description: out.description };
}

export function registerAllSkills(ctx: Context, skillsDir: string): string[] {
  const registered: string[] = [];
  if (!existsSync(skillsDir)) {
    ctx.logger.warn(`skills dir not found: ${skillsDir}`);
    return registered;
  }

  for (const entry of readdirSync(skillsDir)) {
    const dir = join(skillsDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    const skillFile = join(dir, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const md = readFileSync(skillFile, 'utf8');
    const fm = parseSkillFrontmatter(md);
    if (!fm.name) {
      ctx.logger.warn(`skipping skill (no name in frontmatter): ${entry}`);
      continue;
    }
    const manifest: SkillManifest = {
      name: fm.name,
      description: fm.description ?? '',
      path: skillFile,
      resourceBase: dir,
    };
    try {
      ctx.skills.register(manifest);
      registered.push(fm.name);
      ctx.logger.debug(`  registered skill: ${fm.name}`);
    } catch (e) {
      ctx.logger.error(`failed to register skill ${fm.name}: ${(e as Error).message}`);
    }
  }

  return registered;
}
