/**
 * skills.ts — register all SKILL.md files in ./skills/ via ctx.skills.
 *
 * Discovers any directory containing SKILL.md, parses the frontmatter to
 * extract `name` and `description`, and registers it. resourceBase points
 * back at the skill's own directory so its body can reference
 * references/ files via the standard Agent Skills convention.
 */
import type { Context } from './types.js';
export declare function registerAllSkills(ctx: Context, skillsDir: string): string[];
//# sourceMappingURL=skills.d.ts.map