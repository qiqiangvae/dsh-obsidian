/**
 * search.ts — BM25 full-text search with snippet + link graph.
 *
 * Independent implementation; no code from claude-obsidian. Algorithm is the
 * standard Robertson–Walker BM25 (k1=1.5, b=0.75).
 */

import { readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { walkMd, isMachineryPage } from './vault.js';

export interface SearchHit {
  title: string;
  path: string;
  score: number;
  snippet: string;
  inbound: string[];
  outbound: string[];
}

const LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const TOKEN_RE = /[\p{L}\p{N}]+/gu;
const SNIPPET_RADIUS = 80;

const K1 = 1.5;
const B = 0.75;

interface Doc {
  title: string;
  path: string;
  tokens: string[];
  body: string;
  outbound: Set<string>;
}

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(TOKEN_RE) ?? []);
}

function snippet(body: string, queryTokens: string[]): string {
  const lower = body.toLowerCase();
  let best = -1;
  for (const t of queryTokens) {
    const i = lower.indexOf(t);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  if (best < 0) return body.slice(0, SNIPPET_RADIUS * 2).trim();
  const start = Math.max(0, best - SNIPPET_RADIUS);
  const end = Math.min(body.length, best + SNIPPET_RADIUS);
  let snip = body.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snip = '…' + snip;
  if (end < body.length) snip += '…';
  return snip;
}

export interface SearchIndex {
  docs: Doc[];
  df: Map<string, number>;
  avgdl: number;
  titles: Set<string>;
  inbound: Map<string, Set<string>>;
}

export function buildIndex(wikiDir: string): SearchIndex {
  const docs: Doc[] = [];
  const df = new Map<string, number>();
  const titles = new Set<string>();
  let totalLen = 0;

  for (const p of walkMd(wikiDir)) {
    const title = basename(p, extname(p));
    if (isMachineryPage(title)) continue;
    const body = readFileSync(p, 'utf8');
    const tokens = tokenize(body);
    const outbound = new Set<string>();
    for (const m of body.matchAll(LINK_RE)) outbound.add(m[1]!.trim());
    docs.push({ title, path: p, tokens, body, outbound });
    titles.add(title);
    totalLen += tokens.length;
    const seen = new Set<string>();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  const inbound = new Map<string, Set<string>>();
  for (const d of docs) {
    for (const o of d.outbound) {
      if (!inbound.has(o)) inbound.set(o, new Set());
      inbound.get(o)!.add(d.title);
    }
  }

  return { docs, df, avgdl: docs.length ? totalLen / docs.length : 0, titles, inbound };
}

function bm25Score(query: string[], doc: Doc, idx: SearchIndex): number {
  const N = idx.docs.length || 1;
  const dl = doc.tokens.length;
  let score = 0;
  const tf = new Map<string, number>();
  for (const t of doc.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  for (const q of query) {
    const f = tf.get(q) ?? 0;
    if (f === 0) continue;
    const n = idx.df.get(q) ?? 0;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    const norm = f * (K1 + 1) / (f + K1 * (1 - B + B * dl / Math.max(1, idx.avgdl)));
    score += idf * norm;
  }
  return score;
}

export interface SearchArgs {
  query: string;
  limit?: number;
  mode?: 'quick' | 'standard';
}

export function search(wikiDir: string, args: SearchArgs): {
  hits: SearchHit[];
  hot: string | null;
  index: string | null;
} {
  const limit = args.limit ?? 10;
  const hotPath = join(wikiDir, 'hot.md');
  const indexPath = join(wikiDir, 'index.md');

  // quick mode: just return hot + index verbatim (the skill's read order)
  if (args.mode === 'quick') {
    const hot = safeRead(hotPath);
    const index = safeRead(indexPath);
    return { hits: [], hot, index };
  }

  const idx = buildIndex(wikiDir);
  const qTokens = tokenize(args.query);
  if (qTokens.length === 0) return { hits: [], hot: safeRead(hotPath), index: safeRead(indexPath) };

  const scored = idx.docs
    .map(d => ({ d, s: bm25Score(qTokens, d, idx) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);

  const hits: SearchHit[] = scored.map(({ d, s }) => ({
    title: d.title,
    path: d.path,
    score: Number(s.toFixed(3)),
    snippet: snippet(d.body, qTokens),
    inbound: [...(idx.inbound.get(d.title) ?? [])],
    outbound: [...d.outbound],
  }));

  return { hits, hot: safeRead(hotPath), index: safeRead(indexPath) };
}

function safeRead(p: string): string | null {
  try { return readFileSync(p, 'utf8'); } catch { return null; }
}
