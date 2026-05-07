/**
 * 한국 트레이더가 흔히 쓰는 한글 종목명 → 영문 티커 매핑.
 * 카탈로그에 없는 미국 종목을 한글로 검색했을 때 NASDAQ·NYSE 결과를 잡기 위함.
 *
 * 규모: 시총·관심도 상위 ~120개. 사용자 추가 요청 들어오면 점진 확장.
 */

export const KOREAN_TO_TICKER: Record<string, string> = {
  // ── AI / 빅테크 ──────────────────────────────────────────────
  엔비디아:     "NVDA",
  애플:         "AAPL",
  마이크로소프트: "MSFT",
  마소:         "MSFT",
  구글:         "GOOGL",
  알파벳:       "GOOGL",
  아마존:       "AMZN",
  메타:         "META",
  페이스북:     "META",
  테슬라:       "TSLA",
  넷플릭스:     "NFLX",
  오라클:       "ORCL",
  세일즈포스:   "CRM",
  어도비:       "ADBE",
  IBM:          "IBM",
  ASML:         "ASML",
  팔란티어:     "PLTR",
  스노우플레이크:"SNOW",
  데이터독:     "DDOG",
  서비스나우:   "NOW",
  쇼피파이:     "SHOP",
  우버:         "UBER",
  에어비엔비:   "ABNB",

  // ── 반도체 ────────────────────────────────────────────────
  AMD:          "AMD",
  인텔:         "INTC",
  TSMC:         "TSM",
  TSM:          "TSM",
  마이크론:     "MU",
  브로드컴:     "AVGO",
  퀄컴:         "QCOM",
  텍사스인스트루먼트: "TXN",
  ARM:          "ARM",
  암:           "ARM",
  마벨:         "MRVL",
  AMAT:         "AMAT",
  어플라이드머티리얼즈: "AMAT",
  램리서치:     "LRCX",
  KLA:          "KLAC",
  웨스턴디지털: "WDC",
  샌디스크:     "SNDK",
  씨게이트:     "STX",

  // ── 전기차·모빌리티 ───────────────────────────────────────
  리비안:       "RIVN",
  루시드:       "LCID",
  포드:         "F",
  GM:           "GM",
  제너럴모터스: "GM",
  스텔란티스:   "STLA",

  // ── 금융 ──────────────────────────────────────────────────
  JP모건:       "JPM",
  버크셔:       "BRK.B",
  뱅크오브아메리카: "BAC",
  골드만삭스:   "GS",
  모건스탠리:   "MS",
  웰스파고:     "WFC",
  비자:         "V",
  마스터카드:   "MA",
  페이팔:       "PYPL",
  블록:         "SQ",
  스퀘어:       "SQ",
  코인베이스:   "COIN",
  로빈후드:     "HOOD",
  슈왑:         "SCHW",
  블랙록:       "BLK",

  // ── 헬스케어 ──────────────────────────────────────────────
  존슨앤존슨:   "JNJ",
  화이자:       "PFE",
  머크:         "MRK",
  애브비:       "ABBV",
  일라이릴리:   "LLY",
  릴리:         "LLY",
  노보노디스크: "NVO",
  유나이티드헬스: "UNH",
  암젠:         "AMGN",
  길리어드:     "GILD",

  // ── 소비재·리테일 ─────────────────────────────────────────
  월마트:       "WMT",
  코스트코:     "COST",
  홈디포:       "HD",
  로우스:       "LOW",
  타겟:         "TGT",
  나이키:       "NKE",
  스타벅스:     "SBUX",
  맥도날드:     "MCD",
  코카콜라:     "KO",
  펩시:         "PEP",
  "P&G":        "PG",
  프록터앤갬블: "PG",

  // ── 에너지·원전·방산 ──────────────────────────────────────
  엑손모빌:     "XOM",
  엑슨:         "XOM",
  쉐브론:       "CVX",
  슐럼버거:     "SLB",
  록히드마틴:   "LMT",
  RTX:          "RTX",
  레이시온:     "RTX",
  보잉:         "BA",
  노스롭그루먼: "NOC",
  제너럴다이내믹스: "GD",
  팔란티어PLTR: "PLTR",
  BWXT:         "BWXT",
  GE버노바:     "GEV",
  GEV:          "GEV",
  컨스털레이션: "CEG",
  넥스트에라:   "NEE",
  비스트라:     "VST",

  // ── 산업·물류 ────────────────────────────────────────────
  캐터필러:     "CAT",
  디어:         "DE",
  존디어:       "DE",
  허니웰:       "HON",
  유니언퍼시픽: "UNP",
  UPS:          "UPS",
  페덱스:       "FDX",

  // ── 미디어·통신 ──────────────────────────────────────────
  디즈니:       "DIS",
  컴캐스트:     "CMCSA",
  "AT&T":       "T",
  버라이즌:     "VZ",
  T모바일:      "TMUS",

  // ── ETF·인덱스 ───────────────────────────────────────────
  SPY:          "SPY",
  QQQ:          "QQQ",
  IWM:          "IWM",
  VTI:          "VTI",
  나스닥100:    "QQQ",
  "S&P500":     "SPY",
  러셀:         "IWM",

  // ── 양자·신성장 ──────────────────────────────────────────
  IonQ:         "IONQ",
  아이온큐:     "IONQ",
  리게티:       "RGTI",
  D웨이브:      "QBTS",
  슈퍼마이크로: "SMCI",
  델:           "DELL",
  HPE:          "HPE",
  버티브:       "VRT",
  코어위브:     "CRWV",
};

/**
 * 한글 또는 별칭으로 들어온 query를 영문 티커로 변환.
 * 매칭 실패 시 null. 대소문자·공백 무시.
 */
export function aliasLookup(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const [alias, ticker] of Object.entries(KOREAN_TO_TICKER)) {
    if (alias.toLowerCase() === q) return ticker;
  }
  return null;
}

/** 부분 매칭 — 사용자가 "엔비디" 까지만 입력했을 때도 NVDA 후보 노출. */
export function aliasPrefixMatches(query: string): Array<{ alias: string; ticker: string }> {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const out: Array<{ alias: string; ticker: string }> = [];
  for (const [alias, ticker] of Object.entries(KOREAN_TO_TICKER)) {
    if (alias.toLowerCase().includes(q)) out.push({ alias, ticker });
  }
  return out.slice(0, 10);
}
