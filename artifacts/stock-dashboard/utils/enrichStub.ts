import { StockInfo, FinancialAnalysis, Market } from "@/constants/stockData";
import { LiveQuote } from "@/context/StockPriceContext";

export interface StockDetail {
  ticker: string;
  market: string;
  name: string;
  currentPrice: number;
  priceKRW: number;
  high52w: number;
  low52w: number;
  high52wKRW: number;
  low52wKRW: number;
  changePercent: number;
  prevClose: number;
  per: number | null;
  forwardPer: number | null;
  pbr: number | null;
  roe: number | null;
  debtRatio: number | null;
  revenueGrowth: number | null;
  targetMean: number | null;
  targetMeanKRW: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  beta: number | null;
  recommendationKey: string;
}

const USD_KRW = 1450;

function evalFinancials(
  per: number | null,
  pbr: number | null,
  market: string
): FinancialAnalysis["evaluation"] {
  if (!per || per <= 0 || !pbr || pbr <= 0) return "적정";
  if (market === "NASDAQ") {
    if (per < 20 && pbr < 4) return "저평가";
    if (per > 60 || pbr > 20) return "심각한 거품";
    if (per > 40 || pbr > 12) return "거품";
    if (per < 25 && pbr < 6) return "저평가";
  } else if (market === "KOSPI") {
    if (per < 8 && pbr < 0.8) return "강한 저평가";
    if (per < 12 && pbr < 1.2) return "저평가";
    if (per > 25 || pbr > 3) return "거품";
  } else {
    if (per < 12 && pbr < 1.5) return "저평가";
    if (per > 35 || pbr > 5) return "거품";
  }
  return "적정";
}

function boxPosition(cp: number, lo: number, hi: number): "저점권" | "중간권" | "고점권" {
  if (lo <= 0 || hi <= lo) return "중간권";
  const pct = (cp - lo) / (hi - lo);
  if (pct <= 0.30) return "저점권";
  if (pct >= 0.70) return "고점권";
  return "중간권";
}

function genDayFeatures(market: string) {
  if (market === "KOSPI" || market === "KOSDAQ") {
    return [
      { day: "월요일", feature: "외국인·기관 매매 방향 결정 요일. 주말 글로벌 이슈 소화로 갭 등락이 잦습니다.", caution: "갭 하락 시 섣부른 추격 매수 금지. 매매 방향 확인 후 진입." },
      { day: "화요일", feature: "수급 안정화 구간. 기관 프로그램 매매 집중되는 경향이 있습니다.", caution: "오전 9:00~9:30 변동성 구간 주의." },
      { day: "수요일", feature: "한 주 중 가장 안정적인 수급 패턴. 추세가 유지되는 경향.", caution: "FOMC 발표 주간에는 야간 미국 장 영향에 주의." },
      { day: "목요일", feature: "기관 분기말·월말 수급 조정 구간. 프로그램 매도 증가 가능.", caution: "선물·옵션 만기일(매월 두 번째 목요일) 변동성 급증 주의." },
      { day: "금요일", feature: "포지션 청산 경향. 주말 리스크 회피로 오후 매도세 강화.", caution: "금요일 오후 보유 포지션 점검 필수. 주말 뉴스 리스크 대비." },
    ];
  }
  return [
    { day: "월요일", feature: "주말 글로벌 뉴스 소화. 선물 시장 방향 선행 파악 중요.", caution: "갭 변동성 구간. 개장 30분 내 급등락 시 섣부른 진입 금지." },
    { day: "화요일", feature: "수급 안정화. 기술적 신호 신뢰도 높아지는 구간.", caution: "실적 발표 시즌에는 PMC 어닝 서프라이즈/쇼크 주의." },
    { day: "수요일", feature: "FOMC 성명 발표 주간에 변동성 최고조. 평소엔 추세 지속 구간.", caution: "FOMC 발표 전후 ±2% 이상 변동 가능. 레버리지 축소 권장." },
    { day: "목요일", feature: "주간 실업수당 청구건수 발표일. 고용 지표 영향 있음.", caution: "월별 CPI·PPI 발표일 겹칠 시 변동성 급증." },
    { day: "금요일", feature: "고용보고서(NFP) 발표일. 포지션 정리로 거래량 감소하는 경향.", caution: "주말 포지션 리스크 최소화. 오후 장 유동성 감소 주의." },
  ];
}

function genRisk(stock: StockInfo, detail: StockDetail, pos: string) {
  const mktText = stock.market === "NASDAQ"
    ? "미국 연준(Fed) 금리 결정, 달러 강세, 지정학적 갈등(중동·러-우)이 주요 외부 리스크입니다."
    : stock.market === "KOSPI"
    ? "외국인 수급 변동, 원/달러 환율, 미중 무역 갈등, 국내 정치 불확실성이 주요 리스크입니다."
    : "개인 투자자 수급 의존도 높음. 테마 소멸 시 급락 위험. 코스닥 특례기업 심사 이슈 주의.";

  const lo52KRW = detail.low52wKRW || stock.boxRange.support;
  const hi52KRW = detail.high52wKRW || stock.boxRange.resistance;

  const techBounce =
    pos === "저점권"
      ? `52주 저점(₩${lo52KRW.toLocaleString()}) 근처에서 강한 지지 가능성. RSI 과매도 구간 진입 시 반등 모멘텀 확인.`
      : pos === "고점권"
      ? `52주 고점(₩${hi52KRW.toLocaleString()}) 근처. 신고점 돌파 시 추세 지속이나 저항 실패 시 눌림목 조정 가능.`
      : `박스권 중간 구간. 지지선(₩${lo52KRW.toLocaleString()}) 이탈 여부가 핵심 기술적 신호.`;

  const strategy =
    pos === "저점권"
      ? `현재 저점권 위치. 30·30·40 분할 진입 적기. 손절은 52주 저점 -7% 이하. 1차 익절 목표 +10%.`
      : pos === "고점권"
      ? `현재 고점권 위치. 신규 매수 최소화. 기존 보유자는 30~50% 분할 익절 권장. 재진입은 -10% 눌림 후.`
      : `방향성 확인 후 진입. 돌파 매수: 저항선 +1% 돌파 확인. 역추세 매수: 지지선 반등 후 30% 먼저.`;

  const witch = stock.market === "NASDAQ"
    ? "옵션 만기일(매월 3번째 금요일) 및 쿼드러플 위칭데이(3·6·9·12월) 전후 포지션 축소 권장."
    : "선물·옵션 동시 만기일(매월 2번째 목요일) 오후 장 변동성 급증. 기존 포지션 50% 이내 유지.";

  return { geopolitical: mktText, technicalBounce: techBounce, strategy, witchDay: witch };
}

export function buildEnrichedStock(
  stub: StockInfo,
  detail: StockDetail,
  liveQuote: LiveQuote | null
): StockInfo {
  const isKorean = stub.market === "KOSPI" || stub.market === "KOSDAQ";
  const liveKRW = liveQuote?.priceKRW || detail.priceKRW || stub.currentPrice;
  const liveNative = liveQuote?.price || detail.currentPrice || (isKorean ? liveKRW : liveKRW / USD_KRW);

  const supportKRW    = detail.low52wKRW  > 0 ? detail.low52wKRW  : Math.round(liveKRW * 0.75);
  const resistanceKRW = detail.high52wKRW > 0 ? detail.high52wKRW : Math.round(liveKRW * 1.25);
  const pos = boxPosition(liveKRW, supportKRW, resistanceKRW);

  const splitEntries = [
    { ratio: 30, dropPercent: 5,  targetPrice: Math.round(liveKRW * 0.95) },
    { ratio: 30, dropPercent: 10, targetPrice: Math.round(liveKRW * 0.90) },
    { ratio: 40, dropPercent: 15, targetPrice: Math.round(liveKRW * 0.85) },
  ];

  const t1 = Math.round(liveKRW * 1.05);
  const t2 = Math.round(liveKRW * 1.12);
  const t3 = detail.targetMeanKRW && detail.targetMeanKRW > liveKRW
    ? detail.targetMeanKRW
    : Math.round(liveKRW * 1.20);
  const t3pct = Math.round((t3 / liveKRW - 1) * 100);

  const profitTargets = [
    { percent: 5,    price: t1 },
    { percent: 12,   price: t2 },
    { percent: t3pct,price: t3 },
  ];

  const forecastBase = [
    { period: "1일",    multiplier: 1 + (detail.changePercent / 100 * 0.3) },
    { period: "7일",    multiplier: 1.01 },
    { period: "30일",   multiplier: 1.04 },
    { period: "3개월",  multiplier: 1.08 },
    { period: "180일",  multiplier: 1.12 },
    { period: "360일",  multiplier: detail.targetMeanKRW ? detail.targetMeanKRW / liveKRW : 1.20 },
    { period: "1800일", multiplier: 2.0 },
  ];
  const forecasts = forecastBase.map((f) => ({
    period: f.period,
    price: Math.round(liveKRW * f.multiplier),
    changePercent: Math.round((f.multiplier - 1) * 1000) / 10,
  }));

  const per = detail.per != null ? Math.round(detail.per * 10) / 10 : 0;
  const pbr = detail.pbr != null ? Math.round(detail.pbr * 100) / 100 : 0;
  const evaluation = evalFinancials(per || null, pbr || null, stub.market);

  const perStr   = per   > 0  ? `${per.toFixed(1)}배`   : "N/A";
  const pbrStr   = pbr   > 0  ? `${pbr.toFixed(2)}배`   : "N/A";
  const roeStr   = detail.roe != null ? `${detail.roe.toFixed(1)}%` : "N/A";
  const betaStr  = detail.beta != null ? `β ${detail.beta.toFixed(2)}` : "";
  const targetStr= detail.targetMeanKRW
    ? ` 애널리스트 평균 목표가 ₩${detail.targetMeanKRW.toLocaleString()}.` : "";

  const financials: FinancialAnalysis = {
    per,
    pbr,
    roe:           detail.roe           ?? 0,
    debtRatio:     detail.debtRatio     ?? 0,
    revenueGrowth: detail.revenueGrowth ?? 0,
    evaluation,
    summary: `${stub.name}: PER ${perStr}, PBR ${pbrStr}, ROE ${roeStr}${betaStr ? ", " + betaStr : ""}.${targetStr}`,
  };

  const dayFeatures = genDayFeatures(stub.market);
  const riskData = genRisk(stub, detail, pos);

  const recKey = detail.recommendationKey || "";
  const entryRec = recKey.includes("buy") || recKey.includes("strong")
    ? `${stub.name}에 대해 애널리스트들의 매수 의견이 우세합니다. 현재 ${pos} 구간 — 분할 진입 적극 고려.`
    : recKey.includes("sell")
    ? `애널리스트 매도 의견 우세. 리스크 관리 강화 및 신규 진입 자제 권장.`
    : `현재 ${pos} 구간. 30·30·40 분할 진입으로 리스크 분산. 1차 진입 후 추가 하락 시 2·3차 매수.`;

  return {
    ...stub,
    currentPrice: liveKRW,
    boxRange: { support: supportKRW, resistance: resistanceKRW, currentPosition: pos },
    splitEntries,
    profitTargets,
    forecasts,
    financials,
    dayFeatures,
    risk: {
      geopolitical:    riskData.geopolitical,
      technicalBounce: riskData.technicalBounce,
      strategy:        riskData.strategy,
    },
    witchDayStrategy:    riskData.witchDay,
    entryRecommendation: entryRec,
    description: stub.description.includes("탐색 탭")
      ? `${stub.name}(${stub.ticker}) — ${stub.themes[0]} 섹터. 52주 범위 ₩${supportKRW.toLocaleString()}~₩${resistanceKRW.toLocaleString()}, 현재 ${pos} 위치.`
      : stub.description,
  };
}
