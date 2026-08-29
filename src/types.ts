/**
 * Minimal type declarations for the DSH cordis API we use.
 * Keep this aligned with the `@deepseek-ai/cordis` package; bump when
 * cordis releases a new major. The DSH docs and the dsh-plugin topic track
 * this closely.
 */

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

export interface ToolHandlerArgs<P = Record<string, unknown>> {
  params: P;
  ctx: Context;
}

export interface ToolDefinition<P = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler(args: ToolHandlerArgs<P>): Promise<unknown> | unknown;
}

export interface ToolsService {
  register<P = unknown>(def: ToolDefinition<P>): void;
}

export interface SkillManifest {
  name: string;
  description: string;
  /** Absolute or ctx-relative path to the SKILL.md */
  path: string;
  /** Directory of references/ the skill can load */
  resourceBase?: string;
}

export interface SkillsService {
  register(manifest: SkillManifest): void;
  registerFromDir(dir: string): void;
}

export interface PluginConfig {
  /** Absolute path to the Obsidian vault root */
  vaultPath: string;
  /** Optional folder routing for page types (defaults applied if omitted) */
  typeFolders?: Record<string, string>;
  /** Cap on query results (default 10) */
  maxQueryResults?: number;
}

export interface Context {
  logger: Logger;
  config: PluginConfig;
  tools: ToolsService;
  skills: SkillsService;
  /** Effect-tracked resource; calling the returned function disposes the effect. */
  effect(fn: () => void | (() => void)): () => void;
  on<E = unknown>(event: string, listener: (e: E) => void): () => void;
}

export interface PluginModule {
  name: string;
  inject?: string[];
  apply(ctx: Context): void | Promise<void>;
}
