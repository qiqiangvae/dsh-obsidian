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
import type { Context } from './types.js';
export declare function registerAllSkills(ctx: Context, skillsDir: string): string[];
//# sourceMappingURL=skills.d.ts.map