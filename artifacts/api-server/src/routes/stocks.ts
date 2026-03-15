import { Router } from "express";
import YahooFinanceClass from "yahoo-finance2";

const router = Router();
const yahooFinance = new (YahooFinanceClass as any)({
  suppressNotices: ["yahooSurvey"],
});

// ─── TTL 캐시 (API 호출 제한 방지) ─────────────────────────────────────────
interface CacheEntry<T> { data: T; expiresAt: number }

class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    // 캐시 사이즈 200개 초과 시 오래된 항목 정리
    if (this.store.size > 200) {
      const now = Date.now();
      for (const [k, v] of this.store) {
        if (v.expiresAt < now) this.store.delete(k);
      }
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }
}

const TTL = {
  QUOTES:  30 * 1000,          // 30초 — 실시간 시세
  DETAIL:  5  * 60 * 1000,     // 5분  — 종목 상세 (재무)
  SCREEN:  10 * 60 * 1000,     // 10분 — 저평가 스크리닝
  NEWS:    15 * 60 * 1000,     // 15분 — 뉴스 감성
  HISTORY: 60 * 60 * 1000,     // 1시간 — 과거 OHLC (일봉)
  SEARCH:  5  * 60 * 1000,     // 5분  — 검색 결과
};

const quotesCache  = new TtlCache<any[]>();
const detailCache  = new TtlCache<any>();
const screenCache  = new TtlCache<any[]>();
const newsCache    = new TtlCache<any>();
const historyCache = new TtlCache<any>();
const searchCache  = new TtlCache<any[]>();

// ─────────────────────────────────────────────────────────────────────────────

function toYahooTicker(ticker: string, market: string): string {
  if (market === "KOSPI")  return `${ticker}.KS`;
  if (market === "KOSDAQ") return `${ticker}.KQ`;
  return ticker;
}

function classifyMarket(symbol: string, exchange: string): string {
  if (symbol.endsWith(".KS")) return "KOSPI";
  if (symbol.endsWith(".KQ")) return "KOSDAQ";
  const nasdaqExchanges = ["NMS", "NGM", "NCM"];
  if (nasdaqExchanges.includes(exchange)) return "NASDAQ";
  const nyseExchanges = ["NYQ", "PCX", "ASE", "BATS", "NYSEArca"];
  if (nyseExchanges.includes(exchange)) return "NYSE";
  return exchange;
}

function cleanTicker(symbol: string): string {
  if (symbol.endsWith(".KS") || symbol.endsWith(".KQ")) return symbol.slice(0, -3);
  return symbol;
}

// ─── 저평가 우량주 스크리닝 유니버스 (45종목) ────────────────────────────────
interface ScreenStock {
  ticker:    string;
  market:    "NASDAQ" | "KOSPI" | "KOSDAQ";
  name:      string;
  sector:    string;
  marketCap: string;
  basePer:   number | null;
  pbr:       number;
  basePrice: number;
}

// ─── Live USD/KRW rate cache (refreshes every 5 minutes) ───────────────────
let USD_KRW = 1450;
let usdKrwLastFetched = 0;
const USD_KRW_TTL = 5 * 60 * 1000;

async function getLiveUsdKrw(): Promise<number> {
  const now = Date.now();
  if (now - usdKrwLastFetched < USD_KRW_TTL) return USD_KRW;
  try {
    const q = await yahooFinance.quote("USDKRW=X");
    const rate = q?.regularMarketPrice;
    if (rate && rate > 100) {
      USD_KRW = Math.round(rate);
      usdKrwLastFetched = now;
    }
  } catch {}
  return USD_KRW;
}

const SCREEN_UNIVERSE: ScreenStock[] = [
  // ── NASDAQ ───────────────────────────────────────────────────────────────
  { ticker:"NVDA",  market:"NASDAQ", name:"엔비디아",           sector:"AI반도체/GPU",         marketCap:"6,400조", basePer:40,   pbr:38,  basePrice: Math.round(180*USD_KRW) },
  { ticker:"AAPL",  market:"NASDAQ", name:"애플",               sector:"IT/소비자전자",         marketCap:"2,900조", basePer:30,   pbr:40,  basePrice: Math.round(195*USD_KRW) },
  { ticker:"MSFT",  market:"NASDAQ", name:"마이크로소프트",      sector:"클라우드/AI/OS",        marketCap:"4,400조", basePer:32,   pbr:12,  basePrice: Math.round(410*USD_KRW) },
  { ticker:"AMZN",  market:"NASDAQ", name:"아마존",             sector:"이커머스/클라우드/AWS", marketCap:"2,800조", basePer:38,   pbr:8,   basePrice: Math.round(185*USD_KRW) },
  { ticker:"META",  market:"NASDAQ", name:"메타",               sector:"소셜미디어/AI/AR",      marketCap:"1,900조", basePer:26,   pbr:8,   basePrice: Math.round(520*USD_KRW) },
  { ticker:"TSLA",  market:"NASDAQ", name:"테슬라",             sector:"전기차/AI/에너지저장",  marketCap:"800조",   basePer:100,  pbr:12,  basePrice: Math.round(175*USD_KRW) },
  { ticker:"AMD",   market:"NASDAQ", name:"AMD",               sector:"CPU/GPU/AI반도체",     marketCap:"280조",   basePer:95,   pbr:4,   basePrice: Math.round(120*USD_KRW) },
  { ticker:"INTC",  market:"NASDAQ", name:"인텔",               sector:"CPU/파운드리",          marketCap:"130조",   basePer:25,   pbr:1.1, basePrice: Math.round(22*USD_KRW)  },
  { ticker:"QCOM",  market:"NASDAQ", name:"퀄컴",               sector:"모바일AP/RF반도체",     marketCap:"380조",   basePer:14,   pbr:5,   basePrice: Math.round(155*USD_KRW) },
  { ticker:"AVGO",  market:"NASDAQ", name:"브로드컴",           sector:"네트워크반도체/AI칩",   marketCap:"1,250조", basePer:35,   pbr:10,  basePrice: Math.round(185*USD_KRW) },
  { ticker:"MU",    market:"NASDAQ", name:"마이크론테크놀로지", sector:"DRAM/낸드플래시",       marketCap:"700조",   basePer:18,   pbr:2.5, basePrice: Math.round(90*USD_KRW)  },
  { ticker:"TXN",   market:"NASDAQ", name:"텍사스인스트루먼트", sector:"아날로그반도체",         marketCap:"350조",   basePer:30,   pbr:9,   basePrice: Math.round(220*USD_KRW) },
  { ticker:"ORCL",  market:"NASDAQ", name:"오라클",             sector:"클라우드DB/AI",         marketCap:"580조",   basePer:24,   pbr:18,  basePrice: Math.round(155*USD_KRW) },
  { ticker:"GOOGL", market:"NASDAQ", name:"알파벳 A",           sector:"AI/검색/클라우드",      marketCap:"5,400조", basePer:22,   pbr:6,   basePrice: Math.round(165*USD_KRW) },
  { ticker:"AMAT",  market:"NASDAQ", name:"어플라이드머티리얼즈",sector:"반도체 장비/식각",      marketCap:"450조",   basePer:20,   pbr:6,   basePrice: Math.round(160*USD_KRW) },
  { ticker:"LRCX",  market:"NASDAQ", name:"램리서치",           sector:"반도체 장비/세정",      marketCap:"300조",   basePer:22,   pbr:9,   basePrice: Math.round(220*USD_KRW) },
  { ticker:"MRVL",  market:"NASDAQ", name:"마벨테크놀로지",     sector:"네트워크반도체/AI칩",   marketCap:"350조",   basePer:55,   pbr:4,   basePrice: Math.round(55*USD_KRW)  },
  { ticker:"PYPL",  market:"NASDAQ", name:"페이팔",             sector:"핀테크/간편결제",       marketCap:"200조",   basePer:15,   pbr:3,   basePrice: Math.round(60*USD_KRW)  },
  { ticker:"IONQ",  market:"NASDAQ", name:"아이온큐",           sector:"양자컴퓨팅",            marketCap:"10조",    basePer:null, pbr:6,   basePrice: Math.round(20*USD_KRW)  },
  { ticker:"SNDK",  market:"NASDAQ", name:"샌디스크",           sector:"낸드플래시/SSD",        marketCap:"200조",   basePer:15,   pbr:2,   basePrice: Math.round(60*USD_KRW)  },
  { ticker:"EONR",  market:"NASDAQ", name:"이온R",              sector:"에너지저장/배터리",     marketCap:"5조",     basePer:null, pbr:2,   basePrice: Math.round(8*USD_KRW)   },
  // ── KOSPI ────────────────────────────────────────────────────────────────
  { ticker:"005930", market:"KOSPI", name:"삼성전자",   sector:"반도체/스마트폰/가전",   marketCap:"1,090조", basePer:12,  pbr:1.1, basePrice:80000  },
  { ticker:"000660", market:"KOSPI", name:"SK하이닉스", sector:"DRAM/HBM/AI메모리",     marketCap:"1,080조", basePer:8,   pbr:2,   basePrice:150000 },
  { ticker:"005380", market:"KOSPI", name:"현대차",     sector:"전기차/자율주행/SDV",   marketCap:"520조",   basePer:5,   pbr:0.7, basePrice:200000 },
  { ticker:"012450", market:"KOSPI", name:"한화에어로", sector:"방산/우주발사체/엔진",   marketCap:"350조",   basePer:35,  pbr:8,   basePrice:600000 },
  { ticker:"034020", market:"KOSPI", name:"두산에너빌", sector:"원자력/터빈/SMR",        marketCap:"120조",   basePer:20,  pbr:2,   basePrice:100000 },
  { ticker:"207940", market:"KOSPI", name:"삼성바이오",  sector:"바이오CDMO/위탁생산",   marketCap:"670조",   basePer:50,  pbr:7,   basePrice:900000 },
  { ticker:"068270", market:"KOSPI", name:"셀트리온",    sector:"바이오시밀러/항체",     marketCap:"220조",   basePer:30,  pbr:3,   basePrice:180000 },
  { ticker:"051910", market:"KOSPI", name:"LG화학",      sector:"전지재료/석유화학",     marketCap:"250조",   basePer:20,  pbr:1.2, basePrice:350000 },
  { ticker:"006400", market:"KOSPI", name:"삼성SDI",     sector:"2차전지/전기차배터리",  marketCap:"270조",   basePer:18,  pbr:1.5, basePrice:400000 },
  { ticker:"003550", market:"KOSPI", name:"LG",           sector:"지주/전자/화학/에너지",marketCap:"120조",   basePer:8,   pbr:0.8, basePrice:80000  },
  { ticker:"028260", market:"KOSPI", name:"삼성물산",    sector:"건설/패션/바이오지주",  marketCap:"250조",   basePer:15,  pbr:0.9, basePrice:180000 },
  { ticker:"000270", market:"KOSPI", name:"기아",         sector:"전기차/PBV/글로벌시장",marketCap:"320조",   basePer:5,   pbr:0.7, basePrice:80000  },
  { ticker:"105560", market:"KOSPI", name:"KB금융",       sector:"은행지주/보험/카드",    marketCap:"250조",   basePer:7,   pbr:0.6, basePrice:90000  },
  { ticker:"055550", market:"KOSPI", name:"신한지주",    sector:"은행지주/글로벌금융",   marketCap:"220조",   basePer:6,   pbr:0.5, basePrice:55000  },
  // ── KOSDAQ ───────────────────────────────────────────────────────────────
  { ticker:"247540", market:"KOSDAQ", name:"에코프로비엠",   sector:"양극재/전기차배터리",  marketCap:"100조",   basePer:30,  pbr:5,   basePrice:150000 },
  { ticker:"357780", market:"KOSDAQ", name:"솔브레인",       sector:"반도체소재/식각액",    marketCap:"15조",    basePer:15,  pbr:2,   basePrice:300000 },
  { ticker:"039030", market:"KOSDAQ", name:"이오테크닉스",   sector:"레이저장비/반도체",    marketCap:"4조",     basePer:20,  pbr:2.5, basePrice:120000 },
  { ticker:"086520", market:"KOSDAQ", name:"에코프로",       sector:"양극재지주/배터리",    marketCap:"80조",    basePer:35,  pbr:6,   basePrice:80000  },
  { ticker:"036460", market:"KOSDAQ", name:"한국가스공사",   sector:"LNG/수소인프라",       marketCap:"8조",     basePer:10,  pbr:0.7, basePrice:40000  },
  { ticker:"196170", market:"KOSDAQ", name:"알테오젠",       sector:"피하주사플랫폼/바이오",marketCap:"12조",    basePer:null,pbr:15,  basePrice:200000 },
  { ticker:"032820", market:"KOSDAQ", name:"우리기술",       sector:"원전계측/소형주",      marketCap:"0.3조",   basePer:null,pbr:1,   basePrice:24000  },
  { ticker:"257720", market:"KOSDAQ", name:"실리콘투",       sector:"K뷰티수출/플랫폼",     marketCap:"0.8조",   basePer:10,  pbr:1.5, basePrice:30000  },
  { ticker:"214150", market:"KOSDAQ", name:"클래시스",       sector:"의료미용/HIFU",        marketCap:"3조",     basePer:20,  pbr:3,   basePrice:50000  },
  { ticker:"028300", market:"KOSDAQ", name:"HLB",            sector:"항암신약/리보세라닙",  marketCap:"2조",     basePer:null,pbr:3,   basePrice:30000  },
];

// 저평가 기준 (시장별)
const UV_CRITERIA: Record<string, { maxPer: number; maxPbr: number }> = {
  NASDAQ: { maxPer: 25,  maxPbr: 5   },
  KOSPI:  { maxPer: 12,  maxPbr: 1.2 },
  KOSDAQ: { maxPer: 15,  maxPbr: 2.5 },
};

// ─────────────────────────────────────────────────────────────────────────────

router.get("/stocks/quotes", async (req, res) => {
  const raw = (req.query.items as string) ?? "";
  const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return res.json([]);

  const cacheKey = items.slice().sort().join(",");
  const cached = quotesCache.get(cacheKey);
  if (cached) return res.json(cached);

  const parsed = items.map((item) => {
    const [ticker, market = "NASDAQ"] = item.split(":");
    return { ticker, market, yahooTicker: toYahooTicker(ticker, market) };
  });

  const liveRate = await getLiveUsdKrw();

  try {
    const results = await Promise.all(
      parsed.map(async (p) => {
        try {
          const q = await yahooFinance.quote(p.yahooTicker);
          const priceKRW =
            p.market === "KOSPI" || p.market === "KOSDAQ"
              ? q.regularMarketPrice ?? 0
              : Math.round((q.regularMarketPrice ?? 0) * liveRate);
          return {
            ticker:        p.ticker,
            market:        p.market,
            price:         q.regularMarketPrice ?? 0,
            priceKRW,
            changePercent: q.regularMarketChangePercent ?? 0,
            change:        q.regularMarketChange ?? 0,
            volume:        q.regularMarketVolume ?? 0,
            high:          q.regularMarketDayHigh ?? 0,
            low:           q.regularMarketDayLow ?? 0,
            high52w:       q.fiftyTwoWeekHigh ?? 0,
            low52w:        q.fiftyTwoWeekLow ?? 0,
            avgVolume10d:  q.averageDailyVolume10Day ?? 0,
            fiftyDayAvg:   q.fiftyDayAverage ?? 0,
            prevClose:     q.regularMarketPreviousClose ?? 0,
            currency:      q.currency ?? "USD",
            name:          q.shortName ?? q.longName ?? p.ticker,
            ok:            true,
          };
        } catch {
          return { ticker: p.ticker, market: p.market, ok: false };
        }
      })
    );
    quotesCache.set(cacheKey, results, TTL.QUOTES);
    return res.json(results);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

router.get("/stocks/search", async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const mkt = (req.query.market as string) ?? "ALL";
  if (q.length < 1) return res.json([]);

  const cacheKey = `${q.toLowerCase()}:${mkt}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const result = await yahooFinance.search(q, {
      quotesCount: 40,
      newsCount: 0,
    });

    let quotes = (result.quotes as any[])
      .filter((r) => r.quoteType === "EQUITY" && r.symbol)
      .map((r) => {
        const market = classifyMarket(r.symbol, r.exchange ?? "");
        return {
          ticker:      cleanTicker(r.symbol),
          yahooTicker: r.symbol,
          name:        r.shortname ?? r.longname ?? r.symbol,
          market,
          exchange:    r.exchDisp ?? r.exchange ?? "",
        };
      });

    if (mkt !== "ALL") {
      quotes = quotes.filter((q) => q.market === mkt);
    }

    searchCache.set(cacheKey, quotes, TTL.SEARCH);
    return res.json(quotes);
  } catch (e: any) {
    if (e?.message?.includes("Invalid Search Query") || e?.message?.includes("BadRequest")) {
      return res.json([]);
    }
    return res.status(500).json({ error: String(e) });
  }
});

// ─── 저평가 우량주 스크리닝 ───────────────────────────────────────────────────
router.get("/stocks/screen", async (req, res) => {
  const market = (req.query.market as string) ?? "ALL";

  const cached = screenCache.get(market);
  if (cached) return res.json(cached);

  const liveRate = await getLiveUsdKrw();

  const candidates = SCREEN_UNIVERSE.filter(
    (s) => market === "ALL" || s.market === market
  );

  const results = await Promise.allSettled(
    candidates.map(async (c) => {
      const yt = toYahooTicker(c.ticker, c.market);
      const q  = await yahooFinance.quote(yt);

      const livePrice = q.regularMarketPrice ?? 0;
      const priceKRW  =
        c.market === "KOSPI" || c.market === "KOSDAQ"
          ? livePrice
          : Math.round(livePrice * liveRate);
      const changePercent = q.regularMarketChangePercent ?? 0;

      let currentPer: number | null = null;
      if (c.basePer !== null && c.basePrice > 0) {
        currentPer = parseFloat(((priceKRW * c.basePer) / c.basePrice).toFixed(1));
      }

      const crit = UV_CRITERIA[c.market];
      const perOk   = currentPer === null || currentPer < crit.maxPer;
      const pbrOk   = c.pbr < crit.maxPbr;
      const isUndervalued = perOk && pbrOk;

      const perScore = currentPer !== null ? currentPer / crit.maxPer : 0.5;
      const pbrScore = c.pbr / crit.maxPbr;
      const score    = parseFloat(((perScore + pbrScore) / 2).toFixed(3));

      return {
        ticker:       c.ticker,
        market:       c.market,
        name:         c.name,
        sector:       c.sector,
        marketCap:    c.marketCap,
        livePrice,
        priceKRW,
        changePercent: parseFloat(changePercent.toFixed(2)),
        currentPer,
        pbr:          c.pbr,
        isUndervalued,
        score,
        currency:     q.currency ?? (c.market === "NASDAQ" ? "USD" : "KRW"),
      };
    })
  );

  const undervalued = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((s) => s.isUndervalued)
    .sort((a, b) => a.score - b.score);

  screenCache.set(market, undervalued, TTL.SCREEN);
  return res.json(undervalued);
});

// ─── 종목 상세 재무/애널리스트 데이터 ─────────────────────────────────────────
router.get("/stocks/detail", async (req, res) => {
  const ticker = (req.query.ticker as string) ?? "";
  const market = (req.query.market as string) ?? "NASDAQ";
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const cacheKey = `${ticker}:${market}`;
  const cached = detailCache.get(cacheKey);
  if (cached) return res.json(cached);

  const yahooTicker = toYahooTicker(ticker, market);
  const isKorean = market === "KOSPI" || market === "KOSDAQ";
  const liveRate = await getLiveUsdKrw();

  try {
    const [summary, rawQuote] = await Promise.all([
      yahooFinance.quoteSummary(yahooTicker, {
        modules: ["defaultKeyStatistics", "financialData", "summaryDetail", "price"],
      }).catch(() => null),
      yahooFinance.quote(yahooTicker).catch(() => null),
    ]);

    const q = rawQuote as any;
    const fd = (summary as any)?.financialData ?? {};
    const ks = (summary as any)?.defaultKeyStatistics ?? {};
    const sd = (summary as any)?.summaryDetail ?? {};
    const pr = (summary as any)?.price ?? {};

    const currentPrice: number = q?.regularMarketPrice ?? 0;
    const priceKRW: number = isKorean ? currentPrice : Math.round(currentPrice * liveRate);
    const high52w: number = q?.fiftyTwoWeekHigh ?? 0;
    const low52w: number  = q?.fiftyTwoWeekLow  ?? 0;
    const high52wKRW: number = isKorean ? high52w : Math.round(high52w * liveRate);
    const low52wKRW: number  = isKorean ? low52w  : Math.round(low52w  * liveRate);

    const per: number | null          = sd?.trailingPE ?? null;
    const forwardPer: number | null   = sd?.forwardPE  ?? ks?.forwardEpsNtm != null ? null : null;
    const pbr: number | null          = ks?.priceToBook ?? null;
    const roeRaw: number | null       = fd?.returnOnEquity ?? null;
    const roe: number | null          = roeRaw != null ? Math.round(roeRaw * 1000) / 10 : null;
    const debtEq: number | null       = fd?.debtToEquity ?? null;
    const debtRatio: number | null    = debtEq != null ? Math.round(debtEq * 10) / 10 : null;
    const revGrowthRaw: number | null = fd?.revenueGrowth ?? null;
    const revenueGrowth: number | null = revGrowthRaw != null ? Math.round(revGrowthRaw * 1000) / 10 : null;

    const targetMean: number | null    = fd?.targetMeanPrice  ?? null;
    const targetHigh: number | null    = fd?.targetHighPrice  ?? null;
    const targetLow: number | null     = fd?.targetLowPrice   ?? null;
    const targetMeanKRW: number | null = targetMean ? (isKorean ? Math.round(targetMean) : Math.round(targetMean * liveRate)) : null;

    const beta: number | null          = sd?.beta ?? ks?.beta ?? null;
    const changePercent: number        = q?.regularMarketChangePercent ?? 0;
    const prevClose: number            = q?.regularMarketPreviousClose ?? 0;
    const name: string                 = pr?.shortName ?? q?.shortName ?? ticker;
    const recommendationKey: string    = fd?.recommendationKey ?? "";

    const payload = {
      ticker, market, name, currentPrice, priceKRW,
      high52w, low52w, high52wKRW, low52wKRW,
      changePercent, prevClose,
      per, forwardPer, pbr, roe, debtRatio, revenueGrowth,
      targetMean, targetMeanKRW, targetHigh, targetLow,
      beta, recommendationKey,
    };

    detailCache.set(cacheKey, payload, TTL.DETAIL);
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// ─── 뉴스 + 감성 분석 ─────────────────────────────────────────────────────────
const POS_WORDS = [
  "gain","rise","surge","beat","record","strong","up","bull","positive","outperform",
  "revenue","profit","growth","upgrade","buy","higher","rally","breakout","soar","boost",
  "상승","급등","호재","성장","이익","매수","상향","돌파","신고가","실적 개선",
];
const NEG_WORDS = [
  "fall","drop","decline","miss","loss","down","bear","sell","weak","underperform",
  "cut","warning","recall","lawsuit","downgrade","plunge","crash","lower","risk",
  "하락","급락","악재","손실","매도","하향","경고","리스크","적자","폭락",
];

function analyzeSentiment(title: string): "호재" | "악재" | "중립" {
  const text = (title ?? "").toLowerCase();
  let pos = 0, neg = 0;
  for (const w of POS_WORDS) if (text.includes(w)) pos++;
  for (const w of NEG_WORDS) if (text.includes(w)) neg++;
  if (pos > neg) return "호재";
  if (neg > pos) return "악재";
  return "중립";
}

router.get("/stocks/news", async (req, res) => {
  const ticker = (req.query.ticker as string) ?? "";
  const market  = (req.query.market  as string) ?? "NASDAQ";
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const cacheKey = `${ticker}:${market}`;
  const cached = newsCache.get(cacheKey);
  if (cached) return res.json(cached);

  const yahooTicker = toYahooTicker(ticker, market);
  try {
    const result = await yahooFinance.search(yahooTicker, {
      newsCount: 10,
      quotesCount: 0,
      enableNavLinks: false,
    }).catch(() => ({ news: [] }));

    const news = ((result as any).news ?? []).map((n: any) => ({
      title:       n.title ?? "",
      publisher:   n.publisher ?? "",
      link:        n.link ?? "",
      publishedAt: n.providerPublishTime
        ? (typeof n.providerPublishTime === "number"
            ? n.providerPublishTime * 1000
            : new Date(n.providerPublishTime).getTime())
        : null,
      sentiment:   analyzeSentiment(n.title ?? ""),
    }));

    const payload = { ticker, market, news };
    newsCache.set(cacheKey, payload, TTL.NEWS);
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// ─── 과거 주가 데이터 (백테스팅용) ─────────────────────────────────────────────
const PERIOD_DAYS: Record<string, number> = { "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365 };

router.get("/stocks/history", async (req, res) => {
  const ticker = (req.query.ticker as string) ?? "";
  const market  = (req.query.market  as string) ?? "NASDAQ";
  const period  = (req.query.period  as string) ?? "6mo";
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const cacheKey = `${ticker}:${market}:${period}`;
  const cached = historyCache.get(cacheKey);
  if (cached) return res.json(cached);

  const yahooTicker = toYahooTicker(ticker, market);
  const isKorean = market === "KOSPI" || market === "KOSDAQ";
  const days = PERIOD_DAYS[period] ?? 180;
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const liveRate = await getLiveUsdKrw();

  try {
    const period2 = new Date();
    const raw = await yahooFinance.historical(yahooTicker, {
      period1: period1.toISOString().split("T")[0],
      period2: period2.toISOString().split("T")[0],
    }).catch(() => []);

    const data = (raw as any[])
      .filter((d: any) => d.close != null)
      .map((d: any) => ({
        date:   (d.date instanceof Date ? d.date : new Date(d.date)).toISOString().split("T")[0],
        open:   isKorean ? Math.round(d.open)  : Math.round(d.open  * liveRate),
        high:   isKorean ? Math.round(d.high)  : Math.round(d.high  * liveRate),
        low:    isKorean ? Math.round(d.low)   : Math.round(d.low   * liveRate),
        close:  isKorean ? Math.round(d.close) : Math.round(d.close * liveRate),
        volume: d.volume ?? 0,
      }));

    const payload = { ticker, market, period, data };
    historyCache.set(cacheKey, payload, TTL.HISTORY);
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
