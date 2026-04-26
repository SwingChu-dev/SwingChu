import { Router } from "express";
import NodeCache from "node-cache";
import YahooFinanceClass from "yahoo-finance2";

const yahooFinance = new (YahooFinanceClass as any)({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const router = Router();
const cache  = new NodeCache({ stdTTL: 15 * 60 }); // 15분

// ── 타입 ────────────────────────────────────────────────────────────────────
export type CyclePhase =
  | "DISBELIEF" | "HOPE" | "OPTIMISM" | "BELIEF" | "THRILL" | "EUPHORIA"
  | "COMPLACENCY" | "ANXIETY" | "DENIAL" | "PANIC" | "CAPITULATION";

export type FgLevel = "EXTREME_FEAR" | "FEAR" | "NEUTRAL" | "GREED" | "EXTREME_GREED";
export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type Market = "us" | "kr";

export interface MarketIntel {
  market: Market;
  index:    { name: string; symbol: string; price: number; changePercent: number };
  volIndex: { name: string; symbol: string; price: number; changePercent: number };
  cycle: {
    phase: CyclePhase;
    phaseKr: string;
    monthAgoPhase: CyclePhase;
    monthAgoPhaseKr: string;
    nextRiskPhase: CyclePhase;
    nextRiskPhaseKr: string;
    rationale: string;
  };
  fearGreed: {
    score: number;
    level: FgLevel;
    labelKr: string;
    history: { weekAgo: number; monthAgo: number };
    components: Array<{
      key: string;
      labelKr: string;
      labelEn: string;
      level: FgLevel;
      detail: string;
    }>;
  };
  risks: Array<{
    severity: Severity;
    category: string;
    title: string;
    metric: string;
    description: string;
  }>;
  capitalRotation: {
    phase:    "RECOVERY" | "EXPANSION" | "OVERHEAT" | "SLOWDOWN";
    phaseKr:  string;
    phaseEn:  string;
    leader:   "bonds" | "stocks" | "commodities" | "none";
    rationale: string;
    assets: {
      bonds:       { ticker: string; name: string; return1m: number; return3m: number };
      stocks:      { ticker: string; name: string; return1m: number; return3m: number };
      commodities: { ticker: string; name: string; return1m: number; return3m: number };
    };
  };
  asOf: string;
}

// ── 유틸 ────────────────────────────────────────────────────────────────────
async function fetchQuote(symbol: string) {
  try {
    const q: any = await (yahooFinance as any).quote(symbol);
    return {
      price:        q?.regularMarketPrice         ?? 0,
      change:       q?.regularMarketChange        ?? 0,
      changePct:    q?.regularMarketChangePercent ?? 0,
      prevClose:    q?.regularMarketPreviousClose ?? 0,
      high52w:      q?.fiftyTwoWeekHigh           ?? 0,
      low52w:       q?.fiftyTwoWeekLow            ?? 0,
      fiftyDayAvg:  q?.fiftyDayAverage            ?? 0,
      twoHundredDayAvg: q?.twoHundredDayAverage   ?? 0,
    };
  } catch {
    return { price: 0, change: 0, changePct: 0, prevClose: 0, high52w: 0, low52w: 0, fiftyDayAvg: 0, twoHundredDayAvg: 0 };
  }
}

async function fetchHistory(symbol: string, days: number): Promise<Array<{ date: Date; close: number }>> {
  try {
    const period2 = new Date();
    const period1 = new Date(Date.now() - days * 86400_000);
    const rows: any[] = await (yahooFinance as any).chart(symbol, { period1, period2, interval: "1d" })
      .then((r: any) => r?.quotes ?? []);
    return rows
      .filter(r => r?.close != null && r?.date)
      .map(r => ({ date: new Date(r.date), close: r.close as number }));
  } catch {
    return [];
  }
}

function rsi14(closes: number[]): number {
  if (closes.length < 15) return 50;
  let gain = 0, loss = 0;
  for (let i = 1; i <= 14; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgG = gain / 14, avgL = loss / 14;
  for (let i = 15; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * 13 + (d > 0 ? d : 0)) / 14;
    avgL = (avgL * 13 + (d < 0 ? -d : 0)) / 14;
  }
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

function sma(closes: number[], n: number): number {
  if (closes.length < n) return 0;
  const slice = closes.slice(-n);
  return slice.reduce((s, x) => s + x, 0) / n;
}

// ── F&G 컴포넌트 분류 ──────────────────────────────────────────────────────
function classifyFG(score: number): { level: FgLevel; labelKr: string } {
  if (score <= 24) return { level: "EXTREME_FEAR",  labelKr: "극공포" };
  if (score <= 44) return { level: "FEAR",          labelKr: "공포" };
  if (score <= 55) return { level: "NEUTRAL",       labelKr: "중립" };
  if (score <= 75) return { level: "GREED",         labelKr: "탐욕" };
  return                 { level: "EXTREME_GREED",  labelKr: "극탐욕" };
}

// ── 시장 사이클 단계 추정 ──────────────────────────────────────────────────
const CYCLE_KR: Record<CyclePhase, string> = {
  DISBELIEF: "불신", HOPE: "희망", OPTIMISM: "낙관", BELIEF: "확신",
  THRILL: "짜릿함", EUPHORIA: "도취", COMPLACENCY: "안주", ANXIETY: "불안",
  DENIAL: "부정", PANIC: "공포", CAPITULATION: "항복",
};

function estimateCycle(args: {
  spxAbove200: boolean;
  spxAbove50: boolean;
  spxVs125Pct: number;     // % 차이 (현재가 vs 125일선)
  rsi: number;
  vix: number;
  spx52wHighDistPct: number; // % 거리 (음수: 신고가 근처, 양수: 멀어짐)
  oneMonthReturnPct: number;
}): CyclePhase {
  const { spxAbove200, spxAbove50, spxVs125Pct, rsi, vix, spx52wHighDistPct, oneMonthReturnPct } = args;

  // 강세 상승 구간
  if (spxAbove200 && spxAbove50) {
    if (spx52wHighDistPct >= -1.5 && rsi >= 70 && vix < 18) return "EUPHORIA";
    if (spx52wHighDistPct >= -3   && rsi >= 65 && vix < 20) return "THRILL";
    if (spxVs125Pct       >= 5    && rsi >= 55)              return "BELIEF";
    if (spxVs125Pct       >= 0    && rsi >= 50)              return "OPTIMISM";
    return "HOPE";
  }

  // 약세 / 하락 구간
  if (!spxAbove50 && vix >= 30) {
    if (oneMonthReturnPct <= -10 && rsi < 30) return "CAPITULATION";
    if (oneMonthReturnPct <= -7)              return "PANIC";
    return "DENIAL";
  }
  if (!spxAbove50 && spxAbove200) {
    if (vix >= 22 || rsi < 40) return "ANXIETY";
    return "COMPLACENCY";
  }
  if (!spxAbove200) {
    if (vix >= 25) return "DENIAL";
    return "DISBELIEF";
  }
  return "OPTIMISM";
}

// ── 자본순환 사이클 (Pring 인터마켓 4단계) ─────────────────────────────────
// 입력: TLT(채권), 주식 지수, DBC(원자재) 의 1M/3M 수익률
// 4단계 매핑:
//  - RECOVERY  (회복):  채권↑ 주식 약세에서 반등 시작 — 금리 하락, 침체 통과 직전
//  - EXPANSION (확장):  주식↑ 원자재 약~중 — 본격 강세, 인플레이션 아직 잠잠
//  - OVERHEAT  (과열):  원자재↑ 채권↓ — 인플레이션 압력, 금리 상승
//  - SLOWDOWN  (둔화):  주식·원자재 약세 — 침체 진입, 채권 회복 시작 가능
function pctReturnFromHist(closes: number[], lookbackDays: number): number {
  if (closes.length < lookbackDays + 1) return 0;
  const past = closes[closes.length - 1 - lookbackDays];
  const now  = closes[closes.length - 1];
  return past > 0 ? ((now - past) / past) * 100 : 0;
}

function buildCapitalRotation(args: {
  bondsCloses: number[];
  stocksCloses: number[];
  commCloses: number[];
  bondsName: string;  bondsTicker: string;
  stocksName: string; stocksTicker: string;
  commName: string;   commTicker: string;
}): MarketIntel["capitalRotation"] {
  const bondsRet1m  = pctReturnFromHist(args.bondsCloses, 22);
  const stocksRet1m = pctReturnFromHist(args.stocksCloses, 22);
  const commRet1m   = pctReturnFromHist(args.commCloses, 22);
  const bondsRet3m  = pctReturnFromHist(args.bondsCloses, 66);
  const stocksRet3m = pctReturnFromHist(args.stocksCloses, 66);
  const commRet3m   = pctReturnFromHist(args.commCloses, 66);

  const { phase, leader } = classifyCapitalRotation({ bondsRet3m, stocksRet3m, commRet3m });
  const phaseInfo = CAP_ROTATION_KR[phase];

  const fmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
  const rationale = [
    `${args.bondsName} 3M ${fmt(bondsRet3m)}`,
    `${args.stocksName} 3M ${fmt(stocksRet3m)}`,
    `${args.commName} 3M ${fmt(commRet3m)}`,
  ].join(" · ");

  return {
    phase,
    phaseKr: phaseInfo.kr,
    phaseEn: phaseInfo.en,
    leader,
    rationale,
    assets: {
      bonds:       { ticker: args.bondsTicker,  name: args.bondsName,  return1m: Math.round(bondsRet1m  * 100) / 100, return3m: Math.round(bondsRet3m  * 100) / 100 },
      stocks:      { ticker: args.stocksTicker, name: args.stocksName, return1m: Math.round(stocksRet1m * 100) / 100, return3m: Math.round(stocksRet3m * 100) / 100 },
      commodities: { ticker: args.commTicker,   name: args.commName,   return1m: Math.round(commRet1m   * 100) / 100, return3m: Math.round(commRet3m   * 100) / 100 },
    },
  };
}

function classifyCapitalRotation(args: {
  bondsRet3m:  number;
  stocksRet3m: number;
  commRet3m:   number;
}): { phase: "RECOVERY" | "EXPANSION" | "OVERHEAT" | "SLOWDOWN"; leader: "bonds" | "stocks" | "commodities" | "none" } {
  const { bondsRet3m, stocksRet3m, commRet3m } = args;
  const positives = [
    { key: "bonds"       as const, val: bondsRet3m  },
    { key: "stocks"      as const, val: stocksRet3m },
    { key: "commodities" as const, val: commRet3m   },
  ].filter(a => a.val > 0).sort((a, b) => b.val - a.val);

  // 모두 약세 → 둔화
  if (positives.length === 0) {
    return { phase: "SLOWDOWN", leader: "none" };
  }

  const leader = positives[0].key;

  // 채권 단독 강세 또는 채권+주식 → 회복 (금리 사이클 turn)
  if (leader === "bonds" && stocksRet3m < 0 && commRet3m < 0) {
    return { phase: "RECOVERY", leader: "bonds" };
  }
  // 원자재가 채권보다 강세 → 과열
  if (commRet3m > bondsRet3m && commRet3m > 0) {
    return { phase: "OVERHEAT", leader: "commodities" };
  }
  // 주식 강세, 원자재 약 → 확장
  if (leader === "stocks") {
    return { phase: "EXPANSION", leader: "stocks" };
  }
  // 채권+주식 동반 강세 (둘 다 > 0) → 회복 후반/확장 초입
  if (bondsRet3m > 0 && stocksRet3m > 0 && commRet3m <= 0) {
    return { phase: "RECOVERY", leader };
  }
  // fallback
  return { phase: "EXPANSION", leader };
}

const CAP_ROTATION_KR: Record<"RECOVERY" | "EXPANSION" | "OVERHEAT" | "SLOWDOWN", { kr: string; en: string }> = {
  RECOVERY:  { kr: "회복",   en: "Recovery"   },
  EXPANSION: { kr: "확장",   en: "Expansion"  },
  OVERHEAT:  { kr: "과열",   en: "Overheat"   },
  SLOWDOWN:  { kr: "둔화",   en: "Slowdown"   },
};

function nextRiskPhase(p: CyclePhase): CyclePhase {
  const order: CyclePhase[] = [
    "DISBELIEF", "HOPE", "OPTIMISM", "BELIEF", "THRILL", "EUPHORIA",
    "COMPLACENCY", "ANXIETY", "DENIAL", "PANIC", "CAPITULATION",
  ];
  const idx = order.indexOf(p);
  return order[Math.min(idx + 1, order.length - 1)];
}

// ── 미국 시장 빌더 ─────────────────────────────────────────────────────────
async function buildUsIntel(): Promise<MarketIntel | { error: string; message: string; detail: any; asOf: string; status: number }> {
  // 병렬 fetch
  const [spxQ, vixQ, oilQ, goldQ, dxyQ, tnxQ, irxQ, hygQ, lqdQ, ndxQ, spxHist, ndxHist, vixHist, goldHist, tltHist, dbcHist] = await Promise.all([
    fetchQuote("^GSPC"),
    fetchQuote("^VIX"),
    fetchQuote("CL=F"),
    fetchQuote("GC=F"),
    fetchQuote("DX-Y.NYB"),
    fetchQuote("^TNX"),       // 10Y yield (×10)
    fetchQuote("^IRX"),       // 13W T-Bill (×100, KIS-style scaling differs — Yahoo returns rate ×1)
    fetchQuote("HYG"),
    fetchQuote("LQD"),
    fetchQuote("^IXIC"),
    fetchHistory("^GSPC", 220),
    fetchHistory("^IXIC", 30),
    fetchHistory("^VIX", 35),
    fetchHistory("GC=F", 30),
    fetchHistory("TLT", 100),  // 20Y+ Treasury — 자본순환 채권 입력
    fetchHistory("DBC", 100),  // 광범위 원자재 — 자본순환 원자재 입력
  ]);

  // ── 데이터 가용성 게이트 — 핵심 입력이 없으면 명시적 503 반환 ──────────
  if (!spxQ.price || !vixQ.price || spxHist.length < 50) {
    return {
      status: 503,
      error: "MARKET_DATA_UNAVAILABLE",
      message: "Yahoo Finance에서 핵심 시장 데이터(S&P 500, VIX, 가격 히스토리)를 가져오지 못했습니다.",
      detail: { spx: spxQ.price, vix: vixQ.price, spxHistLen: spxHist.length },
      asOf: new Date().toISOString(),
    };
  }

  const spxCloses = spxHist.map(h => h.close);
  const ndxCloses = ndxHist.map(h => h.close);
  const spx125    = sma(spxCloses, 125);
  // quote 응답의 평균선을 우선 신뢰, 없으면 히스토리에서 계산
  const spx50     = spxQ.fiftyDayAvg      || sma(spxCloses, 50);
  const spx200    = spxQ.twoHundredDayAvg || sma(spxCloses, 200);
  const spxRsi    = rsi14(spxCloses.slice(-30));
  const ndxRsi    = rsi14(ndxCloses.slice(-30));

  const spxPrice  = spxQ.price || (spxCloses.length ? spxCloses[spxCloses.length - 1] : 0);
  const spxVs125Pct       = spx125 > 0 ? ((spxPrice - spx125) / spx125) * 100 : 0;
  const spx52wHighDistPct = spxQ.high52w > 0 ? ((spxPrice - spxQ.high52w) / spxQ.high52w) * 100 : 0;
  const oneMoBack         = spxCloses.length >= 22 ? spxCloses[spxCloses.length - 22] : spxPrice;
  const oneMoReturn       = oneMoBack > 0 ? ((spxPrice - oneMoBack) / oneMoBack) * 100 : 0;

  // Yahoo는 ^TNX/^IRX를 percent 단위로 직접 반환 (예: 4.31 = 4.31%)
  const tnxYield   = tnxQ.price;
  const irxYield   = irxQ.price;
  const yieldCurve = tnxYield - irxYield;  // 10Y - 3M 스프레드. 음수 = 역전

  // ── F&G 컴포넌트 ────────────────────────────────────────────────────────
  // 1) 시장 모멘텀: SPX vs 125일선
  const momentumScore =
    spxVs125Pct >= 8  ? 88 :
    spxVs125Pct >= 4  ? 72 :
    spxVs125Pct >= 1  ? 58 :
    spxVs125Pct >= -2 ? 45 :
    spxVs125Pct >= -5 ? 28 : 12;

  // 2) 풋콜 비율 프록시: VIX 레벨 (낮을수록 헤지 수요 적음 = 탐욕)
  const putCallScore =
    vixQ.price < 13 ? 88 :
    vixQ.price < 16 ? 72 :
    vixQ.price < 20 ? 55 :
    vixQ.price < 25 ? 38 :
    vixQ.price < 30 ? 22 : 10;

  // 3) 안전자산 수요: 5일 SPX 수익률 vs 5일 금 수익률 차이
  // 주식이 금보다 더 오르면 위험선호 (greed)
  const sevenDayBack = spxCloses.length >= 8 ? spxCloses[spxCloses.length - 8] : spxPrice;
  const spx5dRet     = sevenDayBack > 0 ? ((spxPrice - sevenDayBack) / sevenDayBack) * 100 : 0;
  const goldCloses   = goldHist.map(h => h.close);
  const goldPrice    = goldQ.price || (goldCloses.length ? goldCloses[goldCloses.length - 1] : 0);
  const goldBack     = goldCloses.length >= 8 ? goldCloses[goldCloses.length - 8] : goldPrice;
  const gold5dRet    = goldBack > 0 ? ((goldPrice - goldBack) / goldBack) * 100 : 0;
  const safeHavenSpread = spx5dRet - gold5dRet;  // 양수: 위험선호
  const safeHavenScore =
    safeHavenSpread >= 4  ? 84 :
    safeHavenSpread >= 1.5 ? 68 :
    safeHavenSpread >= -1 ? 50 :
    safeHavenSpread >= -3 ? 30 : 15;

  // 4) 상승종목 폭 (breadth proxy): SPX가 50/200일선 모두 위 + 1개월 수익률
  const breadthBase = (spxPrice > spx50 ? 25 : 0) + (spxPrice > spx200 ? 25 : 0);
  const breadthScore = Math.min(100, breadthBase + Math.max(0, oneMoReturn) * 4);

  // 5) 시장 변동성 (VIX): 낮을수록 탐욕
  const vixScore =
    vixQ.price < 12 ? 90 :
    vixQ.price < 16 ? 72 :
    vixQ.price < 20 ? 55 :
    vixQ.price < 25 ? 38 :
    vixQ.price < 30 ? 22 : 10;

  // 6) 정크본드 수요 (HYG vs LQD ratio change)
  const hygRet = hygQ.changePct, lqdRet = lqdQ.changePct;
  const junkSpread = hygRet - lqdRet;
  const junkScore =
    junkSpread >= 0.4 ? 78 :
    junkSpread >= 0.1 ? 62 :
    junkSpread >= -0.1 ? 50 :
    junkSpread >= -0.4 ? 35 : 18;

  // 7) 주가 강도 (52주 신고가 거리)
  const strengthScore =
    spx52wHighDistPct >= -0.5 ? 85 :
    spx52wHighDistPct >= -2   ? 68 :
    spx52wHighDistPct >= -5   ? 50 :
    spx52wHighDistPct >= -10  ? 32 :
    spx52wHighDistPct >= -20  ? 18 : 8;

  // 8) 수익률 곡선 (10Y-3M): 가장 검증된 경기 사이클 선행 지표.
  // 가파른 양 = 초중기 확장 = 탐욕, 평탄/역전 = 후기/침체 경고 = 공포
  const yieldCurveScore =
    yieldCurve >= 2.0  ? 80 :
    yieldCurve >= 1.0  ? 65 :
    yieldCurve >= 0.5  ? 50 :
    yieldCurve >= 0.0  ? 35 :
    yieldCurve >= -0.3 ? 22 : 10;

  const components = [
    { key: "momentum",   labelKr: "시장 모멘텀",     labelEn: "Market Momentum — S&P 500 vs 125일선",       score: momentumScore,   detail: `${spxVs125Pct >= 0 ? "+" : ""}${spxVs125Pct.toFixed(1)}%` },
    { key: "putcall",    labelKr: "풋/콜 비율",       labelEn: "Put/Call Options",                              score: putCallScore,    detail: `VIX ${vixQ.price.toFixed(1)} 기반 추정` },
    { key: "safe",       labelKr: "안전자산 수요",    labelEn: "Safe Haven Demand — 주식 vs 금 5일 수익률",     score: safeHavenScore,  detail: `S&P ${spx5dRet >= 0 ? "+" : ""}${spx5dRet.toFixed(1)}% vs 금 ${gold5dRet >= 0 ? "+" : ""}${gold5dRet.toFixed(1)}%` },
    { key: "breadth",    labelKr: "상승종목 폭",      labelEn: "Stock Price Breadth",                          score: breadthScore,    detail: `1M ${oneMoReturn >= 0 ? "+" : ""}${oneMoReturn.toFixed(1)}%` },
    { key: "vix",        labelKr: "시장 변동성 (VIX)", labelEn: "Market Volatility",                            score: vixScore,        detail: `VIX ${vixQ.price.toFixed(2)}` },
    { key: "junk",       labelKr: "정크본드 수요",    labelEn: "Junk Bond Demand",                             score: junkScore,       detail: `HYG-LQD ${junkSpread >= 0 ? "+" : ""}${junkSpread.toFixed(2)}%` },
    { key: "strength",   labelKr: "주가 강도",        labelEn: "Stock Price Strength (신고가/신저가)",         score: strengthScore,   detail: `52w 고점 대비 ${spx52wHighDistPct.toFixed(1)}%` },
    { key: "yieldcurve", labelKr: "수익률 곡선",      labelEn: "Yield Curve 10Y-3M (경기 사이클 선행 지표)",   score: yieldCurveScore, detail: `10Y ${tnxYield.toFixed(2)}% − 3M ${irxYield.toFixed(2)}% = ${yieldCurve >= 0 ? "+" : ""}${yieldCurve.toFixed(2)}%${yieldCurve < 0 ? " (역전)" : ""}` },
  ];

  const fgScore = Math.round(
    (momentumScore   * 0.18) + (putCallScore    * 0.13) + (safeHavenScore  * 0.09) +
    (breadthScore    * 0.14) + (vixScore        * 0.18) + (junkScore       * 0.08) +
    (strengthScore   * 0.08) + (yieldCurveScore * 0.12)
  );
  const fg = classifyFG(fgScore);

  // F&G 1주/1달 전 추정 (VIX 히스토리 기반 간이 추정)
  const vixCloses = vixHist.map(h => h.close);
  const estFGFromVix = (v: number) =>
    v < 13 ? 78 : v < 16 ? 64 : v < 20 ? 50 : v < 25 ? 35 : v < 30 ? 22 : 12;
  const weekAgoVix    = vixCloses.length >= 6  ? vixCloses[vixCloses.length - 6]  : vixQ.price;
  const monthAgoVix   = vixCloses.length >= 22 ? vixCloses[vixCloses.length - 22] : vixQ.price;
  const fgWeekAgo     = estFGFromVix(weekAgoVix);
  const fgMonthAgo    = estFGFromVix(monthAgoVix);

  // ── 시장 사이클 단계 ───────────────────────────────────────────────────
  const phase = estimateCycle({
    spxAbove200:        spxPrice > spx200 && spx200 > 0,
    spxAbove50:         spxPrice > spx50  && spx50  > 0,
    spxVs125Pct,
    rsi:                spxRsi,
    vix:                vixQ.price,
    spx52wHighDistPct,
    oneMonthReturnPct:  oneMoReturn,
  });

  // 한 달 전 단계 추정 (단순화: 한 달 전 가격 + 그때 VIX 기준)
  const monthAgoPhase = estimateCycle({
    spxAbove200:        oneMoBack > spx200 && spx200 > 0,
    spxAbove50:         oneMoBack > spx50  && spx50  > 0,
    spxVs125Pct:        spx125 > 0 ? ((oneMoBack - spx125) / spx125) * 100 : 0,
    rsi:                50,
    vix:                monthAgoVix,
    spx52wHighDistPct:  spxQ.high52w > 0 ? ((oneMoBack - spxQ.high52w) / spxQ.high52w) * 100 : 0,
    oneMonthReturnPct:  0,
  });

  const cycleRationale = [
    `S&P 500 ${spxPrice.toFixed(0)}`,
    spxVs125Pct >= 0 ? `125일선 +${spxVs125Pct.toFixed(1)}%` : `125일선 ${spxVs125Pct.toFixed(1)}%`,
    `RSI ${spxRsi.toFixed(0)}`,
    `VIX ${vixQ.price.toFixed(1)}`,
  ].join(" · ");

  // ── 리스크 카드 자동 생성 ──────────────────────────────────────────────
  const risks: MarketIntel["risks"] = [];

  // 1) 과매수 (RSI)
  if (spxRsi >= 70 || ndxRsi >= 70) {
    risks.push({
      severity:   "HIGH",
      category:   "기술적 · Technical",
      title:      "과매수 구간 진입",
      metric:     `S&P RSI ${spxRsi.toFixed(0)} / NASDAQ RSI ${ndxRsi.toFixed(0)} / 임계 70`,
      description:"RSI 70 이상은 단기 조정 가능성 높은 구간. 고변동성·저품질 종목으로 자금 유입은 늦은 사이클 특유의 '빨리 복구' 심리.",
    });
  }

  // 2) 신고가 근접 + 과열
  if (spx52wHighDistPct >= -2 && vixQ.price < 18) {
    risks.push({
      severity:   "HIGH",
      category:   "밸류에이션 · Valuation",
      title:      "S&P 500 신고가 + 저변동성 — 과열 신호",
      metric:     `52주 고점 대비 ${spx52wHighDistPct.toFixed(1)}% / VIX ${vixQ.price.toFixed(1)}`,
      description:"신고가 + 낮은 VIX 조합은 시장 안주(complacency)의 전형. 작은 충격에도 큰 변동성 확대 가능.",
    });
  }

  // 3) 수익률 곡선 (10Y-3M) — 가장 검증된 경기 사이클 선행 지표
  if (yieldCurve < -0.3) {
    risks.push({
      severity:   "HIGH",
      category:   "매크로 · Yield Curve",
      title:      "수익률 곡선 깊은 역전 — 침체 경고",
      metric:     `10Y ${tnxYield.toFixed(2)}% − 3M ${irxYield.toFixed(2)}% = ${yieldCurve.toFixed(2)}%`,
      description:"10Y-3M 스프레드 -0.3% 이하 깊은 역전은 통상 12~24개월 내 경기침체 선행. 1980년대 이후 이 신호는 7회 중 6회 침체로 이어졌음.",
    });
  } else if (yieldCurve < 0) {
    risks.push({
      severity:   "MEDIUM",
      category:   "매크로 · Yield Curve",
      title:      "수익률 곡선 역전",
      metric:     `10Y ${tnxYield.toFixed(2)}% − 3M ${irxYield.toFixed(2)}% = ${yieldCurve.toFixed(2)}%`,
      description:"10Y가 3M 아래로 떨어진 상태. 연준의 단기 긴축이 장기 성장 기대를 짓누르는 후기 사이클 신호.",
    });
  } else if (yieldCurve < 0.3 && tnxYield >= 4.0) {
    risks.push({
      severity:   "LOW",
      category:   "매크로 · Yield Curve",
      title:      "곡선 평탄화 + 고금리",
      metric:     `스프레드 +${yieldCurve.toFixed(2)}% / 10Y ${tnxYield.toFixed(2)}%`,
      description:"역전은 아니지만 곡선이 평탄하고 절대 금리도 높음. 그로스 주식 밸류에이션 압박이 누적되는 후기 확장 구간.",
    });
  }

  // 4) 유가
  if (oilQ.price >= 90 || oilQ.changePct >= 3) {
    risks.push({
      severity:   oilQ.price >= 95 ? "HIGH" : "MEDIUM",
      category:   "원자재 · Commodity Shock",
      title:      `유가 $${oilQ.price.toFixed(0)} 부담 구간`,
      metric:     `WTI $${oilQ.price.toFixed(2)} (${oilQ.changePct >= 0 ? "+" : ""}${oilQ.changePct.toFixed(1)}%)`,
      description:"역사적으로 유가 쇼크는 경기침체·베어마켓 트리거. 실적 성장 기대가 훼손되면 재평가 트리거.",
    });
  }

  // 5) VIX 급등
  if (vixQ.changePct >= 8) {
    risks.push({
      severity:   "HIGH",
      category:   "변동성 · Volatility",
      title:      "VIX 급등 — 헤지 수요 폭발",
      metric:     `VIX ${vixQ.price.toFixed(1)} (+${vixQ.changePct.toFixed(1)}%)`,
      description:"하루 +8% 이상 VIX 급등은 무언가 시장이 가격에 반영 못한 충격이 발생했음을 시사.",
    });
  }

  // 6) F&G 급등 (지난달 대비)
  if (fgScore - fgMonthAgo >= 30) {
    risks.push({
      severity:   "MEDIUM",
      category:   "센티먼트 · Sentiment",
      title:      `F&G 지수 ${fgScore - fgMonthAgo}pt 급등`,
      metric:     `1달간 ${fgMonthAgo} → ${fgScore} / 주간 +${Math.max(0, fgScore - fgWeekAgo)}pt`,
      description:"극공포에서 탐욕으로의 급반전. 80 이상(극탐욕)에서 단기 고점 경고 패턴.",
    });
  }

  // 7) 달러 강세
  if (dxyQ.changePct >= 1) {
    risks.push({
      severity:   "LOW",
      category:   "환율 · FX",
      title:      "달러 인덱스 급등",
      metric:     `DXY ${dxyQ.price.toFixed(2)} (+${dxyQ.changePct.toFixed(1)}%)`,
      description:"달러 강세는 신흥국·원자재·해외매출 비중 큰 기업에 부담.",
    });
  }

  // 8) 안주 단계 진입
  if (phase === "EUPHORIA" || phase === "THRILL") {
    risks.push({
      severity:   "MEDIUM",
      category:   "심리 · Behavioral",
      title:      `사이클 ${CYCLE_KR[phase]} 단계 — 다음은 ${CYCLE_KR[nextRiskPhase(phase)]}`,
      metric:     `${cycleRationale}`,
      description:"심리 사이클상 고점 부근. 신규 매수보다 기존 포지션 일부 차익실현이 정석. 현금 비중 단계적 확대 권고.",
    });
  }

  if (risks.length === 0) {
    risks.push({
      severity:   "LOW",
      category:   "전체 · Overall",
      title:      "주요 트리거 부재",
      metric:     `VIX ${vixQ.price.toFixed(1)} / S&P 안정`,
      description:"가격 지표 기준 단기 명백한 위험 신호 없음. 정기 모니터링 유지.",
    });
  }

  // 위험도 정렬: HIGH → MEDIUM → LOW
  const sevOrd: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  risks.sort((a, b) => sevOrd[a.severity] - sevOrd[b.severity]);

  const data: MarketIntel = {
    market: "us",
    index:    { name: "S&P 500", symbol: "^GSPC", price: Math.round(spxPrice), changePercent: Math.round(spxQ.changePct * 100) / 100 },
    volIndex: { name: "VIX", symbol: "^VIX", price: Math.round(vixQ.price * 100) / 100, changePercent: Math.round(vixQ.changePct * 100) / 100 },
    cycle: {
      phase,
      phaseKr:         CYCLE_KR[phase],
      monthAgoPhase,
      monthAgoPhaseKr: CYCLE_KR[monthAgoPhase],
      nextRiskPhase:   nextRiskPhase(phase),
      nextRiskPhaseKr: CYCLE_KR[nextRiskPhase(phase)],
      rationale:       cycleRationale,
    },
    fearGreed: {
      score:    fgScore,
      level:    fg.level,
      labelKr:  fg.labelKr,
      history:  { weekAgo: fgWeekAgo, monthAgo: fgMonthAgo },
      components: components.map(c => ({
        key:     c.key,
        labelKr: c.labelKr,
        labelEn: c.labelEn,
        level:   classifyFG(c.score).level,
        detail:  c.detail,
      })),
    },
    risks,
    capitalRotation: buildCapitalRotation({
      bondsCloses:  tltHist.map(h => h.close),
      stocksCloses: spxCloses,
      commCloses:   dbcHist.map(h => h.close),
      bondsName:    "장기국채(TLT)", bondsTicker:  "TLT",
      stocksName:   "S&P 500",       stocksTicker: "^GSPC",
      commName:     "원자재(DBC)",   commTicker:   "DBC",
    }),
    asOf: new Date().toISOString(),
  };

  return data;
}

// ── 한국 시장 빌더 ─────────────────────────────────────────────────────────
// 일일 수익률에서 20일 연환산 변동성(%) 계산 — VKOSPI 프록시
function histVol20(closes: number[]): number {
  if (closes.length < 21) return 0;
  const slice = closes.slice(-21);
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const r = Math.log(slice[i] / slice[i - 1]);
    if (Number.isFinite(r)) rets.push(r);
  }
  if (rets.length < 5) return 0;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const variance = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

async function buildKrIntel(): Promise<MarketIntel | { error: string; message: string; detail: any; asOf: string; status: number }> {
  const [kospiQ, kosdaqQ, kospi200Q, krwQ, spxQ, oilQ, kospiHist, kosdaqHist, spxHist, krwHist, tltHist, dbcHist] = await Promise.all([
    fetchQuote("^KS11"),     // KOSPI
    fetchQuote("^KQ11"),     // KOSDAQ
    fetchQuote("^KS200"),    // KOSPI 200
    fetchQuote("KRW=X"),     // USDKRW
    fetchQuote("^GSPC"),     // S&P 500 (외인 흐름 프록시용)
    fetchQuote("CL=F"),      // 원유 (제조업 비중 큰 한국 영향)
    fetchHistory("^KS11", 220),
    fetchHistory("^KQ11", 60),
    fetchHistory("^GSPC", 100),
    fetchHistory("KRW=X", 30),
    fetchHistory("TLT", 100),  // 자본순환 글로벌 채권
    fetchHistory("DBC", 100),  // 자본순환 글로벌 원자재
  ]);

  if (!kospiQ.price || kospiHist.length < 50) {
    return {
      status: 503,
      error: "MARKET_DATA_UNAVAILABLE",
      message: "Yahoo Finance에서 핵심 한국 시장 데이터(KOSPI, 가격 히스토리)를 가져오지 못했습니다.",
      detail: { kospi: kospiQ.price, kospiHistLen: kospiHist.length },
      asOf: new Date().toISOString(),
    };
  }

  const kospiCloses  = kospiHist.map(h => h.close);
  const kosdaqCloses = kosdaqHist.map(h => h.close);
  const spxCloses    = spxHist.map(h => h.close);
  const krwCloses    = krwHist.map(h => h.close);

  const kospi125 = sma(kospiCloses, 125);
  const kospi50  = kospiQ.fiftyDayAvg      || sma(kospiCloses, 50);
  const kospi200 = kospiQ.twoHundredDayAvg || sma(kospiCloses, 200);
  const kospiRsi  = rsi14(kospiCloses.slice(-30));
  const kosdaqRsi = rsi14(kosdaqCloses.slice(-30));
  const kospiVol  = histVol20(kospiCloses); // KOSPI 20일 hist vol (연환산 %)

  const kospiPrice = kospiQ.price || kospiCloses[kospiCloses.length - 1] || 0;
  const kospiVs125Pct       = kospi125 > 0 ? ((kospiPrice - kospi125) / kospi125) * 100 : 0;
  const kospi52wHighDistPct = kospiQ.high52w > 0 ? ((kospiPrice - kospiQ.high52w) / kospiQ.high52w) * 100 : 0;
  const oneMoBack           = kospiCloses.length >= 22 ? kospiCloses[kospiCloses.length - 22] : kospiPrice;
  const oneMoReturn         = oneMoBack > 0 ? ((kospiPrice - oneMoBack) / oneMoBack) * 100 : 0;

  const sevenDayBack = kospiCloses.length >= 8 ? kospiCloses[kospiCloses.length - 8] : kospiPrice;
  const kospi5dRet   = sevenDayBack > 0 ? ((kospiPrice - sevenDayBack) / sevenDayBack) * 100 : 0;

  const spxPrice  = spxQ.price || spxCloses[spxCloses.length - 1] || 0;
  const spxBack   = spxCloses.length >= 6 ? spxCloses[spxCloses.length - 6] : spxPrice;
  const spx5dRet  = spxBack > 0 ? ((spxPrice - spxBack) / spxBack) * 100 : 0;

  const krwPrice = krwQ.price || krwCloses[krwCloses.length - 1] || 0;
  const krwBack  = krwCloses.length >= 6 ? krwCloses[krwCloses.length - 6] : krwPrice;
  const krw5dPct = krwBack > 0 ? ((krwPrice - krwBack) / krwBack) * 100 : 0;

  // ── F&G 컴포넌트 (한국형 7개) ────────────────────────────────────────────
  // 1) KOSPI 모멘텀: vs 125일선
  const momentumScore =
    kospiVs125Pct >= 8  ? 88 :
    kospiVs125Pct >= 4  ? 72 :
    kospiVs125Pct >= 1  ? 58 :
    kospiVs125Pct >= -2 ? 45 :
    kospiVs125Pct >= -5 ? 28 : 12;

  // 2) KOSPI 변동성 (연환산 %): 낮을수록 탐욕
  const volScore =
    kospiVol < 12 ? 88 :
    kospiVol < 16 ? 72 :
    kospiVol < 20 ? 55 :
    kospiVol < 25 ? 38 :
    kospiVol < 30 ? 22 : 10;

  // 3) 환율 안전자산 수요: USDKRW 5일 변화. 강달러(+) = 위험회피 = 공포
  const krwScore =
    krw5dPct <= -1.5 ? 82 :
    krw5dPct <= -0.5 ? 65 :
    krw5dPct <= 0.5  ? 50 :
    krw5dPct <= 1.5  ? 32 :
    krw5dPct <= 2.5  ? 20 : 10;

  // 4) 상승종목 폭: KOSPI 50/200 위 + 1M 수익률
  const breadthBase = (kospiPrice > kospi50 ? 25 : 0) + (kospiPrice > kospi200 ? 25 : 0);
  const breadthScore = Math.min(100, breadthBase + Math.max(0, oneMoReturn) * 4);

  // 5) KOSDAQ 강도: 코스닥 RSI (소형주 심리)
  const kosdaqScore =
    kosdaqRsi >= 70 ? 85 :
    kosdaqRsi >= 60 ? 70 :
    kosdaqRsi >= 50 ? 55 :
    kosdaqRsi >= 40 ? 38 :
    kosdaqRsi >= 30 ? 22 : 10;

  // 6) 외인 흐름 프록시: KOSPI 5일 vs S&P 5일 상대 강도. KOSPI 강세 = 외인 매수 시그널
  const foreignSpread = kospi5dRet - spx5dRet;
  const foreignScore =
    foreignSpread >= 2.5 ? 82 :
    foreignSpread >= 1   ? 65 :
    foreignSpread >= -1  ? 50 :
    foreignSpread >= -2.5 ? 32 : 18;

  // 7) 주가 강도: KOSPI 52주 신고가 거리
  const strengthScore =
    kospi52wHighDistPct >= -0.5 ? 85 :
    kospi52wHighDistPct >= -2   ? 68 :
    kospi52wHighDistPct >= -5   ? 50 :
    kospi52wHighDistPct >= -10  ? 32 :
    kospi52wHighDistPct >= -20  ? 18 : 8;

  const components = [
    { key: "momentum", labelKr: "KOSPI 모멘텀",   labelEn: "KOSPI vs 125일선",                    score: momentumScore, detail: `${kospiVs125Pct >= 0 ? "+" : ""}${kospiVs125Pct.toFixed(1)}%` },
    { key: "vol",      labelKr: "KOSPI 변동성",   labelEn: "20D Historical Volatility (연환산)",   score: volScore,      detail: `${kospiVol.toFixed(1)}%` },
    { key: "krw",      labelKr: "환율 안전자산",  labelEn: "USDKRW 5D Change (강달러 = 공포)",     score: krwScore,      detail: `USDKRW ${krwPrice.toFixed(0)} (${krw5dPct >= 0 ? "+" : ""}${krw5dPct.toFixed(2)}%)` },
    { key: "breadth",  labelKr: "상승종목 폭",    labelEn: "KOSPI Breadth (50/200 + 1M)",          score: breadthScore,  detail: `1M ${oneMoReturn >= 0 ? "+" : ""}${oneMoReturn.toFixed(1)}%` },
    { key: "kosdaq",   labelKr: "KOSDAQ 강도",    labelEn: "KOSDAQ RSI (소형주 심리)",             score: kosdaqScore,   detail: `RSI ${kosdaqRsi.toFixed(0)}` },
    { key: "foreign",  labelKr: "외인 흐름 프록시", labelEn: "KOSPI 5D vs S&P 5D (상대강도)",        score: foreignScore,  detail: `KOSPI ${kospi5dRet >= 0 ? "+" : ""}${kospi5dRet.toFixed(1)}% vs S&P ${spx5dRet >= 0 ? "+" : ""}${spx5dRet.toFixed(1)}%` },
    { key: "strength", labelKr: "주가 강도",      labelEn: "52주 고점 대비",                        score: strengthScore, detail: `${kospi52wHighDistPct.toFixed(1)}%` },
  ];

  const fgScore = Math.round(
    (momentumScore * 0.20) + (volScore     * 0.18) + (krwScore     * 0.12) +
    (breadthScore  * 0.15) + (kosdaqScore  * 0.10) + (foreignScore * 0.15) +
    (strengthScore * 0.10)
  );
  const fg = classifyFG(fgScore);

  // F&G 1주/1달 전 추정 — 변동성 히스토리 기반
  const oneWeekKospi = kospiCloses.slice(-30, -22);
  const oneMoKospi   = kospiCloses.slice(-44, -22);
  const estFGFromVol = (vol: number) =>
    vol < 12 ? 75 : vol < 16 ? 62 : vol < 20 ? 50 : vol < 25 ? 35 : vol < 30 ? 22 : 12;
  const fgWeekAgo  = estFGFromVol(histVol20(oneWeekKospi.length >= 21 ? oneWeekKospi : kospiCloses.slice(-22, -1)));
  const fgMonthAgo = estFGFromVol(histVol20(oneMoKospi.length >= 21 ? oneMoKospi : kospiCloses.slice(-43, -22)));

  // ── 사이클 단계 ────────────────────────────────────────────────────────
  // VIX 대신 KOSPI hist vol 사용 (스케일이 다르므로 임계값 조정)
  // VIX 18 ≈ KOSPI vol 18 정도로 1:1 매핑이 대체로 맞음
  const phase = estimateCycle({
    spxAbove200:        kospiPrice > kospi200 && kospi200 > 0,
    spxAbove50:         kospiPrice > kospi50  && kospi50  > 0,
    spxVs125Pct:        kospiVs125Pct,
    rsi:                kospiRsi,
    vix:                kospiVol,
    spx52wHighDistPct:  kospi52wHighDistPct,
    oneMonthReturnPct:  oneMoReturn,
  });

  const monthAgoPhase = estimateCycle({
    spxAbove200:        oneMoBack > kospi200 && kospi200 > 0,
    spxAbove50:         oneMoBack > kospi50  && kospi50  > 0,
    spxVs125Pct:        kospi125 > 0 ? ((oneMoBack - kospi125) / kospi125) * 100 : 0,
    rsi:                50,
    vix:                kospiVol,
    spx52wHighDistPct:  kospiQ.high52w > 0 ? ((oneMoBack - kospiQ.high52w) / kospiQ.high52w) * 100 : 0,
    oneMonthReturnPct:  0,
  });

  const cycleRationale = [
    `KOSPI ${kospiPrice.toFixed(0)}`,
    kospiVs125Pct >= 0 ? `125일선 +${kospiVs125Pct.toFixed(1)}%` : `125일선 ${kospiVs125Pct.toFixed(1)}%`,
    `RSI ${kospiRsi.toFixed(0)}`,
    `변동성 ${kospiVol.toFixed(1)}%`,
  ].join(" · ");

  // ── 리스크 카드 (한국형) ──────────────────────────────────────────────
  const risks: MarketIntel["risks"] = [];

  if (kospiRsi >= 70 || kosdaqRsi >= 70) {
    risks.push({
      severity:   "HIGH",
      category:   "기술적 · Technical",
      title:      "과매수 구간 진입",
      metric:     `KOSPI RSI ${kospiRsi.toFixed(0)} / KOSDAQ RSI ${kosdaqRsi.toFixed(0)} / 임계 70`,
      description:"RSI 70 이상은 단기 조정 가능성 높은 구간. 코스닥이 코스피보다 먼저 과매수 신호를 보이는 경우 리테일 과열 패턴.",
    });
  }

  if (kospi52wHighDistPct >= -2 && kospiVol < 14) {
    risks.push({
      severity:   "HIGH",
      category:   "밸류에이션 · Valuation",
      title:      "KOSPI 신고가 + 저변동성 — 과열 신호",
      metric:     `52주 고점 대비 ${kospi52wHighDistPct.toFixed(1)}% / 변동성 ${kospiVol.toFixed(1)}%`,
      description:"신고가 + 낮은 변동성 조합은 시장 안주의 전형. 작은 충격에도 큰 변동성 확대 가능.",
    });
  }

  if (krwPrice >= 1450) {
    risks.push({
      severity:   krwPrice >= 1500 ? "HIGH" : "MEDIUM",
      category:   "환율 · FX",
      title:      `원/달러 ${krwPrice.toFixed(0)}원 — 강달러 압력`,
      metric:     `USDKRW ${krwPrice.toFixed(0)} (${krw5dPct >= 0 ? "+" : ""}${krw5dPct.toFixed(2)}% 5D)`,
      description:"강달러 국면은 외국인 자금 이탈 압력 + 기업 외화 부채 부담. 1500원 근접 시 외환당국 개입 경계.",
    });
  }

  if (oneMoReturn <= -7) {
    risks.push({
      severity:   oneMoReturn <= -10 ? "HIGH" : "MEDIUM",
      category:   "시장 · Bear",
      title:      `KOSPI 1개월 ${oneMoReturn.toFixed(1)}% — 약세장 진입 신호`,
      metric:     `1M ${oneMoReturn >= 0 ? "+" : ""}${oneMoReturn.toFixed(1)}% / 임계 -7%`,
      description:"1개월 -7% 이상 하락은 추세 약화 신호. -10% 돌파 시 기술적 약세장 진입 가능성.",
    });
  }

  if (kospiVol >= 25) {
    risks.push({
      severity:   "MEDIUM",
      category:   "변동성 · Volatility",
      title:      "KOSPI 변동성 급등",
      metric:     `20D 연환산 변동성 ${kospiVol.toFixed(1)}% / 임계 25%`,
      description:"역사적 변동성이 25% 위로 올라서면 시장이 가격에 반영 못한 충격이 진행 중일 가능성.",
    });
  }

  if (foreignSpread <= -2.5) {
    risks.push({
      severity:   "MEDIUM",
      category:   "수급 · Foreign Flow",
      title:      "KOSPI 상대약세 — 외인 자금 이탈 가능성",
      metric:     `KOSPI ${kospi5dRet >= 0 ? "+" : ""}${kospi5dRet.toFixed(1)}% vs S&P ${spx5dRet >= 0 ? "+" : ""}${spx5dRet.toFixed(1)}% (5D)`,
      description:"S&P 대비 KOSPI가 5일 -2.5%p 이상 underperform. 외국인 매도세 또는 원화 약세 동반 가능성.",
    });
  }

  if (phase === "EUPHORIA" || phase === "THRILL") {
    risks.push({
      severity:   "MEDIUM",
      category:   "심리 · Behavioral",
      title:      `사이클 ${CYCLE_KR[phase]} 단계 — 다음은 ${CYCLE_KR[nextRiskPhase(phase)]}`,
      metric:     cycleRationale,
      description:"심리 사이클상 고점 부근. 신규 매수보다 기존 포지션 일부 차익실현이 정석. 현금 비중 단계적 확대 권고.",
    });
  }

  if (oilQ.price >= 90) {
    risks.push({
      severity:   "LOW",
      category:   "원자재 · Oil",
      title:      `유가 $${oilQ.price.toFixed(0)} — 한국 무역수지 부담`,
      metric:     `WTI $${oilQ.price.toFixed(2)}`,
      description:"한국은 원유 100% 수입국. 유가 $90 위 지속 시 무역수지 적자 + 인플레이션 압력 동반.",
    });
  }

  if (risks.length === 0) {
    risks.push({
      severity:   "LOW",
      category:   "전체 · Overall",
      title:      "주요 트리거 부재",
      metric:     `변동성 ${kospiVol.toFixed(1)}% / KOSPI 안정`,
      description:"가격 지표 기준 단기 명백한 위험 신호 없음. 정기 모니터링 유지.",
    });
  }

  const sevOrd: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  risks.sort((a, b) => sevOrd[a.severity] - sevOrd[b.severity]);

  const data: MarketIntel = {
    market: "kr",
    index:    { name: "KOSPI", symbol: "^KS11", price: Math.round(kospiPrice * 100) / 100, changePercent: Math.round(kospiQ.changePct * 100) / 100 },
    volIndex: { name: "KOSPI 변동성", symbol: "HV20", price: Math.round(kospiVol * 100) / 100, changePercent: 0 },
    cycle: {
      phase,
      phaseKr:         CYCLE_KR[phase],
      monthAgoPhase,
      monthAgoPhaseKr: CYCLE_KR[monthAgoPhase],
      nextRiskPhase:   nextRiskPhase(phase),
      nextRiskPhaseKr: CYCLE_KR[nextRiskPhase(phase)],
      rationale:       cycleRationale,
    },
    fearGreed: {
      score:    fgScore,
      level:    fg.level,
      labelKr:  fg.labelKr,
      history:  { weekAgo: fgWeekAgo, monthAgo: fgMonthAgo },
      components: components.map(c => ({
        key:     c.key,
        labelKr: c.labelKr,
        labelEn: c.labelEn,
        level:   classifyFG(c.score).level,
        detail:  c.detail,
      })),
    },
    risks,
    capitalRotation: buildCapitalRotation({
      bondsCloses:  tltHist.map(h => h.close),
      stocksCloses: spxCloses,
      commCloses:   dbcHist.map(h => h.close),
      bondsName:    "장기국채(TLT)", bondsTicker:  "TLT",
      stocksName:   "S&P 500",       stocksTicker: "^GSPC",
      commName:     "원자재(DBC)",   commTicker:   "DBC",
    }),
    asOf: new Date().toISOString(),
  };

  return data;
}

// ── 메인 라우트 ────────────────────────────────────────────────────────────
router.get("/market/intel", async (req, res) => {
  const force  = req.query.refresh === "1";
  const market = req.query.market === "kr" ? "kr" : "us";
  const cacheKey = `market_intel:${market}`;

  const cached = cache.get<MarketIntel>(cacheKey);
  if (cached && !force) return res.json(cached);

  const result = market === "kr" ? await buildKrIntel() : await buildUsIntel();

  if ("status" in result) {
    return res.status(result.status).json({
      error:   result.error,
      message: result.message,
      detail:  result.detail,
      asOf:    result.asOf,
    });
  }

  cache.set(cacheKey, result);
  return res.json(result);
});

export default router;
