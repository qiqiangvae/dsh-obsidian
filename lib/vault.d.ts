/**
 * vault.ts — vault file operations, type routing, frontmatter bookkeeping.
 *
 * Re-implementation of the LLM Wiki pattern's mechanical core (paths,
 * frontmatter, master index, log, source delta tracking). Adapted from
 * dsh-plugin-wiki-tools; now written directly against node:fs in modern
 * TypeScript so it survives cordis API churn.
 */
import type { PluginConfig } from './types.js';
export type { PluginConfig } from './types.js';
export interface VaultLayout {
    wikiDir: string;
    rawDir: string;
    metaDir: string;
    indexFile: string;
    logFile: string;
    hotFile: string;
    typeFolders: Record<string, string>;
}
export declare function resolveLayout(vaultPath: string, config: PluginConfig): VaultLayout;
export declare function isMachineryPage(name: string): boolean;
export declare function isPortableFilename(name: string): boolean;
/** Reject any path that resolves outside vaultPath. */
export declare function assertInsideVault(vaultPath: string, target: string): void;
export interface Frontmatter {
    title?: string;
    type?: string;
    tags?: string[];
    created?: string;
    updated?: string;
    source?: string;
    source_hash?: string;
    [k: string]: unknown;
}
export declare function parseFrontmatter(md: string): {
    fm: Frontmatter;
    body: string;
};
export declare function serializeFrontmatter(fm: Frontmatter): string;
export declare function completeFrontmatter(existing: Frontmatter, patch: Partial<Frontmatter>, now?: string): Frontmatter;
export declare function upsertIndexEntry(indexFile: string, type: string, sectionHeading: string, title: string, style?: ':' | '—'): void;
export declare function appendLog(logFile: string, line: string): void;
export interface WritePageArgs {
    title: string;
    type: string;
    content: string;
    tags?: string[];
    source_path?: string;
    force?: boolean;
}
export interface WritePageResult {
    path: string;
    unresolvedLinks: string[];
    sourceHash?: string;
    skipped?: boolean;
}
export declare function safeFilename(title: string): string;
export declare function routePageFolder(layout: VaultLayout, type: string): string;
export declare function collectUnresolvedLinks(body: string, knownTitles: Set<string>): string[];
export declare function listAllTitles(wikiDir: string): Set<string>;
export declare function sha256(s: string | Buffer): string;
export declare function writePage(vaultPath: string, config: PluginConfig, args: WritePageArgs): WritePageResult;
export declare function renamePage(vaultPath: string, oldTitle: string, newTitle: string): {
    from: string;
    to: string;
};
export declare function deletePage(vaultPath: string, title: string): void;
export declare function walkMd(root: string): Generator<string>;
//# sourceMappingURL=vault.d.ts.map