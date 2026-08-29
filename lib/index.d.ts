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
import z from '@deepseek-ai/schemastery';
import type { Context } from './types.js';
export declare const Config: z<Schemastery.ObjectS<{
    /** Absolute path to the Obsidian vault root. */
    vaultPath: z<string, string>;
    /** Max wiki_query hits in standard mode. */
    maxQueryResults: z<number, number>;
    /** Optional per-type folder overrides. */
    typeFolders: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>>;
}>, Schemastery.ObjectT<{
    /** Absolute path to the Obsidian vault root. */
    vaultPath: z<string, string>;
    /** Max wiki_query hits in standard mode. */
    maxQueryResults: z<number, number>;
    /** Optional per-type folder overrides. */
    typeFolders: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>>;
}>>;
/** Hand-written mirror of the schema above; dsh passes this exact shape to apply. */
export interface ObsidianConfig {
    vaultPath: string;
    maxQueryResults: number;
    typeFolders: Record<string, string>;
}
export declare const name = "dsh-obsidian";
export declare const inject: string[];
export declare function apply(ctx: Context, config: ObsidianConfig): Promise<void>;
declare const _default: {
    name: string;
    inject: string[];
    Config: z<Schemastery.ObjectS<{
        /** Absolute path to the Obsidian vault root. */
        vaultPath: z<string, string>;
        /** Max wiki_query hits in standard mode. */
        maxQueryResults: z<number, number>;
        /** Optional per-type folder overrides. */
        typeFolders: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>>;
    }>, Schemastery.ObjectT<{
        /** Absolute path to the Obsidian vault root. */
        vaultPath: z<string, string>;
        /** Max wiki_query hits in standard mode. */
        maxQueryResults: z<number, number>;
        /** Optional per-type folder overrides. */
        typeFolders: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>>;
    }>>;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map