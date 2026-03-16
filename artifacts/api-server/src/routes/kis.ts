import { Router } from "express";
import NodeCache from "node-cache";

const router = Router();

const KIS_BASE = "https://openapi.koreainvestment.com:9443";

// ─── 토큰 캐시: appkey 기준 23시간 ────────────────────────────────────────────
const tokenCache = new NodeCache({ stdTTL: 23 * 3600, checkperiod: 3600 });

async function getKisToken(appkey: string, appsecret: string): Promise<string> {
  const cacheKey = `token:${appkey}`;
  const cached = tokenCache.get<string>(cacheKey);
  if (cached) return cached;

  const resp = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", appkey, appsecret }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`KIS 토큰 발급 실패 (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as { access_token: string };
  tokenCache.set(cacheKey, data.access_token, 23 * 3600);
  return data.access_token;
}

async function kisGet(
  path: string,
  trId: string,
  appkey: string,
  appsecret: string,
  token: string,
  params: Record<string, string> = {}
): Promise<any> {
  const url = new URL(`${KIS_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const resp = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
      appkey,
      appsecret,
      tr_id: trId,
      custtype: "P",
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`KIS API 오류 (${resp.status}): ${txt}`);
  }

  return resp.json();
}

// ─── 서버 사이드 KIS 자격증명 ──────────────────────────────────────────────────
const SERVER_APPKEY    = process.env.KIS_APPKEY    ?? "";
const SERVER_APPSECRET = process.env.KIS_APPSECRET ?? "";

export function hasServerKis(): boolean {
  return !!(SERVER_APPKEY && SERVER_APPSECRET);
}

async function getServerToken(): Promise<string> {
  return getKisToken(SERVER_APPKEY, SERVER_APPSECRET);
}

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface DomQuote {
  close: number; open: number; high: number; low: number;
  volume: number; changePercent: number; change: number;
  prevClose: number; high52w: number; low52w: number;
}

export interface OvQuote {
  close: number; open: number; high: number; low: number;
  volume: number; changePercent: number; change: number;
  prevClose: number; high52w: number; low52w: number;
}

export interface Bar {
  date: string; open: number; high: number; low: number; close: number; volume: number;
}

// ─── 해외주식 거래소 코드 ────────────────────────────────────────────────────
export function getExcd(market: string): string {
  if (market === "NYSE")  return "NYS";
  if (market === "AMEX")  return "AMS";
  return "NAS"; // NASDAQ default
}

// ─── 국내주식 현재가 (단건) ───────────────────────────────────────────────────
export async function kisDomesticQuote(ticker: string): Promise<DomQuote | null> {
  if (!hasServerKis()) return null;
  try {
    const token = await getServerToken();
    const data  = await kisGet(
      "/uapi/domestic-stock/v1/quotations/inquire-price",
      "FHKST01010100",
      SERVER_APPKEY, SERVER_APPSECRET, token,
      { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: ticker }
    );
    const o = data?.output;
    if (!o || !o.stck_prpr) return null;
    return {
      close:         parseInt(o.stck_prpr  || "0", 10),
      open:          parseInt(o.stck_oprc  || "0", 10),
      high:          parseInt(o.stck_hgpr  || "0", 10),
      low:           parseInt(o.stck_lwpr  || "0", 10),
      volume:        parseInt(o.acml_vol   || "0", 10),
      change:        parseInt(o.prdy_vrss  || "0", 10),
      changePercent: parseFloat(o.prdy_ctrt || "0"),
      prevClose:     parseInt(o.stck_sdpr  || o.prdy_clpr || "0", 10),
      high52w:       parseInt(o.w52_hgpr   || "0", 10),
      low52w:        parseInt(o.w52_lwpr   || "0", 10),
    };
  } catch { return null; }
}

// ─── 국내주식 현재가 (배치) — KIS는 건별 조회이므로 병렬 처리 ─────────────────
export async function kisDomesticMultiQuote(
  tickers: string[]
): Promise<Record<string, DomQuote>> {
  if (!hasServerKis() || tickers.length === 0) return {};
  const results: Record<string, DomQuote> = {};
  // KIS 국내 rate limit: 20 req/sec → 60ms 간격
  const DELAY = 60;
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    if (i > 0) await new Promise(r => setTimeout(r, DELAY));
    const q = await kisDomesticQuote(ticker);
    if (q) results[ticker] = q;
  }
  return results;
}

// ─── 국내주식 일봉 차트 ───────────────────────────────────────────────────────
export async function kisDomesticHistory(ticker: string, days: number): Promise<Bar[]> {
  if (!hasServerKis()) return [];
  try {
    const token = await getServerToken();
    const endDate   = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

    const data = await kisGet(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-chartprice",
      "FHKST03010100",
      SERVER_APPKEY, SERVER_APPSECRET, token,
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD:         ticker,
        FID_INPUT_DATE_1:       fmt(startDate),
        FID_INPUT_DATE_2:       fmt(endDate),
        FID_PERIOD_DIV_CODE:    "D",
      }
    );

    const rows: any[] = data?.output2 ?? [];
    return rows
      .filter(r => r.stck_bsop_date && r.stck_clpr)
      .map(r => ({
        date:   `${r.stck_bsop_date.slice(0,4)}-${r.stck_bsop_date.slice(4,6)}-${r.stck_bsop_date.slice(6,8)}`,
        open:   parseInt(r.stck_oprc || "0", 10),
        high:   parseInt(r.stck_hgpr || "0", 10),
        low:    parseInt(r.stck_lwpr || "0", 10),
        close:  parseInt(r.stck_clpr || "0", 10),
        volume: parseInt(r.acml_vol  || "0", 10),
      }))
      .filter(r => r.close > 0)
      .reverse();
  } catch { return []; }
}

// ─── 해외주식 현재가 (단건) ───────────────────────────────────────────────────
export async function kisOverseasQuote(ticker: string, excd: string): Promise<OvQuote | null> {
  if (!hasServerKis()) return null;
  try {
    const token = await getServerToken();
    const data  = await kisGet(
      "/uapi/overseas-price/v1/quotations/price",
      "HHDFS00000300",
      SERVER_APPKEY, SERVER_APPSECRET, token,
      { AUTH: "", EXCD: excd, SYMB: ticker }
    );
    const o = data?.output;
    if (!o || !o.last) return null;
    const close = parseFloat(o.last || "0");
    return {
      close,
      open:          parseFloat(o.open  || "0"),
      high:          parseFloat(o.high  || "0"),
      low:           parseFloat(o.low   || "0"),
      volume:        parseInt(o.tvol    || "0", 10),
      change:        parseFloat(o.diff  || "0"),
      changePercent: parseFloat(o.rate  || "0"),
      prevClose:     parseFloat(o.base  || "0"),
      high52w:       parseFloat(o.h52p  || "0"),
      low52w:        parseFloat(o.l52p  || "0"),
    };
  } catch { return null; }
}

// ─── 해외주식 현재가 (배치) — KIS 해외 rate limit: 1 req/sec ─────────────────
export async function kisOverseasMultiQuote(
  pairs: { ticker: string; excd: string }[]
): Promise<Record<string, OvQuote>> {
  if (!hasServerKis() || pairs.length === 0) return {};
  const results: Record<string, OvQuote> = {};
  for (let i = 0; i < pairs.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 150)); // 1 req/sec 준수
    const { ticker, excd } = pairs[i];
    const q = await kisOverseasQuote(ticker, excd);
    if (q) results[ticker] = q;
  }
  return results;
}

// ─── 해외주식 일봉 ─────────────────────────────────────────────────────────────
export async function kisOverseasHistory(ticker: string, excd: string, days: number): Promise<Bar[]> {
  if (!hasServerKis()) return [];
  try {
    const token = await getServerToken();
    const data  = await kisGet(
      "/uapi/overseas-price/v1/quotations/dailyprice",
      "HHDFS76240000",
      SERVER_APPKEY, SERVER_APPSECRET, token,
      { AUTH: "", EXCD: excd, SYMB: ticker, GUBN: "0", BYMD: "", MODP: "0" }
    );
    const rows: any[] = data?.output2 ?? [];
    return rows
      .filter(r => r.xymd && r.clos)
      .map(r => ({
        date:   `${r.xymd.slice(0,4)}-${r.xymd.slice(4,6)}-${r.xymd.slice(6,8)}`,
        open:   parseFloat(r.open || "0"),
        high:   parseFloat(r.high || "0"),
        low:    parseFloat(r.low  || "0"),
        close:  parseFloat(r.clos || "0"),
        volume: parseInt(r.tvol   || "0", 10),
      }))
      .filter(r => r.close > 0)
      .slice(0, days)  // 최근 days개 한정
      .reverse();
  } catch { return []; }
}

// ─── 국내주식 투자자별 매매동향 (기관/외국인 순매수) ─────────────────────────
export interface InvestorFlow {
  institutionalNet: number;   // 기관 순매수 (주, + 매수 - 매도)
  foreignerNet: number;       // 외국인 순매수
  institutionalBuy: number;
  institutionalSell: number;
  foreignerBuy: number;
  foreignerSell: number;
}

export async function kisDomesticInvestorFlow(ticker: string): Promise<InvestorFlow | null> {
  if (!hasServerKis()) return null;
  try {
    const token = await getServerToken();
    const data  = await kisGet(
      "/uapi/domestic-stock/v1/quotations/inquire-investor",
      "FHKST01010900",
      SERVER_APPKEY, SERVER_APPSECRET, token,
      { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: ticker }
    );
    const o = data?.output;
    if (!o) return null;
    return {
      institutionalNet:  parseInt(o.orgn_ntby_qty  || o.ttal_orgn_ntby_qty || "0", 10),
      foreignerNet:      parseInt(o.frgn_ntby_qty  || "0", 10),
      institutionalBuy:  parseInt(o.orgn_buy_qty   || "0", 10),
      institutionalSell: parseInt(o.orgn_sell_qty  || "0", 10),
      foreignerBuy:      parseInt(o.frgn_buy_qty   || "0", 10),
      foreignerSell:     parseInt(o.frgn_sell_qty  || "0", 10),
    };
  } catch { return null; }
}

// ─── USD/KRW 환율 (해외주식 시세 활용) ────────────────────────────────────────
let kisUsdKrwCache = 0;
let kisUsdKrwTime  = 0;
const KIS_FX_TTL   = 5 * 60 * 1000;

export async function kisUsdKrw(): Promise<number> {
  if (Date.now() - kisUsdKrwTime < KIS_FX_TTL && kisUsdKrwCache > 0) return kisUsdKrwCache;
  if (!hasServerKis()) return 1450;
  try {
    const token = await getServerToken();
    const data  = await kisGet(
      "/uapi/overseas-price/v1/quotations/price",
      "HHDFS00000300",
      SERVER_APPKEY, SERVER_APPSECRET, token,
      { AUTH: "", EXCD: "FX", SYMB: "USDKRW" }
    );
    const rate = parseFloat(data?.output?.last || "0");
    if (rate > 100) {
      kisUsdKrwCache = Math.round(rate);
      kisUsdKrwTime  = Date.now();
    }
  } catch {}
  return kisUsdKrwCache || 1450;
}

// ─────────────────────────────────────────────────────────────────────────────
// 사용자 KIS 연동 엔드포인트 (기존 유지)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/kis/watchlist", async (req, res) => {
  const { appkey, appsecret } = req.body ?? {};
  if (!appkey || !appsecret) {
    return res.status(400).json({ error: "appkey와 appsecret이 필요합니다" });
  }

  try {
    const token = await getKisToken(appkey, appsecret);

    const groupData = await kisGet(
      "/uapi/domestic-stock/v1/quotations/intstock-grouplist",
      "HHKST03900300",
      appkey, appsecret, token
    );

    const groups: { grp_no: string; grp_name: string }[] = groupData.output ?? [];
    if (groups.length === 0) return res.json({ groups: [], totalCount: 0 });

    const stockResults = await Promise.allSettled(
      groups.map(async (g) => {
        const sd = await kisGet(
          "/uapi/domestic-stock/v1/quotations/intstock-stocklist",
          "HHKST03900400",
          appkey, appsecret, token,
          { grp_no: g.grp_no }
        );
        const stocks = (sd.output ?? []).map((s: any) => ({
          ticker: s.stbd_cd,
          name:   s.stbd_name,
          market: inferMarket(s.stbd_cd),
        }));
        return { grpNo: g.grp_no, grpName: g.grp_name, stocks };
      })
    );

    const result = stockResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    return res.json({ groups: result, totalCount: result.reduce((a, g) => a + g.stocks.length, 0) });
  } catch (e: any) {
    if (e.message?.includes("토큰") || e.message?.includes("401")) {
      tokenCache.del(`token:${appkey}`);
    }
    return res.status(500).json({ error: e.message ?? "KIS 연동 오류" });
  }
});

router.post("/kis/verify", async (req, res) => {
  const { appkey, appsecret } = req.body ?? {};
  if (!appkey || !appsecret) {
    return res.status(400).json({ error: "appkey와 appsecret이 필요합니다" });
  }
  try {
    tokenCache.del(`token:${appkey}`);
    await getKisToken(appkey, appsecret);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(401).json({ error: e.message ?? "인증 실패" });
  }
});

// ─── 서버 KIS 상태 확인 ──────────────────────────────────────────────────────
router.get("/kis/server-status", (_req, res) => {
  res.json({ configured: hasServerKis() });
});

function inferMarket(code: string): "KOSPI" | "KOSDAQ" {
  if (!code || code.length !== 6) return "KOSPI";
  const n = parseInt(code, 10);
  if ((n >= 100000 && n < 400000)) return "KOSDAQ";
  return "KOSPI";
}

export default router;
