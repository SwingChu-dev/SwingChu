import { Router } from "express";
import NodeCache from "node-cache";
import Anthropic from "@anthropic-ai/sdk";
import YahooFinanceClass from "yahoo-finance2";
interface Bar { date: string; open: number; high: number; low: number; close: number; volume: number }

const yahooFinance = new (YahooFinanceClass as any)({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

function toYahooTicker(ticker: string, market: string): string {
  if (market === "KOSPI")  return `${ticker}.KS`;
  if (market === "KOSDAQ") return `${ticker}.KQ`;
  return ticker;
}

async function fetchHistory(ticker: string, market: string, days: number): Promise<Bar[]> {
  const yt = toYahooTicker(ticker, market);
  const p1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  // ① Yahoo Finance chart()
  try {
    const result: any = await (yahooFinance as any).chart(yt, { period1: p1, interval: "1d" });
    const quotes: any[] = result?.quotes ?? [];
    const bars = quotes
      .filter((d: any) => d.close != null && d.close > 0)
      .map((d: any) => ({
        date:   (d.date instanceof Date ? d.date : new Date((d.date ?? 0) * 1000)).toISOString().split("T")[0],
        open:   d.open   ?? d.close,
        high:   d.high   ?? d.close,
        low:    d.low    ?? d.close,
        close:  d.close,
        volume: d.volume ?? 0,
      }));
    if (bars.length >= 20) return bars;
  } catch {}
  // ② historical() 폴백
  try {
    const p1s = p1.toISOString().split("T")[0];
    const p2s = new Date().toISOString().split("T")[0];
    const raw: any[] = await (yahooFinance as any).historical(yt, { period1: p1s, period2: p2s }).catch(() => []);
    return raw
      .filter((d: any) => d.close != null && d.close > 0)
      .map((d: any) => ({
        date:   (d.date instanceof Date ? d.date : new Date(d.date)).toISOString().split("T")[0],
        open:   d.open  ?? d.close,
        high:   d.high  ?? d.close,
        low:    d.low   ?? d.close,
        close:  d.close,
        volume: d.volume ?? 0,
      }));
  } catch {}
  return [];
}

const router = Router();
const cache  = new NodeCache({ stdTTL: 10 * 60 });

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey:  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "dummy",
});

// ─── 기술적 지표 계산 ─────────────────────────────────────────────────────────

function calcRsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let e = values[0];
  result.push(e);
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    result.push(e);
  }
  return result;
}

function calcMacd(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = ema(macdLine.slice(macdLine.length - 9), 9);
  const lastMacd   = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return {
    macd:      Math.round(lastMacd   * 100) / 100,
    signal:    Math.round(lastSignal * 100) / 100,
    histogram: Math.round((lastMacd - lastSignal) * 100) / 100,
  };
}

function calcBollinger(closes: number[], period = 20): { upper: number; mid: number; lower: number; bw: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 0;
    return { upper: last, mid: last, lower: last, bw: 0 };
  }
  const slice = closes.slice(closes.length - period);
  const mid   = slice.reduce((a, b) => a + b, 0) / period;
  const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period);
  return {
    upper: Math.round((mid + 2 * std) * 100) / 100,
    mid:   Math.round(mid * 100) / 100,
    lower: Math.round((mid - 2 * std) * 100) / 100,
    bw:    Math.round((std * 4 / mid) * 1000) / 10,  // Bandwidth %
  };
}

function calcVolumeAvg(bars: Bar[], period = 20): number {
  if (bars.length === 0) return 0;
  const slice = bars.slice(Math.max(0, bars.length - 1 - period), bars.length - 1);
  if (slice.length === 0) return bars[bars.length - 1].volume;
  return Math.round(slice.reduce((a, b) => a + b.volume, 0) / slice.length);
}

function calcSma(values: number[], period: number): number {
  const slice = values.slice(Math.max(0, values.length - period));
  return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
}

// ─── 신호 분석 타입 ──────────────────────────────────────────────────────────

export type SignalType = "세력진입" | "세력이탈" | "매집중" | "분산중" | "관망" |
                         "급등포착" | "고점위험" | "눌림목";
export type SignalStrength = "강" | "중" | "약";
export type ScalpType = "급등포착" | "고점위험" | "눌림목" | "관망";
export type UrgencyType = "즉시" | "당일" | "이번주";
export type RiskLevel = "위험" | "주의" | "안전";

export interface TechnicalIndicators {
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bbUpper: number;
  bbMid: number;
  bbLower: number;
  bbWidth: number;
  ma5: number;
  ma20: number;
  volume: number;
  volumeAvg20: number;
  volumeRatio: number;
  currentPrice: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  distFrom52High: number;
  pct52Range: number;
}

export interface StockSignal {
  ticker: string;
  market: string;
  indicators: TechnicalIndicators;
  smartMoney: {
    type: SignalType;
    strength: SignalStrength;
    institutionalNet: number;
    foreignerNet: number;
    summary: string;
    signals: string[];
  };
  scalping: {
    type: ScalpType;
    urgency: UrgencyType;
    riskLevel: RiskLevel;
    surgeScore: number;
    riskScore: number;
    expectedMovePercent: number;
    entryLowPct: number;
    entryHighPct: number;
    stopLossPct: number;
    profitPcts: { label: string; percent: number }[];
    summary: string;
    caution?: string;
    signals: string[];
  };
  generatedAt: string;
}

// ─── AI 신호 분석 (Claude Haiku) ─────────────────────────────────────────────

async function analyzeWithAI(
  ticker: string,
  market: string,
  ind: TechnicalIndicators,
  institutionalNet: number,
  foreignerNet: number,
): Promise<{ smartMoney: StockSignal["smartMoney"]; scalping: StockSignal["scalping"] }> {

  const isKorean = market === "KOSPI" || market === "KOSDAQ";
  const priceStr = isKorean
    ? `${ind.currentPrice.toLocaleString()}원`
    : `$${ind.currentPrice.toFixed(2)} (₩${Math.round(ind.currentPrice * 1450).toLocaleString()})`;

  const prompt = `당신은 한국 주식시장 전문 퀀트 애널리스트입니다. 아래 실시간 기술적 지표와 수급 데이터를 분석하여 JSON 형식으로 응답하세요.

## 종목 정보
- 티커: ${ticker} (${market})
- 현재가: ${priceStr}
- 전일 대비: ${ind.changePercent > 0 ? "+" : ""}${ind.changePercent.toFixed(2)}%

## 기술적 지표
- RSI-14: ${ind.rsi14} (30 이하=과매도, 70 이상=과매수)
- MACD: ${ind.macd} / Signal: ${ind.macdSignal} / Histogram: ${ind.macdHistogram}
- 볼린저밴드: 상단 ${isKorean ? ind.bbUpper.toLocaleString() : ind.bbUpper.toFixed(2)} / 중단 ${isKorean ? ind.bbMid.toLocaleString() : ind.bbMid.toFixed(2)} / 하단 ${isKorean ? ind.bbLower.toLocaleString() : ind.bbLower.toFixed(2)}
- BB폭(변동성): ${ind.bbWidth.toFixed(1)}%
- MA5: ${isKorean ? ind.ma5.toLocaleString() : ind.ma5.toFixed(2)}, MA20: ${isKorean ? ind.ma20.toLocaleString() : ind.ma20.toFixed(2)}
- 거래량: ${ind.volume.toLocaleString()} (20일 평균 대비 ${ind.volumeRatio.toFixed(2)}배)
- 52주 고점 대비: ${ind.distFrom52High.toFixed(1)}%
- 52주 범위 위치: ${Math.round(ind.pct52Range * 100)}%

## 수급 데이터 (당일)
${isKorean
  ? `- 기관 순매수: ${institutionalNet.toLocaleString()}주 (${institutionalNet > 0 ? "매수우위" : institutionalNet < 0 ? "매도우위" : "중립"})
- 외국인 순매수: ${foreignerNet.toLocaleString()}주 (${foreignerNet > 0 ? "매수우위" : foreignerNet < 0 ? "매도우위" : "중립"})`
  : `- 기관/외국인 데이터 없음 (미국주식, 기술적 분석만 사용)`}

## 응답 형식 (반드시 JSON만 반환)
{
  "smartMoney": {
    "type": "세력진입|세력이탈|매집중|분산중|관망" 중 하나,
    "strength": "강|중|약" 중 하나,
    "summary": "2-3문장 한국어 분석 요약 (실제 수치 언급 포함)",
    "signals": ["실제 지표 기반 감지 신호 3-5개 (구체적 수치 포함)"]
  },
  "scalping": {
    "type": "급등포착|고점위험|눌림목|관망" 중 하나,
    "urgency": "즉시|당일|이번주" 중 하나,
    "riskLevel": "위험|주의|안전" 중 하나,
    "surgeScore": 0-100 숫자 (급등 가능성),
    "riskScore": 0-100 숫자 (위험도),
    "expectedMovePercent": 예상 단기 이동 % (정수, 음수 가능),
    "entryLowPct": 진입 하단 % (현재가 대비, 음수 또는 0),
    "entryHighPct": 진입 상단 % (현재가 대비, 양수 또는 0),
    "stopLossPct": 손절 % (양수, 3-10 범위),
    "profitPcts": [{"label": "1차 익절", "percent": 숫자}, {"label": "2차 익절", "percent": 숫자}, {"label": "3차 익절", "percent": 숫자}],
    "summary": "2문장 한국어 단타 전략 요약",
    "caution": "주의 메시지 (해당시만, 없으면 null)",
    "signals": ["단타 관점 신호 3-4개"]
  }
}

판단 기준:
- 세력진입: RSI<50 + 거래량 2배+ + 기관/외국인 순매수
- 세력이탈: RSI>65 + 거래량 2배+ + 기관/외국인 순매도
- 매집중: MACD 상향 + 거래량 1.5배+ + 상승
- 분산중: 고점권 거래량 증가 + 하락 + BB상단 근접
- 급등포착: 당일 +3%+ + 거래량 2배+ + MACD 히스토그램 양수
- 고점위험: 52주 범위 75%+ + RSI 65+ + BB상단 근접
- 눌림목: 52주 범위 30%이하 + RSI 40이하 + 지지선 근접`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      smartMoney: {
        type:            parsed.smartMoney?.type ?? "관망",
        strength:        parsed.smartMoney?.strength ?? "약",
        institutionalNet,
        foreignerNet,
        summary:         parsed.smartMoney?.summary ?? "",
        signals:         parsed.smartMoney?.signals ?? [],
      },
      scalping: {
        type:                parsed.scalping?.type ?? "관망",
        urgency:             parsed.scalping?.urgency ?? "이번주",
        riskLevel:           parsed.scalping?.riskLevel ?? "주의",
        surgeScore:          parsed.scalping?.surgeScore ?? 30,
        riskScore:           parsed.scalping?.riskScore ?? 30,
        expectedMovePercent: parsed.scalping?.expectedMovePercent ?? 0,
        entryLowPct:         parsed.scalping?.entryLowPct ?? 0,
        entryHighPct:        parsed.scalping?.entryHighPct ?? 0,
        stopLossPct:         parsed.scalping?.stopLossPct ?? 6,
        profitPcts:          parsed.scalping?.profitPcts ?? [
          { label: "1차 익절", percent: 3 },
          { label: "2차 익절", percent: 8 },
          { label: "3차 익절", percent: 15 },
        ],
        summary:  parsed.scalping?.summary ?? "",
        caution:  parsed.scalping?.caution ?? undefined,
        signals:  parsed.scalping?.signals ?? [],
      },
    };
  } catch (e) {
    console.error("[AI signal] error:", e);
    return fallbackSignal(ind, institutionalNet, foreignerNet);
  }
}

// ─── AI 실패시 규칙 기반 폴백 ─────────────────────────────────────────────────

function fallbackSignal(
  ind: TechnicalIndicators,
  institutionalNet: number,
  foreignerNet: number,
): ReturnType<typeof analyzeWithAI> extends Promise<infer T> ? T : never {
  const { rsi14, volumeRatio, changePercent, pct52Range, macdHistogram } = ind;

  let smType: SignalType;
  let smStrength: SignalStrength;
  if (changePercent > 3 && volumeRatio >= 2 && pct52Range < 0.5 && institutionalNet > 0) {
    smType = "세력진입"; smStrength = "강";
  } else if (changePercent < -3 && volumeRatio >= 2 && pct52Range > 0.6) {
    smType = "세력이탈"; smStrength = "강";
  } else if (changePercent > 1 && volumeRatio >= 1.5 && macdHistogram > 0) {
    smType = "매집중"; smStrength = volumeRatio >= 2.5 ? "강" : "중";
  } else if (changePercent < -1 && volumeRatio >= 1.5) {
    smType = "분산중"; smStrength = "중";
  } else {
    smType = "관망"; smStrength = "약";
  }

  let scalpType: ScalpType;
  if (pct52Range >= 0.78 && volumeRatio >= 1.5) scalpType = "고점위험";
  else if (changePercent >= 3 && volumeRatio >= 1.8) scalpType = "급등포착";
  else if (pct52Range <= 0.28 && rsi14 <= 45) scalpType = "눌림목";
  else scalpType = "관망";

  const riskLevel: RiskLevel = rsi14 >= 70 ? "위험" : rsi14 >= 55 ? "주의" : "안전";
  const urgency: UrgencyType = scalpType === "급등포착" ? "즉시" : scalpType === "고점위험" ? "당일" : "이번주";

  return {
    smartMoney: {
      type: smType, strength: smStrength,
      institutionalNet, foreignerNet,
      summary: `RSI ${rsi14}, 거래량 ${volumeRatio.toFixed(1)}배 기반 규칙 분석.`,
      signals: [
        `RSI-14: ${rsi14}`,
        `거래량: ${volumeRatio.toFixed(1)}배`,
        `당일 변동: ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
      ],
    },
    scalping: {
      type: scalpType, urgency, riskLevel,
      surgeScore: Math.min(90, Math.round(40 + volumeRatio * 8 + Math.abs(changePercent) * 3)),
      riskScore: Math.min(90, Math.round(30 + rsi14 * 0.5)),
      expectedMovePercent: scalpType === "급등포착" ? Math.round(volumeRatio * 3) : scalpType === "눌림목" ? 8 : -5,
      entryLowPct: scalpType === "눌림목" ? -3 : scalpType === "급등포착" ? -1 : 0,
      entryHighPct: scalpType === "급등포착" ? 1 : 0,
      stopLossPct: riskLevel === "위험" ? 5 : 7,
      profitPcts: [
        { label: "1차 익절", percent: 3 },
        { label: "2차 익절", percent: 8 },
        { label: "3차 익절", percent: 15 },
      ],
      summary: `${scalpType} 패턴 감지. RSI ${rsi14}, 거래량 ${volumeRatio.toFixed(1)}배 이동평균 대비.`,
      caution: rsi14 >= 70 ? "RSI 과매수 구간 — 급등 추격 매수 위험" : undefined,
      signals: [`RSI ${rsi14}`, `거래량 ${volumeRatio.toFixed(1)}배`, `당일 ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`],
    },
  };
}

// ─── /stocks/signals 엔드포인트 ──────────────────────────────────────────────

router.get("/stocks/signals", async (req, res) => {
  const raw   = (req.query.items as string) ?? "";
  const items = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (items.length === 0) return res.json([]);

  const cacheKey = items.slice().sort().join(",");
  const cached   = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const parsed = items.map(item => {
    const [ticker, market = "NASDAQ"] = item.split(":");
    return { ticker, market };
  });

  const results: StockSignal[] = [];

  for (const { ticker, market } of parsed) {
    try {
      // ── 1. 히스토리 + 현재가 병렬 로드 (Yahoo Finance) ─────────────────────
      const yt = toYahooTicker(ticker, market);
      const [bars, yq] = await Promise.all([
        fetchHistory(ticker, market, 120),
        (yahooFinance as any).quote(yt).catch(() => null),
      ]);

      if (bars.length < 20) continue;

      const yqData: any = yq;
      if (!yqData?.regularMarketPrice) continue;
      const price = yqData.regularMarketPrice ?? 0;
      const quote = {
        close:         price,
        volume:        yqData.regularMarketVolume ?? 0,
        changePercent: yqData.regularMarketChangePercent ?? 0,
        high52w:       yqData.fiftyTwoWeekHigh ?? price * 1.3,
        low52w:        yqData.fiftyTwoWeekLow  ?? price * 0.7,
      };

      // 투자자 수급: Yahoo Finance에서 미제공 → 0으로 설정 (AI 판정에 미미한 영향)
      const institutionalNet = 0;
      const foreignerNet     = 0;

      const closes  = bars.map(b => b.close);
      const volumes = bars.map(b => b.volume);
      const currentClose = quote.close;
      const currentVol   = quote.volume;

      // ── 2. 기술적 지표 계산 ────────────────────────────────────────────────
      const allCloses  = [...closes, currentClose];
      const rsi14      = calcRsi(allCloses);
      const macdResult = calcMacd(allCloses);
      const bb         = calcBollinger(allCloses);
      const volumeAvg  = calcVolumeAvg(bars);
      const volumeRatio = volumeAvg > 0 ? Math.round((currentVol / volumeAvg) * 100) / 100 : 1;
      const ma5  = calcSma(allCloses, 5);
      const ma20 = calcSma(allCloses, 20);

      const high52w = Math.max(currentClose, ...closes.map(c => c));
      const low52w  = Math.min(currentClose, ...closes.map(c => c));
      // 52주(=약 250거래일) 데이터가 없으면 quote 값 사용
      const h52 = quote.high52w > 0 ? quote.high52w : high52w;
      const l52 = quote.low52w  > 0 ? quote.low52w  : low52w;
      const range52 = h52 - l52;
      const pct52Range = range52 > 0 ? (currentClose - l52) / range52 : 0.5;
      const distFrom52High = h52 > 0
        ? Math.round(((currentClose - h52) / h52) * 1000) / 10
        : 0;

      const ind: TechnicalIndicators = {
        rsi14,
        macd:          macdResult.macd,
        macdSignal:    macdResult.signal,
        macdHistogram: macdResult.histogram,
        bbUpper:       bb.upper,
        bbMid:         bb.mid,
        bbLower:       bb.lower,
        bbWidth:       bb.bw,
        ma5,
        ma20,
        volume:        currentVol,
        volumeAvg20:   volumeAvg,
        volumeRatio,
        currentPrice:  currentClose,
        changePercent: quote.changePercent,
        high52w:       h52,
        low52w:        l52,
        distFrom52High,
        pct52Range,
      };

      // ── 3. Claude AI 신호 분석 ─────────────────────────────────────────────
      const { smartMoney, scalping } = await analyzeWithAI(
        ticker, market, ind, institutionalNet, foreignerNet
      );

      results.push({
        ticker, market, indicators: ind,
        smartMoney, scalping,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[signals] ${ticker}:`, err);
    }
  }

  cache.set(cacheKey, results);
  return res.json(results);
});

export default router;
