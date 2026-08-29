/**
 * lint.ts — vault health check.
 *
 * Re-implementation of dsh-plugin-wiki-tools' lint contract. Report only by
 * default; suggestions are emitted but no auto-fix is performed unless the
 * caller passes `{ fix: true }`.
 */
import { type PluginConfig } from './vault.js';
export interface LintIssue {
    severity: 'error' | 'warn' | 'info';
    category: string;
    file: string;
    message: string;
    suggestion?: string;
}
export interface LintReport {
    generatedAt: string;
    totals: Record<LintIssue['severity'], number>;
    issues: LintIssue[];
}
export declare function lint(vaultPath: string, config: PluginConfig, opts?: {
    fix?: boolean;
}): LintReport;
export declare function writeLintReport(vaultPath: string, config: PluginConfig, report: LintReport): string;
//# sourceMappingURL=lint.d.ts.map