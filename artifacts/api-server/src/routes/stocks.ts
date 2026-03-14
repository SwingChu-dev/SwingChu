import { Router } from "express";
import YahooFinanceClass from "yahoo-finance2";

const router = Router();
const yahooFinance = new (YahooFinanceClass as any)({
  suppressNotices: ["yahooSurvey"],
});

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
  basePrice: number; // KRW 기준 참조가격 (동적 PER 계산용)
}

const USD_KRW = 1450;

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
  { ticker:"IONQ",  market:"NASDAQ", name:"아이온큐",           sector:"양자컴퓨팅",            marketCap:"10조",    basePer:null, pbr:4,   basePrice: Math.round(33*USD_KRW)  },
  { ticker:"SNDK",  market:"NASDAQ", name:"샌디스크",           sector:"낸드플래시/스토리지",   marketCap:"30조",    basePer:18,   pbr:2,   basePrice: Math.round(45*USD_KRW)  },
  // ── KOSPI ────────────────────────────────────────────────────────────────
  { ticker:"005930", market:"KOSPI", name:"삼성전자",          sector:"반도체/가전/디스플레이", marketCap:"1,097조", basePer:13,   pbr:1.3, basePrice:59800  },
  { ticker:"000660", market:"KOSPI", name:"SK하이닉스",        sector:"DRAM/HBM/낸드",         marketCap:"660조",   basePer:8,    pbr:1.6, basePrice:190000 },
  { ticker:"005490", market:"KOSPI", name:"POSCO홀딩스",       sector:"철강/이차전지소재",      marketCap:"28조",    basePer:6,    pbr:0.4, basePrice:300000 },
  { ticker:"005380", market:"KOSPI", name:"현대차",            sector:"완성차/전기차/수소",     marketCap:"34조",    basePer:6,    pbr:0.5, basePrice:210000 },
  { ticker:"012450", market:"KOSPI", name:"한화에어로스페이스", sector:"방산/우주항공/엔진",    marketCap:"20조",    basePer:22,   pbr:2,   basePrice:400000 },
  { ticker:"034020", market:"KOSPI", name:"두산에너빌리티",    sector:"원전/가스터빈/수소",     marketCap:"8조",     basePer:15,   pbr:1.0, basePrice:22000  },
  { ticker:"105560", market:"KOSPI", name:"KB금융",            sector:"은행/보험/증권",         marketCap:"30조",    basePer:5,    pbr:0.45,basePrice:80000  },
  { ticker:"055550", market:"KOSPI", name:"신한지주",          sector:"은행/보험/카드",         marketCap:"25조",    basePer:6,    pbr:0.47,basePrice:50000  },
  { ticker:"086790", market:"KOSPI", name:"하나금융지주",      sector:"은행/증권/보험",         marketCap:"15조",    basePer:5,    pbr:0.42,basePrice:60000  },
  { ticker:"316140", market:"KOSPI", name:"우리금융지주",      sector:"은행/카드/캐피탈",       marketCap:"8조",     basePer:4,    pbr:0.35,basePrice:15000  },
  { ticker:"035420", market:"KOSPI", name:"NAVER",             sector:"검색/웹툰/쇼핑/클라우드",marketCap:"27조",    basePer:25,   pbr:2,   basePrice:170000 },
  { ticker:"009540", market:"KOSPI", name:"HD한국조선해양",    sector:"LNG선/조선/해양플랜트", marketCap:"20조",    basePer:10,   pbr:1.5, basePrice:200000 },
  { ticker:"015760", market:"KOSPI", name:"한국전력",          sector:"전력/에너지/그리드",     marketCap:"13조",    basePer:null, pbr:0.3, basePrice:20000  },
  { ticker:"032830", market:"KOSPI", name:"삼성생명",          sector:"생명보험/자산관리",      marketCap:"12조",    basePer:8,    pbr:0.5, basePrice:90000  },
  { ticker:"051910", market:"KOSPI", name:"LG화학",            sector:"배터리소재/석유화학",    marketCap:"19조",    basePer:20,   pbr:0.9, basePrice:250000 },
  // ── KOSDAQ ───────────────────────────────────────────────────────────────
  { ticker:"196170", market:"KOSDAQ", name:"알테오젠",         sector:"피하주사플랫폼/바이오",  marketCap:"12조",    basePer:null, pbr:15,  basePrice:200000 },
  { ticker:"032820", market:"KOSDAQ", name:"우리기술",         sector:"원전계측/소형주",        marketCap:"0.3조",   basePer:null, pbr:1,   basePrice:24000  },
  { ticker:"080320", market:"KOSDAQ", name:"제주반도체",       sector:"메모리반도체/DRAM",      marketCap:"0.3조",   basePer:18,   pbr:2.1, basePrice:6200   },
  { ticker:"257720", market:"KOSDAQ", name:"실리콘투",         sector:"K뷰티수출/플랫폼",       marketCap:"0.8조",   basePer:10,   pbr:1.5, basePrice:30000  },
  { ticker:"214150", market:"KOSDAQ", name:"클래시스",         sector:"의료미용/HIFU",          marketCap:"3조",     basePer:20,   pbr:3,   basePrice:50000  },
  { ticker:"028300", market:"KOSDAQ", name:"HLB",              sector:"항암신약/리보세라닙",    marketCap:"2조",     basePer:null, pbr:3,   basePrice:30000  },
  { ticker:"336570", market:"KOSDAQ", name:"원텍",             sector:"의료미용레이저",          marketCap:"0.3조",   basePer:20,   pbr:2.5, basePrice:15000  },
  { ticker:"293490", market:"KOSDAQ", name:"카카오게임즈",     sector:"모바일게임/IP",          marketCap:"1조",     basePer:25,   pbr:1.5, basePrice:16000  },
  { ticker:"068760", market:"KOSDAQ", name:"셀트리온제약",     sector:"바이오시밀러/의약품",    marketCap:"3조",     basePer:20,   pbr:2,   basePrice:100000 },
  { ticker:"091990", market:"KOSDAQ", name:"셀트리온헬스케어", sector:"바이오시밀러유통",       marketCap:"5조",     basePer:25,   pbr:3,   basePrice:70000  },
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

  const parsed = items.map((item) => {
    const [ticker, market = "NASDAQ"] = item.split(":");
    return { ticker, market, yahooTicker: toYahooTicker(ticker, market) };
  });

  try {
    const results = await Promise.all(
      parsed.map(async (p) => {
        try {
          const q = await yahooFinance.quote(p.yahooTicker);
          const priceKRW =
            p.market === "KOSPI" || p.market === "KOSDAQ"
              ? q.regularMarketPrice ?? 0
              : Math.round((q.regularMarketPrice ?? 0) * USD_KRW);
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
    return res.json(results);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

router.get("/stocks/search", async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const mkt = (req.query.market as string) ?? "ALL";
  if (q.length < 1) return res.json([]);

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
          : Math.round(livePrice * USD_KRW);
      const changePercent = q.regularMarketChangePercent ?? 0;

      // 동적 PER: 현재가 기준으로 재계산 (기준가 대비 가격 변화 반영)
      let currentPer: number | null = null;
      if (c.basePer !== null && c.basePrice > 0) {
        currentPer = parseFloat(((priceKRW * c.basePer) / c.basePrice).toFixed(1));
      }

      const crit = UV_CRITERIA[c.market];
      const perOk   = currentPer === null || currentPer < crit.maxPer;
      const pbrOk   = c.pbr < crit.maxPbr;
      const isUndervalued = perOk && pbrOk;

      // 저평가 점수 (낮을수록 더 저평가)
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

  return res.json(undervalued);
});

// ─── 종목 상세 재무/애널리스트 데이터 ─────────────────────────────────────────
router.get("/stocks/detail", async (req, res) => {
  const ticker = (req.query.ticker as string) ?? "";
  const market = (req.query.market as string) ?? "NASDAQ";
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const yahooTicker = toYahooTicker(ticker, market);
  const isKorean = market === "KOSPI" || market === "KOSDAQ";

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
    const priceKRW: number = isKorean ? currentPrice : Math.round(currentPrice * USD_KRW);
    const high52w: number = q?.fiftyTwoWeekHigh ?? 0;
    const low52w: number  = q?.fiftyTwoWeekLow  ?? 0;
    const high52wKRW: number = isKorean ? high52w : Math.round(high52w * USD_KRW);
    const low52wKRW: number  = isKorean ? low52w  : Math.round(low52w  * USD_KRW);

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
    const targetMeanKRW: number | null = targetMean ? (isKorean ? Math.round(targetMean) : Math.round(targetMean * USD_KRW)) : null;

    const beta: number | null          = sd?.beta ?? ks?.beta ?? null;
    const changePercent: number        = q?.regularMarketChangePercent ?? 0;
    const prevClose: number            = q?.regularMarketPreviousClose ?? 0;
    const name: string                 = pr?.shortName ?? q?.shortName ?? ticker;
    const recommendationKey: string    = fd?.recommendationKey ?? "";

    return res.json({
      ticker, market, name, currentPrice, priceKRW,
      high52w, low52w, high52wKRW, low52wKRW,
      changePercent, prevClose,
      per, forwardPer, pbr, roe, debtRatio, revenueGrowth,
      targetMean, targetMeanKRW, targetHigh, targetLow,
      beta, recommendationKey,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
