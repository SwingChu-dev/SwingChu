import { LiveQuote } from "@/context/StockPriceContext";

export type BoxPosition = "저점권" | "중간권" | "고점권";

interface BoxRangeLike {
  support: number;
  resistance: number;
  currentPosition: string;
}

/**
 * 52주 고가/저가를 기반으로 박스권 위치를 동적 계산한다.
 *
 * - 라이브 데이터 있는 경우: 52주 범위 내 현재가 위치로 판단
 *   · 하위 30% 이하  → 저점권
 *   · 상위 30% 이상  → 고점권
 *   · 그 외          → 중간권
 * - 52주 데이터 없는 경우: stockData 정적 currentPosition 반환
 */
export function calcBoxPosition(
  boxRange: BoxRangeLike,
  quote: LiveQuote | null
): BoxPosition {
  if (!quote || !quote.ok) {
    return boxRange.currentPosition as BoxPosition;
  }

  const nativePrice = quote.price;
  const low52w      = quote.low52w  ?? 0;
  const high52w     = quote.high52w ?? 0;

  if (nativePrice > 0 && low52w > 0 && high52w > low52w) {
    const range = high52w - low52w;
    const pct   = (nativePrice - low52w) / range;
    if (pct <= 0.30) return "저점권";
    if (pct >= 0.70) return "고점권";
    return "중간권";
  }

  return boxRange.currentPosition as BoxPosition;
}
