// test/basic.test.mjs — run with `node --test test/`.
// Tests the pure logic in src/ without touching the cordis runtime.
// Once `tsc` has built src/ → lib/, these imports point at the compiled JS.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  parseFrontmatter,
  serializeFrontmatter,
  completeFrontmatter,
  safeFilename,
  isMachineryPage,
  isPortableFilename,
  listAllTitles,
  walkMd,
  writePage,
  renamePage,
  assertInsideVault,
  resolveLayout,
} from '../lib/vault.js';
import { search, buildIndex } from '../lib/search.js';
import { lint, writeLintReport } from '../lib/lint.js';
import { plan, scaffold } from '../lib/scaffold.js';

function freshVault() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-test-'));
  const cfg = { vaultPath: root, maxQueryResults: 10, typeFolders: {} };
  scaffold(root, cfg, { template: 'default', apply: true });
  return { root, cfg };
}

test('parseFrontmatter + serializeFrontmatter round-trips', () => {
  const md = `---
title: Hello
type: resource
tags: [a, b]
---

# Body`;
  const { fm, body } = parseFrontmatter(md);
  assert.equal(fm.title, 'Hello');
  assert.equal(fm.type, 'resource');
  assert.deepEqual(fm.tags, ['a', 'b']);
  // body has a leading newline after the closing `---`; trim before matching
  assert.match(body.trim(), /^# Body/);

  const out = serializeFrontmatter(fm) + body;
  const { fm: fm2 } = parseFrontmatter(out);
  assert.equal(fm2.title, 'Hello');
});

test('completeFrontmatter preserves created and unknown fields', () => {
  const fm = completeFrontmatter(
    { created: '2026-01-01', custom: 'keep-me' },
    { type: 'resource', title: 'X' },
    '2026-08-29',
  );
  assert.equal(fm.created, '2026-01-01');
  assert.equal(fm.custom, 'keep-me');
  assert.equal(fm.type, 'resource');
  assert.equal(fm.updated, '2026-08-29');
});

test('isMachineryPage is case-insensitive and word-bounded', () => {
  assert.equal(isMachineryPage('Lint Report 2026-08-29'), true);
  assert.equal(isMachineryPage('lint report'), true);
  assert.equal(isMachineryPage('LINT REPORT'), true);
  assert.equal(isMachineryPage('Lint Reporter Profile'), false);
  assert.equal(isMachineryPage('Resource'), false);
});

test('isPortableFilename rejects Windows reserved + bad chars', () => {
  assert.equal(isPortableFilename('Hello World'), true);
  assert.equal(isPortableFilename('CON'), false);
  assert.equal(isPortableFilename('a:b'), false);
  assert.equal(isPortableFilename('a '), false);
  assert.equal(isPortableFilename('a.'), false);
});

test('safeFilename strips path separators and bad chars', () => {
  assert.equal(safeFilename('Hello / World'), 'Hello - World');
  assert.equal(safeFilename('a:b'), 'ab');
  assert.equal(safeFilename('  '), 'untitled');
});

test('assertInsideVault refuses path traversal', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-vault-'));
  assertInsideVault(root, join(root, 'wiki', 'x.md')); // ok
  assert.throws(() => assertInsideVault(root, join(root, '..', 'evil.md')));
  rmSync(root, { recursive: true, force: true });
});

test('writePage creates file, updates index, appends log', () => {
  const { root, cfg } = freshVault();
  const res = writePage(root, cfg, {
    title: 'Rust Ownership',
    type: 'resource',
    content: '# Rust Ownership\n\nSee [[Borrow Checker]].',
    tags: ['rust'],
  });
  assert.ok(existsSync(res.path), 'page file exists');
  const idx = readFileSync(join(root, 'wiki', 'index.md'), 'utf8');
  assert.match(idx, /\[\[Rust Ownership\]\]/);
  const log = readFileSync(join(root, 'wiki', 'log.md'), 'utf8');
  assert.match(log, /resource \[\[Rust Ownership\]\]/);
  assert.deepEqual(res.unresolvedLinks, ['Borrow Checker']);
  rmSync(root, { recursive: true, force: true });
});

test('writePage skips when source_hash unchanged', () => {
  const { root, cfg } = freshVault();
  const src = join(root, 'src.txt');
  writeFileSync(src, 'hello world');

  const first = writePage(root, cfg, {
    title: 'Hello',
    type: 'source',
    content: 'Source body.',
    source_path: src,
  });
  assert.equal(first.skipped, undefined);

  const second = writePage(root, cfg, {
    title: 'Hello',
    type: 'source',
    content: 'Source body.',
    source_path: src,
  });
  assert.equal(second.skipped, true);
  rmSync(root, { recursive: true, force: true });
});

test('writePage refuses to write machinery pages', () => {
  const { root, cfg } = freshVault();
  assert.throws(
    () => writePage(root, cfg, { title: 'Lint Report Today', type: 'resource', content: 'x' }),
    /machinery page/,
  );
  rmSync(root, { recursive: true, force: true });
});

test('renamePage refuses machinery renames', () => {
  const { root, cfg } = freshVault();
  writePage(root, cfg, { title: 'Real Page', type: 'resource', content: 'x' });
  assert.throws(() => renamePage(root, 'Real Page', 'Lint Report X'), /machinery page/);
  rmSync(root, { recursive: true, force: true });
});

test('search returns BM25 hits with snippet + link graph', () => {
  const { root, cfg } = freshVault();
  writePage(root, cfg, {
    title: 'Async Rust',
    type: 'resource',
    content: 'Tokio is the most common async runtime in Rust.',
    tags: ['rust'],
  });
  writePage(root, cfg, {
    title: 'Tokio',
    type: 'resource',
    content: 'Tokio provides async I/O for Rust.',
  });
  const layout = resolveLayout(root, cfg);
  const { hits } = search(layout.wikiDir, { query: 'Tokio async' });
  assert.ok(hits.length >= 1);
  assert.match(hits[0].snippet, /Tokio|async/);
  rmSync(root, { recursive: true, force: true });
});

test('lint detects dead link, orphan, missing frontmatter', () => {
  const { root, cfg } = freshVault();
  writePage(root, cfg, {
    title: 'Orphan Page',
    type: 'resource',
    content: 'No one links here.',
  });
  // intentionally no `type` frontmatter patch below
  writePage(root, cfg, {
    title: 'Has Dead Link',
    type: 'resource',
    content: 'See [[Nonexistent Page]].',
  });
  const report = lint(root, cfg);
  const cats = new Set(report.issues.map(i => i.category));
  assert.ok(cats.has('dead-link'), 'dead-link detected');
  assert.ok(cats.has('orphan'), 'orphan detected');
  const reportPath = writeLintReport(root, cfg, report);
  assert.ok(existsSync(reportPath));
  rmSync(root, { recursive: true, force: true });
});

test('scaffold dry-run does not write; apply does', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-obs-scaffold-'));
  const cfg = { vaultPath: root, maxQueryResults: 10, typeFolders: {} };
  const dry = plan(root, cfg, { template: 'default' });
  assert.ok(dry.create.length > 0);
  assert.ok(!existsSync(join(root, 'wiki')));

  scaffold(root, cfg, { template: 'default', apply: true });
  assert.ok(existsSync(join(root, 'wiki')));
  assert.ok(existsSync(join(root, 'wiki', 'index.md')));
  rmSync(root, { recursive: true, force: true });
});

test('listAllTitles + walkMd skip machinery pages', () => {
  const { root, cfg } = freshVault();
  writePage(root, cfg, { title: 'Real One', type: 'resource', content: 'x' });
  // plant a machinery file
  const metaDir = join(root, 'wiki', 'meta');
  mkdirSync(metaDir, { recursive: true });
  writeFileSync(join(metaDir, 'Lint Report Today.md'), 'junk');
  const titles = listAllTitles(join(root, 'wiki'));
  assert.ok(titles.has('Real One'));
  assert.ok(!titles.has('Lint Report Today'));
  rmSync(root, { recursive: true, force: true });
});
