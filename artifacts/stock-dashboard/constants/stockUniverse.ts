export type UniverseMarket = "NASDAQ" | "KOSPI" | "KOSDAQ";

export interface UniverseStock {
  id: string;
  name: string;
  nameEn: string;
  ticker: string;
  market: UniverseMarket;
  sector: string;
  currentPrice: number;
  marketCap: string;
}

export const PREDEFINED_IDS = new Set([
  "nvda","googl","orcl","ionq","sandisk","eon",
  "samsung","skhynix","hanwha","hyundai","doosan","woritech",
]);
