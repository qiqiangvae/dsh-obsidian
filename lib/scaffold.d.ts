/**
 * scaffold.ts — initialize a vault with the LLM Wiki layout.
 *
 * Default template scaffolds: wiki/, .raw/, wiki/meta/, plus seed files
 * (index.md, hot.md, log.md, Inbox.md). Dry-run by default; pass
 * `{ apply: true }` to actually write.
 */
import { type PluginConfig } from './vault.js';
export interface ScaffoldArgs {
    template?: 'default' | 'minimal' | 'research';
    apply?: boolean;
}
export interface ScaffoldPlan {
    create: string[];
    write: {
        path: string;
        content: string;
    }[];
    skipped: string[];
}
export declare function plan(vaultPath: string, config: PluginConfig, args?: ScaffoldArgs): ScaffoldPlan;
export declare function scaffold(vaultPath: string, config: PluginConfig, args?: ScaffoldArgs): ScaffoldPlan | {
    applied: true;
    plan: ScaffoldPlan;
};
//# sourceMappingURL=scaffold.d.ts.map