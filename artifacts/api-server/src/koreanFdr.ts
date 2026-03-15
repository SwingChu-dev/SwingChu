import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Works in both ESM (tsx dev) and CJS (esbuild prod) contexts.
// In prod: import.meta.url is injected by build.ts define → fileURLToPath resolves correctly.
// In dev:  import.meta.url is natively available from ESM.
// Fallback: if both fail (e.g. edge-case undefined), resolve from process.cwd().
const _scriptDir: string = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // Last-resort: resolve relative to workspace root (process.cwd())
    return path.resolve(process.cwd(), "artifacts/api-server/src");
  }
})();

const SCRIPT = path.join(_scriptDir, "korean_fdr.py");
const PYTHON = "python3";

// ─── 간단한 TTL 캐시 ─────────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; expiresAt: number }
class FdrCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  get(key: string): T | null {
    const e = this.store.get(key);
    if (!e || Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    return e.data;
  }
  set(key: string, data: T, ttlMs: number) {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }
}

const quoteCache   = new FdrCache<FdrQuote>();
const historyCache = new FdrCache<FdrOhlcv[]>();

const TTL_QUOTE   = 30  * 1000;   // 30초
const TTL_HISTORY = 60  * 60 * 1000; // 1시간

// ─── 타입 ────────────────────────────────────────────────────────────────────
export interface FdrQuote {
  close:         number;
  open:          number;
  high:          number;
  low:           number;
  volume:        number;
  changePercent: number;  // % (e.g. 1.23 = +1.23%)
  change:        number;  // 절대값 (원)
  prevClose:     number;
  high52w:       number;
  low52w:        number;
  date:          string;
  error?:        string;
}

export interface FdrOhlcv {
  date:   string;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
  change: number;
}

// ─── 내부 유틸 ───────────────────────────────────────────────────────────────
function runPython(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(PYTHON, [SCRIPT, ...args], { timeout: 60_000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || String(err)));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`FDR parse error: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** 단일 종목 최신 시세 (KOSPI/KOSDAQ 6자리 코드) */
export async function fdrQuote(ticker: string): Promise<FdrQuote | null> {
  const cached = quoteCache.get(ticker);
  if (cached) return cached;
  try {
    const data = await runPython(["quote", ticker]);
    if (data?.error) return null;
    quoteCache.set(ticker, data, TTL_QUOTE);
    return data;
  } catch {
    return null;
  }
}

/** 여러 종목 일괄 시세 조회 */
export async function fdrMultiQuote(tickers: string[]): Promise<Record<string, FdrQuote>> {
  const missing: string[] = [];
  const result: Record<string, FdrQuote> = {};

  for (const t of tickers) {
    const cached = quoteCache.get(t);
    if (cached) result[t] = cached;
    else missing.push(t);
  }

  if (missing.length > 0) {
    try {
      const data = await runPython(["multi_quote", missing.join(",")]);
      for (const [t, q] of Object.entries(data as Record<string, any>)) {
        if (q && !q.error) {
          quoteCache.set(t, q as FdrQuote, TTL_QUOTE);
          result[t] = q as FdrQuote;
        }
      }
    } catch { /* fallback: empty */ }
  }

  return result;
}

/** 과거 OHLCV 데이터 (일봉) */
export async function fdrHistory(ticker: string, days: number = 365): Promise<FdrOhlcv[]> {
  const cacheKey = `${ticker}:${days}`;
  const cached = historyCache.get(cacheKey);
  if (cached) return cached;
  try {
    const data = await runPython(["history", ticker, String(days)]);
    if (!Array.isArray(data)) return [];
    historyCache.set(cacheKey, data, TTL_HISTORY);
    return data;
  } catch {
    return [];
  }
}
