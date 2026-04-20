import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { computeMarket, MarketSnapshot } from "@/services/portfolioMarket";

/**
 * 라이브 시세 + 자동 USD/KRW 환율을 결합한 포트폴리오 평가 스냅샷.
 * 환율은 StockPriceContext가 30초마다 야후에서 자동 갱신 (실패 시 settings 값 사용).
 */
export function usePortfolioMarket(): MarketSnapshot {
  const { positions, settings } = usePortfolio();
  const { quotes, usdKrw }      = useStockPrice();

  const fxRate = usdKrw && usdKrw > 100 ? usdKrw : settings.fxRateUSDKRW;

  return useMemo(
    () => computeMarket(
      positions, quotes, fxRate,
      settings.cashBalanceKRW, settings.cashBalanceUSD,
    ),
    [positions, quotes, fxRate, settings.cashBalanceKRW, settings.cashBalanceUSD],
  );
}
