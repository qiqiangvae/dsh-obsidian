// test/apply.smoke.test.mjs — exercises apply() against a mocked DSH ctx
// without needing a real dsh runtime. Catches contract regressions (the
// exact bug that motivated the dsh.bundle + apply(ctx, config) fix).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { apply, name, inject, Config } from '../lib/index.js';

function makeCtx() {
  const log = [];
  const tools = new Map();
  const skills = [];
  return {
    logger: {
      info: (m) => log.push(['info', m]),
      warn: (m) => log.push(['warn', m]),
      error: (m) => log.push(['error', m]),
      debug: (m) => log.push(['debug', m]),
    },
    tools: {
      register: (t) => tools.set(t.name, t),
    },
    skills: {
      register: (s) => skills.push(s),
    },
    _tools: tools,
    _skills: skills,
    _log: log,
  };
}

test('plugin identity: name + inject', () => {
  assert.equal(name, 'dsh-obsidian');
  assert.ok(inject.includes('tools'));
  assert.ok(inject.includes('skills'));
});

test('Config schema validates and rejects empty vaultPath', () => {
  // valid
  const ok = Config({ vaultPath: '/tmp/x' });
  assert.equal(ok.vaultPath, '/tmp/x');
  assert.equal(ok.maxQueryResults, 10);
  // missing vaultPath should fail
  assert.throws(() => Config({}));
});

test('apply() fails loud when vaultPath is empty string', async () => {
  const ctx = makeCtx();
  await assert.rejects(
    () => apply(ctx, { vaultPath: '', maxQueryResults: 10, typeFolders: {} }),
    /vaultPath is required/,
  );
});

test('apply() warns when vaultPath does not exist (but does not throw)', async () => {
  const ctx = makeCtx();
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-apply-')) + '_does_not_exist';
  await apply(ctx, { vaultPath: root, maxQueryResults: 10, typeFolders: {} });
  const warns = ctx._log.filter(([lvl]) => lvl === 'warn').map(([, m]) => m);
  assert.ok(warns.some((m) => m.includes('vaultPath does not exist')), 'expected a vaultPath-missing warning');
});

test('apply() registers the six tools and discovers the bundled skills', async () => {
  const ctx = makeCtx();
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-apply-'));
  await apply(ctx, { vaultPath: root, maxQueryResults: 5, typeFolders: {} });

  const expectedTools = ['wiki_query', 'wiki_write', 'wiki_rename', 'wiki_lint', 'wiki_scaffold', 'wiki_list'];
  for (const t of expectedTools) {
    assert.ok(ctx._tools.has(t), `expected tool ${t} to be registered`);
  }

  // skills: at least wiki + 4 reference skills should be present
  const skillNames = ctx._skills.map((s) => s.name);
  assert.ok(skillNames.includes('wiki'), 'expected skill "wiki"');
  assert.ok(skillNames.includes('wiki-query'), 'expected skill "wiki-query"');
  assert.ok(skillNames.includes('wiki-write') || skillNames.includes('wiki-ingest'), 'expected one wiki-* ingest/query skill');
  assert.ok(skillNames.includes('obsidian-markdown'), 'expected skill "obsidian-markdown"');
});

test('wiki_write tool actually writes a page to a fresh vault', async () => {
  const ctx = makeCtx();
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-write-'));
  await apply(ctx, { vaultPath: root, maxQueryResults: 10, typeFolders: {} });

  const writeTool = ctx._tools.get('wiki_write');
  const result = await writeTool.execute({
    title: 'Hello World',
    type: 'resource',
    content: '# Hello\n\nBody.',
  });
  assert.ok(result.path, 'writePage returned a path');
  assert.ok(existsSync(result.path), 'file actually exists');
  rmSync(root, { recursive: true, force: true });
});

test('wiki_query tool returns BM25 hits', async () => {
  const ctx = makeCtx();
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-q-'));
  await apply(ctx, { vaultPath: root, maxQueryResults: 10, typeFolders: {} });

  const writeTool = ctx._tools.get('wiki_write');
  const queryTool = ctx._tools.get('wiki_query');

  await writeTool.execute({ title: 'Async Rust', type: 'resource', content: 'Tokio is the Rust async runtime.' });
  await writeTool.execute({ title: 'Tokio Runtime', type: 'resource', content: 'Tokio powers many Rust projects.' });

  const result = await queryTool.execute({ query: 'Tokio async' });
  assert.ok(Array.isArray(result.hits));
  assert.ok(result.hits.length >= 1, 'expected at least one hit');
  rmSync(root, { recursive: true, force: true });
});

test('wiki_lint tool produces a structured report and writes the dated MD', async () => {
  const ctx = makeCtx();
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-lint-'));
  await apply(ctx, { vaultPath: root, maxQueryResults: 10, typeFolders: {} });

  const writeTool = ctx._tools.get('wiki_write');
  const lintTool = ctx._tools.get('wiki_lint');

  await writeTool.execute({ title: 'Lonely Page', type: 'resource', content: 'No one links here.' });
  await writeTool.execute({ title: 'Has Dead Link', type: 'resource', content: 'See [[Nonexistent]].' });

  const report = await lintTool.execute({});
  assert.ok(report.totals, 'report has totals');
  assert.ok(typeof report.totals.error === 'number');
  assert.ok(typeof report.totals.warn === 'number');
  assert.ok(typeof report.totals.info === 'number');
  assert.ok(existsSync(report.reportPath), 'dated lint report MD was written');
  rmSync(root, { recursive: true, force: true });
});

test('wiki_scaffold (dry-run) does not write; (apply: true) does', async () => {
  const ctx = makeCtx();
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-scaffold-'));
  await apply(ctx, { vaultPath: root, maxQueryResults: 10, typeFolders: {} });

  const scaffoldTool = ctx._tools.get('wiki_scaffold');
  const dry = await scaffoldTool.execute({ apply: false });
  // dry-run returns a ScaffoldPlan directly
  assert.ok(Array.isArray(dry.create));
  assert.ok(dry.create.length > 0);
  assert.ok(!existsSync(join(root, 'wiki')));

  const wet = await scaffoldTool.execute({ apply: true, template: 'default' });
  // apply=true returns { applied: true, plan }
  assert.equal(wet.applied, true);
  assert.ok(wet.plan);
  assert.ok(existsSync(join(root, 'wiki')));
  assert.ok(existsSync(join(root, 'wiki', 'index.md')));
  rmSync(root, { recursive: true, force: true });
});

test('wiki_write refuses to write machinery pages', async () => {
  const ctx = makeCtx();
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-mach-'));
  await apply(ctx, { vaultPath: root, maxQueryResults: 10, typeFolders: {} });

  const writeTool = ctx._tools.get('wiki_write');
  await assert.rejects(
    () => writeTool.execute({ title: 'Lint Report Today', type: 'resource', content: 'x' }),
    /machinery page/,
  );
  rmSync(root, { recursive: true, force: true });
});
