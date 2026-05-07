/**
 * 차트 패턴 감지 — 규칙 기반. 외부 호출 0, OHLC 봉 데이터로 계산.
 *
 * 검출 항목:
 *   - 박스권 (좁은 횡보)
 *   - 눌림목 (상승 추세 중 일시 하락)
 *   - 상승추세 / 하락추세 (MA 정·역배열)
 *   - 추세전환_강세 / 약세 (MA5 × MA20 cross)
 *   - 혼조 (위 어디에도 안 맞음)
 */

export interface OHLCBar {
  date:   string;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export type PatternKind =
  | "박스권"
  | "눌림목"
  | "상승추세"
  | "하락추세"
  | "추세전환_강세"
  | "추세전환_약세"
  | "혼조";

export interface DetectedPattern {
  kind:       PatternKind;
  confidence: "low" | "medium" | "high";
  detail:     string;
  evidence:   string;
}

function sma(closes: number[], period: number, offset = 0): number | null {
  if (closes.length < period + offset) return null;
  const slice = closes.slice(closes.length - period - offset, closes.length - offset);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * 메인 감지 함수. 봉이 부족하면 빈 배열 반환.
 * 우선순위가 높은 패턴이 앞에 옴 (추세전환 > 박스권 > 눌림목 > 추세 > 혼조).
 */
export function detectPatterns(bars: OHLCBar[]): DetectedPattern[] {
  if (bars.length < 60) return [];

  const closes = bars.map((b) => b.close);
  const highs  = bars.map((b) => b.high);
  const lows   = bars.map((b) => b.low);

  const ma5     = sma(closes, 5);
  const ma20    = sma(closes, 20);
  const ma60    = sma(closes, 60);
  const ma5Prev = sma(closes, 5, 3);
  const ma20Prev= sma(closes, 20, 3);
  if (ma5 == null || ma20 == null || ma60 == null || ma5Prev == null || ma20Prev == null) return [];

  const last = closes[closes.length - 1];
  const recent20High = Math.max(...highs.slice(-20));
  const recent20Low  = Math.min(...lows.slice(-20));
  const mid          = (recent20High + recent20Low) / 2;
  const widthPct     = ((recent20High - recent20Low) / mid) * 100;

  const ma20Slope = ((ma20 - ma20Prev) / ma20Prev) * 100;
  const isMa20FlatRising = ma20Slope >= -0.3;
  const isMa20Rising     = ma20Slope >  0.5;
  const isMa20Falling    = ma20Slope < -0.5;

  const out: DetectedPattern[] = [];

  // ── 1. 추세전환 (최우선) — MA5 × MA20 cross 최근 3봉 ──
  const crossedUp   = ma5 > ma20  && ma5Prev <= ma20Prev;
  const crossedDown = ma5 < ma20  && ma5Prev >= ma20Prev;
  if (crossedUp) {
    out.push({
      kind: "추세전환_강세",
      confidence: ma60 < ma20 ? "high" : "medium",
      detail: "MA5 > MA20 골든크로스 — 단기 상승 모멘텀 진입.",
      evidence: `MA5 ${ma5.toFixed(2)} ↑ MA20 ${ma20.toFixed(2)}`,
    });
  } else if (crossedDown) {
    out.push({
      kind: "추세전환_약세",
      confidence: ma60 > ma20 ? "high" : "medium",
      detail: "MA5 < MA20 데드크로스 — 단기 약세 시그널, 사이즈 축소.",
      evidence: `MA5 ${ma5.toFixed(2)} ↓ MA20 ${ma20.toFixed(2)}`,
    });
  }

  // ── 2. 박스권 — 좁은 폭 + MA20 거의 평탄 ──
  if (widthPct < 5 && Math.abs(ma20Slope) < 0.5) {
    const conf: DetectedPattern["confidence"] = widthPct < 3 ? "high" : "medium";
    out.push({
      kind: "박스권",
      confidence: conf,
      detail: `최근 20봉 좁은 횡보 — 지지 ${recent20Low.toFixed(2)} / 저항 ${recent20High.toFixed(2)}. 박스 매매 (지지 근접 진입, 저항 근접 익절).`,
      evidence: `폭 ${widthPct.toFixed(1)}% · MA20 기울기 ${ma20Slope.toFixed(2)}%`,
    });
  }

  // ── 3. 눌림목 — 상승 추세 + 현재가 < MA20 + 5봉 단기 저점 ──
  const recent5Lows = lows.slice(-5);
  const isLocalLow  = recent5Lows[recent5Lows.length - 1] === Math.min(...recent5Lows);
  if (isMa20Rising && last < ma20 && isLocalLow) {
    out.push({
      kind: "눌림목",
      confidence: ma60 < ma20 ? "high" : "medium",
      detail: `상승 추세 중 일시 하락 — MA20 부근 분할 진입 검토. 손절 라인 5봉 저점(${Math.min(...recent5Lows).toFixed(2)}) 아래.`,
      evidence: `MA20 우상향(+${ma20Slope.toFixed(2)}%) · 현재가가 MA20 -${(((ma20 - last) / ma20) * 100).toFixed(1)}%`,
    });
  }

  // ── 4. 상승/하락 추세 (정·역배열) ──
  if (out.length === 0) {
    if (ma5 > ma20 && ma20 > ma60 && isMa20Rising) {
      out.push({
        kind: "상승추세",
        confidence: ma20Slope > 1.5 ? "high" : "medium",
        detail: "정배열 + MA20 우상향 — 추세 추종 매매 우호.",
        evidence: `MA5 ${ma5.toFixed(2)} > MA20 ${ma20.toFixed(2)} > MA60 ${ma60.toFixed(2)}`,
      });
    } else if (ma5 < ma20 && ma20 < ma60 && isMa20Falling) {
      out.push({
        kind: "하락추세",
        confidence: ma20Slope < -1.5 ? "high" : "medium",
        detail: "역배열 + MA20 우하향 — 신규 진입 자제, 보유 종목 손절선 점검.",
        evidence: `MA5 ${ma5.toFixed(2)} < MA20 ${ma20.toFixed(2)} < MA60 ${ma60.toFixed(2)}`,
      });
    }
  }

  // ── 5. 혼조 ──
  if (out.length === 0) {
    out.push({
      kind: "혼조",
      confidence: "low",
      detail: "뚜렷한 패턴 없음. 추세·박스 어느 쪽도 명확하지 않아 진입 자제 권장.",
      evidence: `MA20 기울기 ${ma20Slope.toFixed(2)}% · 20봉 폭 ${widthPct.toFixed(1)}%`,
    });
  }

  return out;
}
