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
import type { Context, PluginModule } from './types.js';
export declare const name = "dsh-obsidian";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
declare const _default: PluginModule;
export default _default;
//# sourceMappingURL=index.d.ts.map