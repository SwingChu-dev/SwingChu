import { Router } from "express";
import NodeCache from "node-cache";
import YahooFinanceClass from "yahoo-finance2";

const yahooFinance = new (YahooFinanceClass as any)({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const router  = Router();
const cache   = new NodeCache({ stdTTL: 30 * 60 }); // 30분 캐시

// 고정 섹터 ETF
const SECTOR_ETFS: Record<string, string> = {
  XLE:  "에너지 (XLE)",
  SOXX: "반도체 (SOXX)",
  URA:  "원자력 (URA)",
  CPER: "구리 (CPER)",
};

export interface SeriesPoint { date: string; value: number }

export interface SectorAnalysisResult {
  tickers:      string[];           // 분석 대상 티커 목록
  labels:       Record<string, string>; // ticker → 표시명
  returns:      Record<string, SeriesPoint[]>; // 누적 수익률 시계열
  correlation:  Record<string, Record<string, number>>;  // 상관관계 행렬
  topCorr:      Record<string, { ticker: string; label: string; value: number }[]>; // 각 종목 상위 동조 섹터
  updatedAt:    string;
}

// Pearson 상관계수
function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  let sA = 0, sB = 0;
  for (let i = 0; i < n; i++) { sA += a[i]; sB += b[i]; }
  const mA = sA / n, mB = sB / n;
  let num = 0, dA = 0, dB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - mA, db = b[i] - mB;
    num += da * db; dA += da * da; dB += db * db;
  }
  const den = Math.sqrt(dA * dB);
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
}

function toYahooTicker(ticker: string): string {
  // KOSPI / KOSDAQ 는 섹터 분석에서 제외 (ETF 비교 목적)
  // 미국 티커 그대로 사용
  return ticker;
}

async function fetchHistory(ticker: string, days: number): Promise<{ date: string; close: number }[]> {
  const yt  = toYahooTicker(ticker);
  const p1  = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const result: any = await (yahooFinance as any).chart(yt, { period1: p1, interval: "1wk" });
    const quotes: any[] = result?.quotes ?? [];
    return quotes
      .filter((d: any) => d.close != null && d.close > 0)
      .map((d: any) => ({
        date:  (d.date instanceof Date ? d.date : new Date((d.date ?? 0) * 1000)).toISOString().split("T")[0],
        close: d.close,
      }));
  } catch {
    return [];
  }
}

// GET /sector/analysis?tickers=EONR,NVDA
router.get("/sector/analysis", async (req, res) => {
  const extraRaw  = (req.query.tickers as string) ?? "";
  const extraList = extraRaw.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  // 분석 대상: 고정 ETF + 추가 종목
  const allTickers = [...Object.keys(SECTOR_ETFS), ...extraList.filter(t => !SECTOR_ETFS[t])];
  const cacheKey = allTickers.sort().join(",");
  const cached   = cache.get(cacheKey);
  if (cached) return res.json(cached);

  // 병렬 fetch (6개월 = 약 180일, 주봉으로 약 26개 데이터 포인트)
  const results = await Promise.all(
    allTickers.map(t => fetchHistory(t, 190).then(bars => ({ ticker: t, bars })))
  );

  // 유효 티커만 필터
  const valid = results.filter(r => r.bars.length >= 10);
  if (valid.length < 2) return res.json({ error: "데이터 부족" });

  // 날짜 공통 집합 (교집합) - 주봉이라 거의 동일
  const dateSets = valid.map(r => new Set(r.bars.map(b => b.date)));
  const commonDates = valid[0].bars.map(b => b.date).filter(d =>
    dateSets.every(s => s.has(d))
  );

  if (commonDates.length < 5) return res.json({ error: "공통 날짜 부족" });

  // 누적 수익률 계산
  const returnsMap: Record<string, SeriesPoint[]> = {};
  const pctChanges: Record<string, number[]>     = {};

  for (const { ticker, bars } of valid) {
    const byDate = Object.fromEntries(bars.map(b => [b.date, b.close]));
    const closes = commonDates.map(d => byDate[d] ?? 0).filter(v => v > 0);
    if (closes.length < 5) continue;

    const base = closes[0];
    returnsMap[ticker] = commonDates
      .map((d, i) => ({ date: d, value: Math.round(((closes[i] / base) - 1) * 10000) / 100 }));

    // 일간(주간) 변화율
    pctChanges[ticker] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
  }

  const validTickers = Object.keys(returnsMap);

  // 상관관계 행렬
  const correlation: Record<string, Record<string, number>> = {};
  for (const tA of validTickers) {
    correlation[tA] = {};
    for (const tB of validTickers) {
      correlation[tA][tB] = tA === tB ? 1 : pearson(pctChanges[tA], pctChanges[tB]);
    }
  }

  // 표시 레이블
  const labels: Record<string, string> = {};
  for (const t of validTickers) {
    labels[t] = SECTOR_ETFS[t] ?? t;
  }

  // 각 추가 종목의 상위 동조 섹터
  const topCorr: Record<string, { ticker: string; label: string; value: number }[]> = {};
  for (const extra of extraList) {
    if (!correlation[extra]) continue;
    topCorr[extra] = validTickers
      .filter(t => t !== extra)
      .map(t => ({ ticker: t, label: labels[t], value: correlation[extra][t] }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 4);
  }

  const result: SectorAnalysisResult = {
    tickers:    validTickers,
    labels,
    returns:    returnsMap,
    correlation,
    topCorr,
    updatedAt:  new Date().toISOString(),
  };

  cache.set(cacheKey, result);
  return res.json(result);
});

export default router;
