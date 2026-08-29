/**
 * types.ts — minimal type declarations for the DSH cordis API we use.
 * When dsh bumps the public API, update these; the loader reports mismatches.
 */

// Re-export the canonical Context type from cordis.
import type { Context as CordisContext } from '@deepseek-ai/cordis';
export type Context = CordisContext;

// Logger
export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

// Tools service — local loose types for code clarity; the real
// dsh-tools types are stricter (JsonValue) but our execute bodies return
// structured plain objects that DO satisfy JsonValue at runtime.
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

// Skills service — registers Agent Skills SKILL.md manifests.
export interface SkillManifest {
  name: string;
  description: string;
  path: string;
  resourceBase?: string;
}

export interface SkillsService {
  register(manifest: SkillManifest): void;
}

// Tell the cordis module that our `Context` view has `skills` too.
// (cordis itself only ships the logger; the dsh-tools / dsh-skills bundles
// add their own properties via the same `declare module` pattern.)
declare module '@deepseek-ai/cordis' {
  interface Context {
    skills: SkillsService;
  }
}

// PluginConfig — the resolved config object passed around the helpers.
export interface PluginConfig {
  vaultPath: string;
  typeFolders?: Record<string, string>;
  maxQueryResults?: number;
}
