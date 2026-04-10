/**
 * 한국투자증권 Open API 제공자
 * KIS_APPKEY / KIS_APPSECRET 환경변수가 설정된 경우에만 활성화됩니다.
 * 미설정 시 isAvailable() → false, 모든 fetch 함수는 null 반환 → Yahoo Finance 폴백.
 */

const KIS_URL = "https://openapi.koreainvestment.com:9443";

// ── 종목별 거래소 코드 매핑 (NYSE 상장 종목 명시, 나머지 NASDAQ) ───────────
const NYSE_TICKERS = new Set([
  "XOM","CVX","BAC","WMT","JPM","JNJ","PG","KO","PFE","XLE","WFC","BRK","GS",
  "GEV","BWXT","LMT",
]);

function exchangeCode(ticker: string): string {
  if (NYSE_TICKERS.has(ticker.toUpperCase())) return "NYS";
  return "NAS"; // 기본: NASDAQ
}

// ── 액세스 토큰 캐시 (24시간) ─────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiry = 0;

export function isAvailable(): boolean {
  return !!(process.env.KIS_APPKEY && process.env.KIS_APPSECRET);
}


async function getToken(): Promise<string | null> {
  if (!isAvailable()) return null;
  if (_token && Date.now() < _tokenExpiry) return _token;

  try {
    const res = await fetch(`${KIS_URL}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey:     process.env.KIS_APPKEY,
        appsecret:  process.env.KIS_APPSECRET,
      }),
    });
    const json = await res.json() as any;
    if (!json.access_token) {
      console.error("[KIS] 토큰 발급 실패:", json.error_description ?? JSON.stringify(json));
      return null;
    }
    _token = json.access_token;
    // 만료 기준: 23시간 후 (1시간 여유)
    _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    console.log("[KIS] 액세스 토큰 발급 성공");
    return _token;
  } catch (e) {
    console.error("[KIS] 토큰 요청 오류:", e);
    return null;
  }
}

// ── 공통 요청 헬퍼 ────────────────────────────────────────────────────────
async function kisGet(path: string, trId: string, params: Record<string, string>): Promise<any | null> {
  const token = await getToken();
  if (!token) return null;

  const url = new URL(`${KIS_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type":  "application/json",
        "authorization": `Bearer ${token}`,
        "appkey":        process.env.KIS_APPKEY!,
        "appsecret":     process.env.KIS_APPSECRET!,
        "tr_id":         trId,
      },
    });
    const json = await res.json() as any;
    // rt_cd === "0" 은 정상
    if (json.rt_cd !== "0") {
      // 토큰 만료 시 재시도 1회
      if (json.msg_cd === "EGW00123" || json.msg_cd === "EGW00121") {
        _token = null; _tokenExpiry = 0;
        return null; // 다음 호출에서 갱신
      }
      return null;
    }
    return json;
  } catch (e) {
    return null;
  }
}

// ── 국내 주식 현재가 ─────────────────────────────────────────────────────
export interface KisKrQuote {
  price:         number;
  change:        number;
  changePercent: number;
  volume:        number;
  open:          number;
  high:          number;
  low:           number;
  prevClose:     number;
  high52w:       number;
  low52w:        number;
}

export async function fetchKisKrQuote(ticker: string): Promise<KisKrQuote | null> {
  const json = await kisGet(
    "/uapi/domestic-stock/v1/quotations/inquire-price",
    "FHKST01010100",
    { fid_cond_mrkt_div_code: "J", fid_input_iscd: ticker }
  );
  if (!json?.output) return null;
  const o = json.output;
  const price = parseInt(o.stck_prpr ?? "0", 10);
  if (!price) return null;
  return {
    price,
    change:        parseInt(o.prdy_vrss   ?? "0", 10),
    changePercent: parseFloat(o.prdy_ctrt  ?? "0"),
    volume:        parseInt(o.acml_vol    ?? "0", 10),
    open:          parseInt(o.stck_oprc   ?? "0", 10),
    high:          parseInt(o.stck_hgpr   ?? "0", 10),
    low:           parseInt(o.stck_lwpr   ?? "0", 10),
    prevClose:     parseInt(o.stck_sdpr   ?? "0", 10),
    high52w:       parseInt(o.stck_mxpr   ?? "0", 10),
    low52w:        parseInt(o.stck_mnpr   ?? "0", 10),
  };
}

// ── 해외 주식 현재가 ─────────────────────────────────────────────────────
export interface KisUsQuote {
  price:         number;
  change:        number;
  changePercent: number;
  volume:        number;
  open:          number;
  high:          number;
  low:           number;
  prevClose:     number;
  high52w:       number;
  low52w:        number;
}

export async function fetchKisUsQuote(ticker: string): Promise<KisUsQuote | null> {
  const excd = exchangeCode(ticker);
  const json = await kisGet(
    "/uapi/overseas-stock/v1/quotations/price",
    "HHDFS00000300",
    { AUTH: "", EXCD: excd, SYMB: ticker }
  );
  if (!json?.output) return null;
  const o = json.output;
  const price = parseFloat(o.last ?? "0");
  if (!price) return null;
  return {
    price,
    change:        parseFloat(o.diff  ?? "0"),
    changePercent: parseFloat(o.rate  ?? "0"),
    volume:        parseInt(o.tvol    ?? "0", 10),
    open:          parseFloat(o.open  ?? "0"),
    high:          parseFloat(o.high  ?? "0"),
    low:           parseFloat(o.low   ?? "0"),
    prevClose:     parseFloat(o.base  ?? "0"),
    high52w:       parseFloat(o.h52p  ?? "0"),
    low52w:        parseFloat(o.l52p  ?? "0"),
  };
}

// ── 국내 복수 종목 병렬 조회 (동시 최대 5개, 100ms 속도 제한) ──────────────
export async function fetchKisKrBatch(
  tickers: string[]
): Promise<Record<string, KisKrQuote>> {
  const result: Record<string, KisKrQuote> = {};
  const BATCH = 5;
  for (let i = 0; i < tickers.length; i += BATCH) {
    const chunk = tickers.slice(i, i + BATCH);
    await Promise.allSettled(chunk.map(async t => {
      const q = await fetchKisKrQuote(t);
      if (q) result[t] = q;
    }));
    if (i + BATCH < tickers.length) await new Promise(r => setTimeout(r, 100));
  }
  return result;
}

// ── 해외 복수 종목 병렬 조회 (동시 최대 5개, 100ms 속도 제한) ──────────────
export async function fetchKisUsBatch(
  tickers: string[]
): Promise<Record<string, KisUsQuote>> {
  const result: Record<string, KisUsQuote> = {};
  const BATCH = 5;
  for (let i = 0; i < tickers.length; i += BATCH) {
    const chunk = tickers.slice(i, i + BATCH);
    await Promise.allSettled(chunk.map(async t => {
      const q = await fetchKisUsQuote(t);
      if (q) result[t] = q;
    }));
    if (i + BATCH < tickers.length) await new Promise(r => setTimeout(r, 100));
  }
  return result;
}
