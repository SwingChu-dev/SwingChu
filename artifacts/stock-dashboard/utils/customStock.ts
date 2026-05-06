/**
 * Yahoo 검색으로 추가한 카탈로그 외 종목용 stub StockInfo 빌더.
 * 풍부한 필드(splitEntries, financials 등)는 빈 값으로 두고, 종목 상세 진입 시
 * EnrichmentContext가 lazy하게 채움.
 */
import type { StockInfo, Market, MarketRegion, FinancialAnalysis, RiskInfo, BoxRange } from "@/constants/stockData";

export interface CustomStockInput {
  ticker:   string;
  name:     string;
  market:   "NASDAQ" | "KOSPI" | "KOSDAQ" | "NYSE";
  currency: "USD" | "KRW";
}

const EMPTY_FINANCIALS: FinancialAnalysis = {
  per: null,
  pbr: null,
  roe: 0,
  debtRatio: 0,
  revenueGrowth: 0,
  evaluation: "성장주",
  summary: "데이터 없음 — 종목 상세에서 자동 분석을 시도하세요.",
};

const EMPTY_RISK: RiskInfo = {
  geopolitical:    "",
  technicalBounce: "",
  strategy:        "",
};

const EMPTY_BOX: BoxRange = {
  support:         0,
  resistance:      0,
  currentPosition: "중간권",
};

function regionOf(market: CustomStockInput["market"]): MarketRegion {
  return market === "KOSPI" || market === "KOSDAQ" ? "국내장" : "미국장";
}

function normalizedMarket(market: CustomStockInput["market"]): Market {
  // StockInfo.market은 NASDAQ/KOSPI/KOSDAQ만 허용 → NYSE는 NASDAQ으로 통일
  return market === "NYSE" ? "NASDAQ" : market;
}

export function buildCustomStockStub(input: CustomStockInput): StockInfo {
  const id = `${input.ticker.toLowerCase()}_${input.market.toLowerCase()}`;
  return {
    id,
    name:                input.name,
    ticker:              input.ticker,
    market:              normalizedMarket(input.market),
    region:              regionOf(input.market),
    grade:               "성장주",
    themes:              [],
    currentPrice:        0,
    currency:            input.currency,
    description:         "",
    splitEntries:        [],
    profitTargets:       [],
    boxRange:            EMPTY_BOX,
    forecasts:           [],
    financials:          EMPTY_FINANCIALS,
    dayFeatures:         [],
    risk:                EMPTY_RISK,
    witchDayStrategy:    "",
    entryRecommendation: "",
  };
}
