import { Router } from "express";
import NodeCache from "node-cache";

const router = Router();

const KIS_BASE = "https://openapi.koreainvestment.com:9443";

// 토큰 캐시: appkey 기준 23시간 (KIS 토큰 만료 24h보다 1h 여유)
const tokenCache = new NodeCache({ stdTTL: 23 * 3600, checkperiod: 3600 });

// ─── 토큰 발급 (캐시 우선) ───────────────────────────────────────────────────
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

  const data = (await resp.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, data.access_token, 23 * 3600);
  return data.access_token;
}

// ─── KIS API 헬퍼 ──────────────────────────────────────────────────────────
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

// ─── 관심종목 전체 가져오기 ─────────────────────────────────────────────────
// POST /api/kis/watchlist
// body: { appkey, appsecret }
router.post("/kis/watchlist", async (req, res) => {
  const { appkey, appsecret } = req.body ?? {};
  if (!appkey || !appsecret) {
    return res.status(400).json({ error: "appkey와 appsecret이 필요합니다" });
  }

  try {
    const token = await getKisToken(appkey, appsecret);

    // 1. 관심종목 그룹 목록 조회
    const groupData = await kisGet(
      "/uapi/domestic-stock/v1/quotations/intstock-grouplist",
      "HHKST03900300",
      appkey, appsecret, token
    );

    const groups: { grp_no: string; grp_name: string }[] = groupData.output ?? [];

    if (groups.length === 0) {
      return res.json({ groups: [], totalCount: 0 });
    }

    // 2. 그룹별 종목 병렬 조회 (최적화)
    const stockResults = await Promise.allSettled(
      groups.map(async (g) => {
        const sd = await kisGet(
          "/uapi/domestic-stock/v1/quotations/intstock-stocklist",
          "HHKST03900400",
          appkey, appsecret, token,
          { grp_no: g.grp_no }
        );

        const stocks = (sd.output ?? []).map((s: any) => ({
          ticker:  s.stbd_cd,
          name:    s.stbd_name,
          // 6자리 종목코드로 KOSPI/KOSDAQ 추정
          market:  inferMarket(s.stbd_cd),
        }));

        return { grpNo: g.grp_no, grpName: g.grp_name, stocks };
      })
    );

    const result = stockResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    const totalCount = result.reduce((acc, g) => acc + g.stocks.length, 0);

    return res.json({ groups: result, totalCount });
  } catch (e: any) {
    // 토큰 오류 시 캐시 제거 후 재시도 가능하도록
    if (e.message?.includes("토큰") || e.message?.includes("401")) {
      tokenCache.del(`token:${appkey}`);
    }
    return res.status(500).json({ error: e.message ?? "KIS 연동 오류" });
  }
});

// ─── 토큰 유효성 확인 ────────────────────────────────────────────────────────
// POST /api/kis/verify
// body: { appkey, appsecret }
router.post("/kis/verify", async (req, res) => {
  const { appkey, appsecret } = req.body ?? {};
  if (!appkey || !appsecret) {
    return res.status(400).json({ error: "appkey와 appsecret이 필요합니다" });
  }

  try {
    tokenCache.del(`token:${appkey}`); // 강제 재발급으로 검증
    await getKisToken(appkey, appsecret);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(401).json({ error: e.message ?? "인증 실패" });
  }
});

// ─── KOSPI/KOSDAQ 추정 ──────────────────────────────────────────────────────
// 완벽하진 않지만 KRX 종목 코드 패턴 기반 근사
function inferMarket(code: string): "KOSPI" | "KOSDAQ" {
  if (!code || code.length !== 6) return "KOSPI";
  const n = parseInt(code, 10);
  // KOSDAQ 주요 대역: 0xxxxx 중 일부, 1xxxxx, 2xxxxx, 3xxxxx
  // 실제로는 KRX 마스터 파일이 필요하지만 근사값으로 처리
  if (
    (n >= 100000 && n < 200000) || // 코스닥 일부
    (n >= 200000 && n < 300000) || // 코스닥 일부
    (n >= 300000 && n < 400000)    // 코스닥 일부
  ) {
    return "KOSDAQ";
  }
  return "KOSPI";
}

export default router;
