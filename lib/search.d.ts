/**
 * search.ts — BM25 full-text search with snippet + link graph.
 *
 * Independent implementation; no code from claude-obsidian. Algorithm is the
 * standard Robertson–Walker BM25 (k1=1.5, b=0.75).
 */
export interface SearchHit {
    title: string;
    path: string;
    score: number;
    snippet: string;
    inbound: string[];
    outbound: string[];
}
interface Doc {
    title: string;
    path: string;
    tokens: string[];
    body: string;
    outbound: Set<string>;
}
export interface SearchIndex {
    docs: Doc[];
    df: Map<string, number>;
    avgdl: number;
    titles: Set<string>;
    inbound: Map<string, Set<string>>;
}
export declare function buildIndex(wikiDir: string): SearchIndex;
export interface SearchArgs {
    query: string;
    limit?: number;
    mode?: 'quick' | 'standard';
}
export declare function search(wikiDir: string, args: SearchArgs): {
    hits: SearchHit[];
    hot: string | null;
    index: string | null;
};
export {};
//# sourceMappingURL=search.d.ts.map