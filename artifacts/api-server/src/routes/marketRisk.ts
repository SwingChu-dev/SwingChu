import { Router } from "express";
import NodeCache from "node-cache";
import YahooFinanceClass from "yahoo-finance2";

const yahooFinance = new (YahooFinanceClass as any)({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const router = Router();
const cache  = new NodeCache({ stdTTL: 15 * 60 }); // 15분 캐시

// 지경학적 위험 수준
export type RiskLevel = "낮음" | "보통" | "높음" | "위험";

export interface MarketRiskData {
  score:        number;       // 0~100 복합 위험도
  level:        RiskLevel;
  components: {
    vix:        number;
    oil:        number;       // 1일 변화율 %
    gold:       number;       // 1일 변화율 %
    dxy:        number;       // 달러 인덱스 변화율 %
    oilPrice:   number;       // WTI 현재가
    goldPrice:  number;       // 금 현재가 ($/oz)
    dxyLevel:   number;       // DXY 지수
  };
  recommendation: string;     // 포트폴리오 행동 권고
  actions: string[];          // 구체적 행동 목록
  updatedAt: string;
}

async function fetchQuoteChange(symbol: string): Promise<{ price: number; changePercent: number }> {
  try {
    const q: any = await (yahooFinance as any).quote(symbol);
    return {
      price:         q?.regularMarketPrice         ?? 0,
      changePercent: q?.regularMarketChangePercent ?? 0,
    };
  } catch {
    return { price: 0, changePercent: 0 };
  }
}

router.get("/market/risk", async (_req, res) => {
  const cached = cache.get("market_risk");
  if (cached) return res.json(cached);

  // 병렬 fetch: VIX, 유가(WTI), 금, 달러인덱스
  const [vixQ, oilQ, goldQ, dxyQ] = await Promise.all([
    fetchQuoteChange("^VIX"),
    fetchQuoteChange("CL=F"),
    fetchQuoteChange("GC=F"),
    fetchQuoteChange("DX-Y.NYB"),
  ]);

  const vix           = vixQ.price;
  const oilChange     = oilQ.changePercent;
  const goldChange    = goldQ.changePercent;
  const dxyChange     = dxyQ.changePercent;
  const oilPrice      = oilQ.price;
  const goldPrice     = goldQ.price;
  const dxyLevel      = dxyQ.price;

  // ── 복합 위험도 스코어 (0~100) ────────────────────────────────────────────
  // VIX: 시장 공포 (가중 35%)
  const vixScore =
    vix >= 35 ? 35 :
    vix >= 30 ? 28 :
    vix >= 25 ? 20 :
    vix >= 20 ? 12 :
    vix >= 15 ? 6  : 0;

  // 유가 급등 = 중동 지정학 위기 프록시 (가중 30%)
  // 유가 급등: 분쟁 발생 신호 / 급락: 수요 붕괴(경기침체 위험)
  const oilScore =
    oilChange >= 5  ? 30 :
    oilChange >= 3  ? 22 :
    oilChange >= 1.5? 14 :
    oilChange <= -5 ? 20 :   // 수요 붕괴 = 경기 위험
    oilChange <= -3 ? 14 : 5;

  // 금 급등 = 안전자산 수요 = 위험 회피 (가중 20%)
  const goldScore =
    goldChange >= 2   ? 20 :
    goldChange >= 1   ? 14 :
    goldChange >= 0.5 ? 8  :
    goldChange <= -1  ? 2  : 5;

  // 달러 강세 = 위험 회피 or 연준 긴축 신호 (가중 15%)
  const dxyScore =
    dxyChange >= 1    ? 15 :
    dxyChange >= 0.5  ? 10 :
    dxyChange <= -1   ? 5  : 5;

  const score = Math.round(Math.min(100, vixScore + oilScore + goldScore + dxyScore));

  // ── 위험 수준 분류 ────────────────────────────────────────────────────────
  const level: RiskLevel =
    score >= 70 ? "위험" :
    score >= 50 ? "높음" :
    score >= 30 ? "보통" : "낮음";

  // ── 포트폴리오 권고 ───────────────────────────────────────────────────────
  let recommendation: string;
  let actions: string[];

  if (score >= 70) {
    recommendation = "위험 단계 — 현금 비중 확대 및 방어 자산 편입";
    actions = [
      "현금 비중 30~40% 확대",
      "NVDA·IONQ 포지션 25% 축소 권고",
      "방산 ETF(ITA) 매수 고려",
      "에너지 ETF(XLE) 단기 비중 추가",
      "수익금 일부 금 현물 전환 검토",
    ];
  } else if (score >= 50) {
    recommendation = "높음 단계 — 기존 포트폴리오 유지, 추가 매수 자제";
    actions = [
      "기존 포지션 유지 (추가 매수 자제)",
      "NVDA·GOOGL 수익 10~15% 실현 권고",
      "현금 비중 15~20% 확보",
      "금·달러 자산 5~10% 편입 고려",
    ];
  } else if (score >= 30) {
    recommendation = "보통 단계 — 기존 포트폴리오 유지";
    actions = [
      "기존 포트폴리오 유지",
      "저점권 종목 소량 분할 매수 가능",
      "리스크 모니터링 지속",
    ];
  } else {
    recommendation = "낮음 단계 — 기술주 공격적 매수 유지";
    actions = [
      "NVDA·IONQ 등 기술주 적극 매수 구간",
      "저점권 종목 30/30/40 분할 매수 실행",
      "AI·반도체 섹터 비중 확대 유리",
      "IMEC 수혜주(GOOGL·ORCL) 장기 보유 강화",
    ];
  }

  const data: MarketRiskData = {
    score,
    level,
    components: {
      vix,
      oil:       Math.round(oilChange  * 100) / 100,
      gold:      Math.round(goldChange * 100) / 100,
      dxy:       Math.round(dxyChange  * 100) / 100,
      oilPrice:  Math.round(oilPrice   * 100) / 100,
      goldPrice: Math.round(goldPrice),
      dxyLevel:  Math.round(dxyLevel   * 100) / 100,
    },
    recommendation,
    actions,
    updatedAt: new Date().toISOString(),
  };

  cache.set("market_risk", data);
  return res.json(data);
});

export default router;
