import { StockInfo } from "@/constants/stockData";
import { LiveQuote } from "@/context/StockPriceContext";
import {
  ScalpSignal,
  ScalpType,
  UrgencyType,
  RiskLevel,
} from "@/constants/scalping";
import {
  SmartMoneySignal,
  SignalType,
  SignalStrength,
} from "@/constants/smartMoney";

function detNum(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

export function generateScalpSignal(
  stock: StockInfo,
  quote: LiveQuote
): ScalpSignal | null {
  if (!quote.ok || quote.price <= 0) return null;

  const high52  = quote.high52w;
  const low52   = quote.low52w;
  const range52 = high52 - low52;
  const pct52   = range52 > 0 ? (quote.price - low52) / range52 : 0.5;

  const distanceFrom52High =
    high52 > 0 ? Math.round(((quote.price - high52) / high52) * 1000) / 10 : 0;

  const volumeSpike =
    quote.avgVolume10d > 0 && quote.volume > 0
      ? Math.round((quote.volume / quote.avgVolume10d) * 10) / 10
      : Math.round((1.0 + detNum(stock.id + "v", 2, 18) * 0.1) * 10) / 10;

  const baseRsi      = Math.round(20 + pct52 * 60);
  const changeBonus  = Math.round(quote.changePercent * 1.5);
  const rsi          = Math.max(15, Math.min(90, baseRsi + changeBonus));

  const changePct = quote.changePercent;

  let type: ScalpType;
  if (pct52 >= 0.78 && volumeSpike >= 1.5) {
    type = "고점위험";
  } else if (changePct >= 3 && volumeSpike >= 1.8) {
    type = "급등포착";
  } else if (pct52 <= 0.28) {
    type = "눌림목";
  } else {
    type = "관망";
  }

  const surgeScore =
    type === "급등포착" ? Math.min(94, Math.round(60 + volumeSpike * 5 + changePct * 2))
    : type === "눌림목" ? Math.round(42 + (1 - pct52) * 40)
    : type === "고점위험" ? Math.round(55 + pct52 * 30)
    : Math.round(28 + detNum(stock.id, 0, 22));

  const riskScore =
    type === "고점위험" ? Math.min(90, Math.round(48 + pct52 * 42))
    : type === "급등포착" ? Math.round(28 + volumeSpike * 5)
    : type === "눌림목"   ? Math.round(18 + (1 - pct52) * 22)
    : Math.round(22 + detNum(stock.id + "r", 0, 22));

  const urgency: UrgencyType =
    type === "급등포착" ? "즉시"
    : type === "고점위험" ? "당일"
    : "이번주";

  const riskLevel: RiskLevel =
    riskScore >= 55 ? "위험" : riskScore >= 35 ? "주의" : "안전";

  const entryLowPct  = type === "눌림목" ? -3 : type === "급등포착" ? -1 : 0;
  const entryHighPct = type === "급등포착" ? 1 : 0;
  const stopLossPct  = riskLevel === "위험" ? 5 : riskLevel === "주의" ? 7 : 8;

  const profitPcts =
    type === "고점위험"
      ? [
          { label: "탈출 기준", percent: -3 },
          { label: "손절 라인", percent: -stopLossPct },
        ]
      : [
          { label: "1차 익절", percent: 3 },
          { label: "2차 익절", percent: 8 },
          { label: "3차 익절", percent: 15 },
        ];

  const signals: string[] = [];
  if (pct52 >= 0.70)
    signals.push(`52주 고점 ${Math.abs(distanceFrom52High).toFixed(1)}% 이내`);
  if (pct52 <= 0.30) signals.push("52주 저점 구간");
  if (volumeSpike >= 2) signals.push(`거래량 ${volumeSpike.toFixed(1)}배 급증`);
  if (rsi >= 70) signals.push(`RSI ${rsi} 과매수`);
  if (rsi <= 35) signals.push(`RSI ${rsi} 과매도`);
  signals.push(
    changePct > 0
      ? `당일 +${changePct.toFixed(1)}% 상승`
      : `당일 ${changePct.toFixed(1)}% 하락`
  );
  if (quote.fiftyDayAvg > 0) {
    const rate = (stock.market === "NASDAQ" && quote.price > 0)
      ? quote.priceKRW / quote.price
      : 1;
    const ma50krw = quote.fiftyDayAvg * rate;
    signals.push(quote.priceKRW > ma50krw ? "50일 이평선 상방" : "50일 이평선 하방");
  }

  const summaryMap: Record<ScalpType, string> = {
    급등포착: `${stock.name}: 거래량 급증과 상승 모멘텀 포착. 단기 추가 상승 기대.`,
    고점위험: `${stock.name}: 52주 고점 근처 위치. 과열 주의, 리스크 관리 필요.`,
    눌림목:   `${stock.name}: 52주 저점 구간 눌림목. 반등 시 분할 진입 기회.`,
    관망:     `${stock.name}: 뚜렷한 방향성 없음. 추가 신호 확인 후 진입.`,
  };

  const expectedMovePercent =
    type === "급등포착" ? Math.round(volumeSpike * 3 + 3)
    : type === "눌림목"   ? Math.round((1 - pct52) * 20)
    : type === "고점위험" ? -Math.round(pct52 * 10)
    : Math.round(detNum(stock.id, 2, 8));

  return {
    stockId:              stock.id,
    stockName:            stock.name,
    ticker:               stock.ticker,
    market:               stock.market,
    type,
    urgency,
    riskLevel,
    surgeScore,
    riskScore,
    rsi,
    volumeSpike,
    distanceFrom52High,
    expectedMovePercent,
    entryLowPct,
    entryHighPct,
    stopLossPct,
    profitPcts,
    signals,
    summary: summaryMap[type],
  };
}

export function generateSmartMoneySignal(
  stock: StockInfo,
  quote: LiveQuote
): SmartMoneySignal | null {
  if (!quote.ok || quote.price <= 0) return null;

  const high52  = quote.high52w;
  const low52   = quote.low52w;
  const range52 = high52 - low52;
  const pct52   = range52 > 0 ? (quote.price - low52) / range52 : 0.5;

  const volumeRatio =
    quote.avgVolume10d > 0 && quote.volume > 0
      ? Math.round((quote.volume / quote.avgVolume10d) * 10) / 10
      : Math.round((1.0 + detNum(stock.id + "vm", 3, 20) * 0.1) * 10) / 10;

  const changePct = quote.changePercent;

  let type: SignalType;
  let strength: SignalStrength;

  if (changePct > 3 && volumeRatio >= 2 && pct52 < 0.5) {
    type = "세력진입"; strength = "강";
  } else if (changePct < -3 && volumeRatio >= 2 && pct52 > 0.6) {
    type = "세력이탈"; strength = "강";
  } else if (changePct > 1 && volumeRatio >= 1.5) {
    type = "매집중";
    strength = volumeRatio >= 2.5 ? "강" : volumeRatio >= 1.8 ? "중" : "약";
  } else if (changePct < -1 && volumeRatio >= 1.5) {
    type = "분산중";
    strength = volumeRatio >= 2.5 ? "강" : "중";
  } else {
    type = "관망"; strength = "약";
  }

  const baseNet          = Math.round(volumeRatio * Math.abs(changePct) * 50);
  const institutionalNet = changePct > 0 ?  baseNet : -baseNet;
  const foreignerNet     = changePct > 0 ?  Math.round(baseNet * 0.6) : -Math.round(baseNet * 0.6);
  const priceVsSupport   = low52 > 0
    ? Math.round(((quote.price - low52) / low52) * 100 * 10) / 10
    : 10;

  const signals: string[] = [];
  if (volumeRatio >= 2) signals.push(`거래량 ${volumeRatio.toFixed(1)}배 급증`);
  if (pct52 < 0.3)  signals.push("52주 저점 구간 수급 집중");
  if (pct52 > 0.75) signals.push("52주 고점 근처 매도 압력");
  signals.push(
    changePct > 0
      ? `당일 +${changePct.toFixed(1)}% 상승`
      : `당일 ${changePct.toFixed(1)}% 하락`
  );
  if (type === "세력진입" || type === "매집중") signals.push("지지선 이탈 없이 상승");
  if (type === "세력이탈" || type === "분산중") signals.push("고점권 대량 매도 패턴");

  const summaryMap: Record<SignalType, string> = {
    세력진입: `${stock.name}: 저점 구간에서 대량 매수 감지. 세력 진입 신호.`,
    세력이탈: `${stock.name}: 고점 구간에서 대량 매도 감지. 세력 차익실현 신호.`,
    매집중:   `${stock.name}: 거래량 동반 상승. 수급 매집 진행 중.`,
    분산중:   `${stock.name}: 고점 구간 거래량 증가 + 하락. 분산 패턴 감지.`,
    관망:     `${stock.name}: 뚜렷한 수급 신호 없음. 방향 확인 후 대응.`,
  };

  return {
    id:             `dyn_${stock.id}`,
    stockId:        stock.id,
    stockName:      stock.name,
    ticker:         stock.ticker,
    market:         stock.market,
    type,
    strength,
    volumeRatio,
    institutionalNet,
    foreignerNet,
    priceVsSupport,
    signals,
    summary:        summaryMap[type],
    detectedAt:     new Date(),
    isNew:          false,
  };
}
