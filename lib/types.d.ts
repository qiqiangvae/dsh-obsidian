/**
 * types.ts — minimal type declarations for the DSH cordis API we use.
 * When dsh bumps the public API, update these; the loader reports mismatches.
 */
import type { Context as CordisContext } from '@deepseek-ai/cordis';
export type Context = CordisContext;
export interface Logger {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
}
export interface RenderedOutput {
    type: 'text';
    text: string;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    output?: {
        schema?: unknown;
        render?: (args: unknown, value: unknown) => RenderedOutput[];
    };
    execute(args: Record<string, unknown>): Promise<unknown> | unknown;
    presentCall?: (args: Record<string, unknown>) => Record<string, unknown>;
}
export interface ToolsService {
    register(tool: ToolDefinition): void;
}
export interface SkillManifest {
    name: string;
    description: string;
    path: string;
    resourceBase?: string;
}
export interface SkillsService {
    register(manifest: SkillManifest): void;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        skills: SkillsService;
    }
}
export interface PluginConfig {
    vaultPath: string;
    typeFolders?: Record<string, string>;
    maxQueryResults?: number;
}
//# sourceMappingURL=types.d.ts.map