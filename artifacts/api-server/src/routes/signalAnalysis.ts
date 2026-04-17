import { Router } from "express";
import NodeCache from "node-cache";

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
    if (bars.length > 0) return bars;
  } catch {}
  return [];
}

const router = Router();
const cache  = new NodeCache({ stdTTL: 10 * 60 });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini HTTP ${resp.status}: ${JSON.stringify(err)}`);
  }
  const data: any = await resp.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p.text ?? "").join("");
}

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

export type SignalType = "세력진입" | "세력이탈" | "매집중" | "분산중" | "관망";
export type SignalStrength = "강" | "중" | "약";

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
  ma60: number;
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
  generatedAt: string;
}

// ─── AI 신호 분석 (Gemini Flash) ─────────────────────────────────────────────

async function analyzeWithAI(
  ticker: string,
  market: string,
  ind: TechnicalIndicators,
  institutionalNet: number,
  foreignerNet: number,
): Promise<StockSignal["smartMoney"]> {

  const isKorean = market === "KOSPI" || market === "KOSDAQ";
  const priceStr = isKorean
    ? `${ind.currentPrice.toLocaleString()}원`
    : `$${ind.currentPrice.toFixed(2)} (₩${Math.round(ind.currentPrice * 1450).toLocaleString()})`;

  const prompt = `당신은 한국 주식시장 전문 퀀트 애널리스트입니다. 아래 기술적 지표를 분석해 세력(스마트머니) 동향을 JSON으로 판단하세요.

## 종목: ${ticker} (${market}) | 현재가: ${priceStr} | 전일대비: ${ind.changePercent > 0 ? "+" : ""}${ind.changePercent.toFixed(2)}%

## 기술적 지표
- RSI-14: ${ind.rsi14}  (30↓=과매도, 70↑=과매수)
- MACD히스토그램: ${ind.macdHistogram.toFixed(3)} (양수=상승모멘텀, 음수=하락)
- MA5: ${isKorean ? ind.ma5.toLocaleString() : ind.ma5.toFixed(2)} / MA20: ${isKorean ? ind.ma20.toLocaleString() : ind.ma20.toFixed(2)} / MA60: ${isKorean ? ind.ma60.toLocaleString() : ind.ma60.toFixed(2)}
- MA배열: ${ind.ma5 > ind.ma20 && ind.ma20 > ind.ma60 ? "완전정배열(강세)" : ind.ma5 < ind.ma20 && ind.ma20 < ind.ma60 ? "완전역배열(약세)" : ind.ma5 > ind.ma20 ? "단기정배열" : "단기역배열"}
- 현재가 위치: MA5 ${ind.currentPrice >= ind.ma5 ? "위" : "아래"} / MA20 ${ind.currentPrice >= ind.ma20 ? "위" : "아래"} / MA60 ${ind.currentPrice >= ind.ma60 ? "위" : "아래"}
- 볼린저밴드폭: ${ind.bbWidth.toFixed(1)}%  BB하단: ${isKorean ? ind.bbLower.toLocaleString() : ind.bbLower.toFixed(2)} / BB상단: ${isKorean ? ind.bbUpper.toLocaleString() : ind.bbUpper.toFixed(2)}
- 거래량: 20일평균 대비 ${ind.volumeRatio.toFixed(2)}배
- 52주범위위치: ${Math.round(ind.pct52Range * 100)}% (고점대비: ${ind.distFrom52High.toFixed(1)}%)

## 응답 형식 (JSON만 반환, 다른 텍스트 없이)
{
  "type": "세력진입|세력이탈|매집중|분산중|관망" 중 하나,
  "strength": "강|중|약" 중 하나,
  "summary": "2-3문장 한국어 분석 (수치 직접 언급)",
  "signals": ["지표 기반 신호 3-5개 (구체적 수치 포함)"]
}

## 판단 기준 (MA5/20/60 정배열 우선 판단, 관망은 마지막 수단)
- 세력진입: RSI 35~55 + 거래량 1.8배+ + MACD히스토 양전환 + 현재가 MA60 지지 반등 → 저점 매집
- 세력이탈: RSI 65+ + 거래량 1.8배+ + 완전정배열 과열 + BB상단 이탈 → 고점 분산
- 매집중: MA5 > MA20 반전 시작 + MACD 양전환 + 거래량 1.3배+ + 현재가 MA20 아래~근처
- 분산중: 완전정배열→역배열 전환 중 + 거래량 증가 + 하락 + BB상단 이탈
- 관망: MA 배열 혼재, 거래량 평범, 방향성 불명확`;

  try {
    const text = await callGemini(prompt);
    // 마크다운 코드블록(```json ... ```) 또는 순수 JSON 모두 처리
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonMatch = codeBlock ? codeBlock[1].match(/\{[\s\S]*\}/) : text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      type:            parsed.type     ?? "관망",
      strength:        parsed.strength ?? "약",
      institutionalNet,
      foreignerNet,
      summary:         parsed.summary  ?? "",
      signals:         parsed.signals  ?? [],
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
): StockSignal["smartMoney"] {
  const { rsi14, volumeRatio, changePercent, macdHistogram, ma5, ma20, ma60, currentPrice } = ind;

  const isFullBull  = ma5 > ma20 && ma20 > ma60;  // 완전 정배열
  const isFullBear  = ma5 < ma20 && ma20 < ma60;  // 완전 역배열
  const priceAboveMA60 = currentPrice >= ma60;
  const priceNearMA60  = Math.abs(currentPrice - ma60) / ma60 < 0.03; // MA60 ±3%

  let type: SignalType;
  let strength: SignalStrength;

  // 세력진입: MA60 지지 + RSI 중립 + 거래량 급증 + MACD 상향전환
  if (rsi14 >= 33 && rsi14 <= 57 && volumeRatio >= 1.8 && macdHistogram > 0
      && (priceNearMA60 || (!isFullBull && priceAboveMA60))) {
    type = "세력진입"; strength = volumeRatio >= 2.5 ? "강" : "중";
  // 세력이탈: 완전정배열 과열 + RSI 과매수 + 거래량 급증 + MACD 꺾임
  } else if (isFullBull && rsi14 >= 65 && volumeRatio >= 1.8 && macdHistogram < 0) {
    type = "세력이탈"; strength = rsi14 >= 70 ? "강" : "중";
  // 매집중: MA5가 MA20 상향 돌파 시작 + MACD 양전환 + 거래량 증가
  } else if (ma5 > ma20 && macdHistogram > 0 && volumeRatio >= 1.3 && !isFullBull) {
    type = "매집중"; strength = volumeRatio >= 2 ? "강" : "중";
  // 분산중: 완전정배열→역배열 전환 + 하락 + 거래량 증가
  } else if (isFullBull && changePercent < -0.5 && volumeRatio >= 1.3) {
    type = "분산중"; strength = "중";
  } else if (isFullBear && changePercent < -0.5 && volumeRatio >= 1.5) {
    type = "분산중"; strength = "중";
  } else {
    type = "관망"; strength = "약";
  }

  const alignment = isFullBull ? "완전정배열" : isFullBear ? "완전역배열" : ma5 > ma20 ? "단기정배열" : "단기역배열";
  return {
    type, strength, institutionalNet, foreignerNet,
    summary: `RSI ${rsi14}, MA ${alignment}, 거래량 ${volumeRatio.toFixed(1)}배 기반 규칙 분석.`,
    signals: [
      `RSI-14: ${rsi14}`,
      `MA배열: ${alignment} (5선 ${ma5 > ma60 ? ">" : "<"} 60선)`,
      `거래량: 평균 대비 ${volumeRatio.toFixed(1)}배`,
      `MACD 히스토그램: ${macdHistogram > 0 ? "+" : ""}${macdHistogram.toFixed(3)}`,
      `현재가 vs MA60: ${priceNearMA60 ? "MA60 근접(±3%)" : priceAboveMA60 ? "MA60 위" : "MA60 아래"}`,
    ],
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
      const ma60 = calcSma(allCloses, 60);

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
        ma60,
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
      const smartMoney = await analyzeWithAI(
        ticker, market, ind, institutionalNet, foreignerNet
      );

      results.push({
        ticker, market, indicators: ind,
        smartMoney,
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
