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

// ─── Yahoo Finance 기반 한국 주식 헬퍼 (.KS/.KQ 심볼) ───────────────────────
interface KrQuote {
  close: number; open: number; high: number; low: number;
  volume: number; changePercent: number; change: number;
  prevClose: number; high52w: number; low52w: number; date: string;
}

async function yahooKrQuote(ticker: string, market: string): Promise<KrQuote | null> {
  const yt = toYahooTicker(ticker, market);
  try {
    const q = await (yahooFinance as any).quote(yt);
    if (!q || !q.regularMarketPrice) return null;
    return {
      close:         q.regularMarketPrice ?? 0,
      open:          q.regularMarketOpen ?? 0,
      high:          q.regularMarketDayHigh ?? 0,
      low:           q.regularMarketDayLow ?? 0,
      volume:        q.regularMarketVolume ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      change:        q.regularMarketChange ?? 0,
      prevClose:     q.regularMarketPreviousClose ?? 0,
      high52w:       q.fiftyTwoWeekHigh ?? 0,
      low52w:        q.fiftyTwoWeekLow ?? 0,
      date:          new Date().toISOString().split("T")[0],
    };
  } catch { return null; }
}

async function yahooKrMultiQuote(
  pairs: { ticker: string; market: string }[]
): Promise<Record<string, KrQuote>> {
  const result: Record<string, KrQuote> = {};
  await Promise.allSettled(
    pairs.map(async ({ ticker, market }) => {
      const q = await yahooKrQuote(ticker, market);
      if (q) result[ticker] = q;
    })
  );
  return result;
}

async function yahooKrHistory(
  ticker: string, market: string, days: number
): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
  const yt = toYahooTicker(ticker, market);
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const period2 = new Date().toISOString().split("T")[0];
  try {
    const raw = await (yahooFinance as any).historical(yt, { period1, period2 }).catch(() => []);
    return (raw as any[])
      .filter((d: any) => d.close != null)
      .map((d: any) => ({
        date:   (d.date instanceof Date ? d.date : new Date(d.date)).toISOString().split("T")[0],
        open:   Math.round(d.open   ?? 0),
        high:   Math.round(d.high   ?? 0),
        low:    Math.round(d.low    ?? 0),
        close:  Math.round(d.close  ?? 0),
        volume: d.volume ?? 0,
      }));
  } catch { return []; }
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
  { ticker:"NVDA",  market:"NASDAQ", name:"엔비디아",            sector:"AI반도체/GPU",           marketCap:"6,400조", basePer:40,   pbr:38,  basePrice: Math.round(180*USD_KRW) },
  { ticker:"AAPL",  market:"NASDAQ", name:"애플",                sector:"IT/소비자전자",           marketCap:"2,900조", basePer:30,   pbr:40,  basePrice: Math.round(195*USD_KRW) },
  { ticker:"MSFT",  market:"NASDAQ", name:"마이크로소프트",       sector:"클라우드/AI/OS",          marketCap:"4,400조", basePer:32,   pbr:12,  basePrice: Math.round(410*USD_KRW) },
  { ticker:"AMZN",  market:"NASDAQ", name:"아마존",              sector:"이커머스/클라우드/AWS",   marketCap:"2,800조", basePer:38,   pbr:8,   basePrice: Math.round(185*USD_KRW) },
  { ticker:"META",  market:"NASDAQ", name:"메타",                sector:"소셜미디어/AI/AR",        marketCap:"1,900조", basePer:26,   pbr:8,   basePrice: Math.round(520*USD_KRW) },
  { ticker:"TSLA",  market:"NASDAQ", name:"테슬라",              sector:"전기차/AI/에너지저장",    marketCap:"800조",   basePer:100,  pbr:12,  basePrice: Math.round(175*USD_KRW) },
  { ticker:"AMD",   market:"NASDAQ", name:"AMD",                sector:"CPU/GPU/AI반도체",       marketCap:"280조",   basePer:95,   pbr:4,   basePrice: Math.round(120*USD_KRW) },
  { ticker:"INTC",  market:"NASDAQ", name:"인텔",                sector:"CPU/파운드리",            marketCap:"130조",   basePer:25,   pbr:1.1, basePrice: Math.round(22*USD_KRW)  },
  { ticker:"QCOM",  market:"NASDAQ", name:"퀄컴",                sector:"모바일AP/RF반도체",       marketCap:"380조",   basePer:14,   pbr:5,   basePrice: Math.round(155*USD_KRW) },
  { ticker:"AVGO",  market:"NASDAQ", name:"브로드컴",            sector:"네트워크반도체/AI칩",     marketCap:"1,250조", basePer:35,   pbr:10,  basePrice: Math.round(185*USD_KRW) },
  { ticker:"MU",    market:"NASDAQ", name:"마이크론테크놀로지",  sector:"DRAM/낸드플래시",         marketCap:"700조",   basePer:18,   pbr:2.5, basePrice: Math.round(90*USD_KRW)  },
  { ticker:"TXN",   market:"NASDAQ", name:"텍사스인스트루먼트",  sector:"아날로그반도체",           marketCap:"350조",   basePer:30,   pbr:9,   basePrice: Math.round(220*USD_KRW) },
  { ticker:"ORCL",  market:"NASDAQ", name:"오라클",              sector:"클라우드DB/AI",           marketCap:"580조",   basePer:24,   pbr:18,  basePrice: Math.round(155*USD_KRW) },
  { ticker:"GOOGL", market:"NASDAQ", name:"알파벳 A",            sector:"AI/검색/클라우드",        marketCap:"5,400조", basePer:22,   pbr:6,   basePrice: Math.round(165*USD_KRW) },
  { ticker:"AMAT",  market:"NASDAQ", name:"어플라이드머티리얼즈",sector:"반도체 장비/식각",         marketCap:"450조",   basePer:20,   pbr:6,   basePrice: Math.round(160*USD_KRW) },
  { ticker:"LRCX",  market:"NASDAQ", name:"램리서치",            sector:"반도체 장비/세정",        marketCap:"300조",   basePer:22,   pbr:9,   basePrice: Math.round(220*USD_KRW) },
  { ticker:"MRVL",  market:"NASDAQ", name:"마벨테크놀로지",      sector:"네트워크반도체/AI칩",     marketCap:"350조",   basePer:55,   pbr:4,   basePrice: Math.round(55*USD_KRW)  },
  { ticker:"PYPL",  market:"NASDAQ", name:"페이팔",              sector:"핀테크/간편결제",         marketCap:"200조",   basePer:15,   pbr:3,   basePrice: Math.round(60*USD_KRW)  },
  { ticker:"IONQ",  market:"NASDAQ", name:"아이온큐",            sector:"양자컴퓨팅",              marketCap:"10조",    basePer:null, pbr:6,   basePrice: Math.round(20*USD_KRW)  },
  { ticker:"SNDK",  market:"NASDAQ", name:"샌디스크",            sector:"낸드플래시/SSD",          marketCap:"200조",   basePer:15,   pbr:2,   basePrice: Math.round(60*USD_KRW)  },
  { ticker:"EONR",  market:"NASDAQ", name:"이온R",               sector:"에너지저장/배터리",       marketCap:"5조",     basePer:null, pbr:2,   basePrice: Math.round(8*USD_KRW)   },
  { ticker:"BNAI",  market:"NASDAQ", name:"브랜드인게이지먼트",  sector:"AI브랜드테크/챗봇",       marketCap:"2조",     basePer:null, pbr:50,  basePrice: Math.round(38*USD_KRW)  },
  { ticker:"NFLX",  market:"NASDAQ", name:"넷플릭스",            sector:"스트리밍/OTT/콘텐츠",     marketCap:"600조",   basePer:42,   pbr:14,  basePrice: Math.round(700*USD_KRW) },
  { ticker:"ADBE",  market:"NASDAQ", name:"어도비",              sector:"크리에이티브AI/SaaS",     marketCap:"450조",   basePer:28,   pbr:12,  basePrice: Math.round(390*USD_KRW) },
  { ticker:"CRM",   market:"NASDAQ", name:"세일즈포스",          sector:"CRM/클라우드SaaS",        marketCap:"420조",   basePer:40,   pbr:4,   basePrice: Math.round(290*USD_KRW) },
  { ticker:"PLTR",  market:"NASDAQ", name:"팔란티어",            sector:"AI/빅데이터/국방",        marketCap:"270조",   basePer:null, pbr:25,  basePrice: Math.round(90*USD_KRW)  },
  { ticker:"CRWD",  market:"NASDAQ", name:"크라우드스트라이크",  sector:"사이버보안/AI엔드포인트", marketCap:"320조",   basePer:null, pbr:35,  basePrice: Math.round(380*USD_KRW) },
  { ticker:"PANW",  market:"NASDAQ", name:"팔로알토네트웍스",    sector:"사이버보안/네트워크",     marketCap:"380조",   basePer:null, pbr:18,  basePrice: Math.round(190*USD_KRW) },
  { ticker:"NET",   market:"NASDAQ", name:"클라우드플레어",      sector:"엣지네트워크/보안",       marketCap:"170조",   basePer:null, pbr:28,  basePrice: Math.round(120*USD_KRW) },
  { ticker:"DDOG",  market:"NASDAQ", name:"데이터독",            sector:"클라우드모니터링/AI옵스", marketCap:"100조",   basePer:null, pbr:15,  basePrice: Math.round(130*USD_KRW) },
  { ticker:"SNOW",  market:"NASDAQ", name:"스노우플레이크",      sector:"클라우드데이터플랫폼",    marketCap:"160조",   basePer:null, pbr:9,   basePrice: Math.round(190*USD_KRW) },
  { ticker:"ARM",   market:"NASDAQ", name:"ARM홀딩스",           sector:"CPU설계/IP라이선스",      marketCap:"1,500조", basePer:90,   pbr:30,  basePrice: Math.round(155*USD_KRW) },
  { ticker:"SMCI",  market:"NASDAQ", name:"슈퍼마이크로",        sector:"AI서버/GPU서버",          marketCap:"35조",    basePer:14,   pbr:3,   basePrice: Math.round(40*USD_KRW)  },
  { ticker:"UBER",  market:"NASDAQ", name:"우버",                sector:"모빌리티/배달/자율주행",  marketCap:"200조",   basePer:22,   pbr:8,   basePrice: Math.round(75*USD_KRW)  },
  { ticker:"COIN",  market:"NASDAQ", name:"코인베이스",          sector:"암호화폐거래소/블록체인", marketCap:"75조",    basePer:null, pbr:8,   basePrice: Math.round(200*USD_KRW) },
  { ticker:"KLAC",  market:"NASDAQ", name:"KLA코퍼레이션",       sector:"반도체검사장비",          marketCap:"400조",   basePer:26,   pbr:18,  basePrice: Math.round(700*USD_KRW) },
  { ticker:"ASML",  market:"NASDAQ", name:"ASML",               sector:"EUV노광장비/독점",        marketCap:"850조",   basePer:30,   pbr:14,  basePrice: Math.round(700*USD_KRW) },
  { ticker:"NXPI",  market:"NASDAQ", name:"NXP반도체",          sector:"자동차반도체/IoT",        marketCap:"200조",   basePer:15,   pbr:6,   basePrice: Math.round(210*USD_KRW) },
  { ticker:"ON",    market:"NASDAQ", name:"ON반도체",            sector:"전력반도체/전기차",        marketCap:"70조",    basePer:12,   pbr:3,   basePrice: Math.round(40*USD_KRW)  },
  { ticker:"WOLF",  market:"NASDAQ", name:"울프스피드",          sector:"SiC전력반도체/EV",        marketCap:"5조",     basePer:null, pbr:0.5, basePrice: Math.round(8*USD_KRW)   },
  { ticker:"RIVN",  market:"NASDAQ", name:"리비안",              sector:"전기차/픽업트럭",         marketCap:"30조",    basePer:null, pbr:3,   basePrice: Math.round(15*USD_KRW)  },
  { ticker:"LCID",  market:"NASDAQ", name:"루시드모터스",        sector:"전기차/럭셔리EV",         marketCap:"10조",    basePer:null, pbr:2,   basePrice: Math.round(2*USD_KRW)   },
  // ── KOSPI ────────────────────────────────────────────────────────────────
  { ticker:"005930", market:"KOSPI", name:"삼성전자",     sector:"반도체/스마트폰/가전",     marketCap:"1,090조", basePer:12,  pbr:1.1, basePrice:80000  },
  { ticker:"000660", market:"KOSPI", name:"SK하이닉스",   sector:"DRAM/HBM/AI메모리",       marketCap:"1,080조", basePer:8,   pbr:2,   basePrice:150000 },
  { ticker:"005380", market:"KOSPI", name:"현대차",       sector:"전기차/자율주행/SDV",     marketCap:"520조",   basePer:5,   pbr:0.7, basePrice:200000 },
  { ticker:"012450", market:"KOSPI", name:"한화에어로스페이스",sector:"방산/우주발사체/엔진",  marketCap:"350조",   basePer:35,  pbr:8,   basePrice:600000 },
  { ticker:"034020", market:"KOSPI", name:"두산에너빌리티",sector:"원자력/터빈/SMR",         marketCap:"120조",   basePer:20,  pbr:2,   basePrice:100000 },
  { ticker:"207940", market:"KOSPI", name:"삼성바이오로직스",sector:"바이오CDMO/위탁생산",   marketCap:"670조",   basePer:50,  pbr:7,   basePrice:900000 },
  { ticker:"068270", market:"KOSPI", name:"셀트리온",     sector:"바이오시밀러/항체의약품",  marketCap:"220조",   basePer:30,  pbr:3,   basePrice:180000 },
  { ticker:"051910", market:"KOSPI", name:"LG화학",       sector:"전지재료/석유화학",       marketCap:"250조",   basePer:20,  pbr:1.2, basePrice:350000 },
  { ticker:"006400", market:"KOSPI", name:"삼성SDI",      sector:"2차전지/전기차배터리",    marketCap:"270조",   basePer:18,  pbr:1.5, basePrice:400000 },
  { ticker:"003550", market:"KOSPI", name:"LG",           sector:"지주/전자/화학/에너지",   marketCap:"120조",   basePer:8,   pbr:0.8, basePrice:80000  },
  { ticker:"028260", market:"KOSPI", name:"삼성물산",     sector:"건설/패션/바이오지주",    marketCap:"250조",   basePer:15,  pbr:0.9, basePrice:180000 },
  { ticker:"000270", market:"KOSPI", name:"기아",         sector:"전기차/PBV/글로벌시장",   marketCap:"320조",   basePer:5,   pbr:0.7, basePrice:80000  },
  { ticker:"105560", market:"KOSPI", name:"KB금융",       sector:"은행지주/보험/카드",      marketCap:"250조",   basePer:7,   pbr:0.6, basePrice:90000  },
  { ticker:"055550", market:"KOSPI", name:"신한지주",     sector:"은행지주/글로벌금융",     marketCap:"220조",   basePer:6,   pbr:0.5, basePrice:55000  },
  { ticker:"009830", market:"KOSPI", name:"한화솔루션",   sector:"태양광/케미컬/에너지",    marketCap:"5.2조",   basePer:15,  pbr:0.9, basePrice:48700  },
  { ticker:"088350", market:"KOSPI", name:"한화생명",     sector:"생명보험/IFRS17",         marketCap:"8.6조",   basePer:5,   pbr:0.4, basePrice:4770   },
  { ticker:"004840", market:"KOSPI", name:"SG세계물산",   sector:"건설/주택/부동산개발",    marketCap:"0.7조",   basePer:8,   pbr:0.6, basePrice:5600   },
  { ticker:"035420", market:"KOSPI", name:"NAVER",        sector:"포털/AI/클라우드/쇼핑",  marketCap:"290조",   basePer:22,  pbr:2.5, basePrice:200000 },
  { ticker:"035720", market:"KOSPI", name:"카카오",       sector:"메신저/플랫폼/AI",        marketCap:"180조",   basePer:25,  pbr:2,   basePrice:60000  },
  { ticker:"005490", market:"KOSPI", name:"POSCO홀딩스",  sector:"철강/2차전지소재/수소",   marketCap:"380조",   basePer:8,   pbr:0.5, basePrice:350000 },
  { ticker:"066570", market:"KOSPI", name:"LG전자",       sector:"가전/EV부품/스마트홈",    marketCap:"230조",   basePer:10,  pbr:0.9, basePrice:100000 },
  { ticker:"009150", market:"KOSPI", name:"삼성전기",     sector:"MLCC/카메라모듈/반도체패키지", marketCap:"120조",basePer:15,pbr:1.5,basePrice:150000 },
  { ticker:"011070", market:"KOSPI", name:"LG이노텍",     sector:"카메라모듈/EV부품",       marketCap:"150조",   basePer:12,  pbr:2,   basePrice:180000 },
  { ticker:"017670", market:"KOSPI", name:"SK텔레콤",     sector:"통신/AI/데이터센터",      marketCap:"150조",   basePer:10,  pbr:1.1, basePrice:60000  },
  { ticker:"030200", market:"KOSPI", name:"KT",           sector:"통신/AI/IDC/BC카드",     marketCap:"110조",   basePer:9,   pbr:0.8, basePrice:40000  },
  { ticker:"086790", market:"KOSPI", name:"하나금융지주",  sector:"은행지주/글로벌금융",     marketCap:"190조",   basePer:6,   pbr:0.5, basePrice:75000  },
  { ticker:"316140", market:"KOSPI", name:"우리금융지주",  sector:"은행지주/소매금융",       marketCap:"100조",   basePer:5,   pbr:0.4, basePrice:18000  },
  { ticker:"033780", market:"KOSPI", name:"KT&G",         sector:"담배/바이오/부동산",      marketCap:"130조",   basePer:10,  pbr:1.5, basePrice:100000 },
  { ticker:"010950", market:"KOSPI", name:"S-Oil",        sector:"정유/화학/루브리컨트",    marketCap:"80조",    basePer:10,  pbr:1.0, basePrice:70000  },
  { ticker:"003490", market:"KOSPI", name:"대한항공",     sector:"항공/화물/MRO",           marketCap:"90조",    basePer:8,   pbr:1.0, basePrice:27000  },
  { ticker:"010130", market:"KOSPI", name:"고려아연",     sector:"비철금속/아연/배터리소재", marketCap:"160조",   basePer:18,  pbr:2.5, basePrice:900000 },
  { ticker:"042660", market:"KOSPI", name:"한화오션",     sector:"조선/LNG선/방산함정",     marketCap:"100조",   basePer:null,pbr:3,   basePrice:50000  },
  { ticker:"009540", market:"KOSPI", name:"HD한국조선해양",sector:"조선지주/LNG운반선",     marketCap:"180조",   basePer:20,  pbr:2,   basePrice:200000 },
  { ticker:"011200", market:"KOSPI", name:"HMM",          sector:"해운/컨테이너/LNG",       marketCap:"100조",   basePer:5,   pbr:0.5, basePrice:20000  },
  { ticker:"096770", market:"KOSPI", name:"SK이노베이션",  sector:"배터리/정유/화학",        marketCap:"130조",   basePer:null,pbr:0.6, basePrice:100000 },
  { ticker:"015760", market:"KOSPI", name:"한국전력",     sector:"전력공기업/신재생에너지", marketCap:"180조",   basePer:null,pbr:0.3, basePrice:25000  },
  { ticker:"032830", market:"KOSPI", name:"삼성생명",     sector:"생명보험/자산관리",       marketCap:"180조",   basePer:10,  pbr:0.5, basePrice:90000  },
  { ticker:"000100", market:"KOSPI", name:"유한양행",     sector:"제약/의약품/신약개발",    marketCap:"80조",    basePer:35,  pbr:3,   basePrice:120000 },
  { ticker:"267250", market:"KOSPI", name:"HD현대",       sector:"조선지주/에너지/건설",    marketCap:"100조",   basePer:8,   pbr:0.8, basePrice:80000  },
  { ticker:"034730", market:"KOSPI", name:"SK",           sector:"지주/반도체/에너지/바이오",marketCap:"160조",  basePer:null,pbr:0.5, basePrice:140000 },
  { ticker:"036570", market:"KOSPI", name:"엔씨소프트",   sector:"게임/AI/메타버스",        marketCap:"35조",    basePer:null,pbr:1.5, basePrice:170000 },
  { ticker:"259960", market:"KOSPI", name:"크래프톤",     sector:"게임/배틀그라운드/인도",  marketCap:"110조",   basePer:20,  pbr:3,   basePrice:350000 },
  { ticker:"047050", market:"KOSPI", name:"포스코인터내셔널",sector:"트레이딩/LNG/방산",    marketCap:"80조",    basePer:10,  pbr:1.5, basePrice:65000  },
  // ── KOSDAQ ───────────────────────────────────────────────────────────────
  { ticker:"247540", market:"KOSDAQ", name:"에코프로비엠",     sector:"양극재/전기차배터리",    marketCap:"100조",   basePer:30,  pbr:5,   basePrice:150000 },
  { ticker:"357780", market:"KOSDAQ", name:"솔브레인",         sector:"반도체소재/식각액",      marketCap:"15조",    basePer:15,  pbr:2,   basePrice:300000 },
  { ticker:"039030", market:"KOSDAQ", name:"이오테크닉스",     sector:"레이저장비/반도체",      marketCap:"4조",     basePer:20,  pbr:2.5, basePrice:120000 },
  { ticker:"086520", market:"KOSDAQ", name:"에코프로",         sector:"양극재지주/배터리",      marketCap:"80조",    basePer:35,  pbr:6,   basePrice:80000  },
  { ticker:"036460", market:"KOSDAQ", name:"한국가스공사",     sector:"LNG/수소인프라",         marketCap:"8조",     basePer:10,  pbr:0.7, basePrice:40000  },
  { ticker:"196170", market:"KOSDAQ", name:"알테오젠",         sector:"피하주사플랫폼/바이오",  marketCap:"12조",    basePer:null,pbr:15,  basePrice:200000 },
  { ticker:"032820", market:"KOSDAQ", name:"우리기술",         sector:"원전계측/소형주",        marketCap:"0.3조",   basePer:null,pbr:1,   basePrice:24000  },
  { ticker:"257720", market:"KOSDAQ", name:"실리콘투",         sector:"K뷰티수출/플랫폼",       marketCap:"0.8조",   basePer:10,  pbr:1.5, basePrice:30000  },
  { ticker:"214150", market:"KOSDAQ", name:"클래시스",         sector:"의료미용/HIFU",          marketCap:"3조",     basePer:20,  pbr:3,   basePrice:50000  },
  { ticker:"028300", market:"KOSDAQ", name:"HLB",              sector:"항암신약/리보세라닙",    marketCap:"2조",     basePer:null,pbr:3,   basePrice:30000  },
  { ticker:"080220", market:"KOSDAQ", name:"제주반도체",       sector:"팹리스/메모리반도체",    marketCap:"0.4조",   basePer:18,  pbr:2.1, basePrice:43750  },
  { ticker:"038530", market:"KOSDAQ", name:"케이바이오",       sector:"의료기기/바이오헬스",    marketCap:"0.1조",   basePer:null,pbr:0.8, basePrice:346    },
  { ticker:"278280", market:"KOSDAQ", name:"천보",             sector:"전해질/배터리소재",      marketCap:"3조",     basePer:20,  pbr:2.5, basePrice:50000  },
  { ticker:"066970", market:"KOSDAQ", name:"L&F",              sector:"양극재/NCM/NCMA",        marketCap:"8조",     basePer:null,pbr:2,   basePrice:100000 },
  { ticker:"263750", market:"KOSDAQ", name:"펄어비스",         sector:"게임/검은사막/AI",        marketCap:"5조",     basePer:null,pbr:2,   basePrice:50000  },
  { ticker:"041510", market:"KOSDAQ", name:"에스엠",           sector:"K팝/엔터테인먼트/IP",    marketCap:"15조",    basePer:20,  pbr:3,   basePrice:100000 },
  { ticker:"035900", market:"KOSDAQ", name:"JYP Ent.",         sector:"K팝/엔터테인먼트",        marketCap:"8조",     basePer:18,  pbr:3,   basePrice:55000  },
  { ticker:"122870", market:"KOSDAQ", name:"와이지엔터테인먼트",sector:"K팝/YG/BLACKPINK",      marketCap:"7조",     basePer:25,  pbr:2.5, basePrice:60000  },
  { ticker:"145020", market:"KOSDAQ", name:"휴젤",             sector:"보툴리눔톡신/HA필러",    marketCap:"5조",     basePer:20,  pbr:4,   basePrice:200000 },
  { ticker:"335890", market:"KOSDAQ", name:"비올",             sector:"의료미용/RF기기",         marketCap:"2조",     basePer:25,  pbr:5,   basePrice:18000  },
  { ticker:"112040", market:"KOSDAQ", name:"위메이드",         sector:"게임/블록체인/위믹스",    marketCap:"1조",     basePer:null,pbr:1,   basePrice:20000  },
  { ticker:"294870", market:"KOSDAQ", name:"HDC현대EP",        sector:"화학소재/친환경",         marketCap:"0.5조",   basePer:8,   pbr:0.8, basePrice:8000   },
  { ticker:"348210", market:"KOSDAQ", name:"넥슨게임즈",       sector:"게임/모바일RPG",          marketCap:"3조",     basePer:20,  pbr:3,   basePrice:20000  },
  { ticker:"950130", market:"KOSDAQ", name:"엑스페릭스",       sector:"반도체검사소켓/반도체장비",marketCap:"2조",    basePer:25,  pbr:4,   basePrice:50000  },
  { ticker:"039610", market:"KOSDAQ", name:"화성밸브",         sector:"산업밸브/에너지",         marketCap:"0.3조",   basePer:8,   pbr:0.7, basePrice:15000  },
  { ticker:"123410", market:"KOSDAQ", name:"코리아에프티",     sector:"연료탱크/자동차부품",     marketCap:"0.3조",   basePer:6,   pbr:0.6, basePrice:10000  },
  { ticker:"900140", market:"KOSDAQ", name:"엘브이엠씨홀딩스", sector:"전기차/이륜차/EV",        marketCap:"0.2조",   basePer:null,pbr:1,   basePrice:2000   },
  { ticker:"060540", market:"KOSDAQ", name:"에스에이티이엔지", sector:"환경/탈질설비/친환경",    marketCap:"0.2조",   basePer:7,   pbr:0.6, basePrice:7000   },
  { ticker:"082640", market:"KOSDAQ", name:"동양생명",         sector:"생명보험/소매금융",       marketCap:"0.8조",   basePer:4,   pbr:0.3, basePrice:4000   },
  // ── KOSPI 추가 ───────────────────────────────────────────────────────
  { ticker:"042700", market:"KOSPI", name:"한미반도체",       sector:"HBM픽앤플레이스/반도체장비",marketCap:"80조",   basePer:25,  pbr:8,   basePrice:100000 },
  { ticker:"012330", market:"KOSPI", name:"현대모비스",       sector:"자동차부품/전장/자율주행",  marketCap:"280조",  basePer:7,   pbr:0.8, basePrice:270000 },
  { ticker:"004020", market:"KOSPI", name:"현대제철",         sector:"철강/자동차강판/H형강",    marketCap:"60조",   basePer:6,   pbr:0.3, basePrice:30000  },
  { ticker:"010620", market:"KOSPI", name:"현대미포조선",     sector:"중형선박/PC선/MR탱커",     marketCap:"70조",   basePer:15,  pbr:2,   basePrice:120000 },
  { ticker:"329180", market:"KOSPI", name:"HD현대중공업",     sector:"대형조선/LNG선/드릴십",    marketCap:"200조",  basePer:20,  pbr:2.5, basePrice:250000 },
  { ticker:"079550", market:"KOSPI", name:"LIG넥스원",        sector:"방산/유도무기/레이더",      marketCap:"80조",   basePer:22,  pbr:4,   basePrice:200000 },
  { ticker:"047810", market:"KOSPI", name:"한국항공우주",     sector:"방산/항공기/UAM",           marketCap:"100조",  basePer:30,  pbr:5,   basePrice:80000  },
  { ticker:"000810", market:"KOSPI", name:"삼성화재",         sector:"손해보험/자동차보험",        marketCap:"160조",  basePer:8,   pbr:1.0, basePrice:280000 },
  { ticker:"005830", market:"KOSPI", name:"DB손해보험",       sector:"손해보험/장기보험",          marketCap:"80조",   basePer:6,   pbr:0.7, basePrice:100000 },
  { ticker:"001450", market:"KOSPI", name:"현대해상",         sector:"손해보험/자동차보험",        marketCap:"55조",   basePer:6,   pbr:0.6, basePrice:50000  },
  { ticker:"016360", market:"KOSPI", name:"삼성증권",         sector:"증권/WM/IB",                marketCap:"70조",   basePer:8,   pbr:0.7, basePrice:50000  },
  { ticker:"006800", market:"KOSPI", name:"미래에셋증권",     sector:"증권/글로벌자산운용",        marketCap:"80조",   basePer:9,   pbr:0.7, basePrice:9000   },
  { ticker:"039490", market:"KOSPI", name:"키움증권",         sector:"증권/비대면트레이딩/MTS",    marketCap:"60조",   basePer:8,   pbr:1.0, basePrice:130000 },
  { ticker:"071050", market:"KOSPI", name:"한국금융지주",     sector:"증권지주/카카오뱅크지분",    marketCap:"120조",  basePer:7,   pbr:0.8, basePrice:80000  },
  { ticker:"138040", market:"KOSPI", name:"메리츠금융지주",   sector:"보험/증권/금융지주",          marketCap:"150조",  basePer:7,   pbr:1.5, basePrice:110000 },
  { ticker:"267260", market:"KOSPI", name:"HD현대일렉트릭",   sector:"변압기/전력기기/미국수출",    marketCap:"110조",  basePer:25,  pbr:10,  basePrice:300000 },
  { ticker:"298040", market:"KOSPI", name:"효성중공업",       sector:"변압기/전력인프라/미국",      marketCap:"80조",   basePer:20,  pbr:5,   basePrice:400000 },
  { ticker:"241560", market:"KOSPI", name:"두산퓨얼셀",       sector:"수소연료전지/친환경발전",     marketCap:"5조",    basePer:null,pbr:1.5, basePrice:12000  },
  { ticker:"028050", market:"KOSPI", name:"삼성엔지니어링",   sector:"플랜트EPC/해외건설",          marketCap:"70조",   basePer:12,  pbr:3,   basePrice:40000  },
  { ticker:"000720", market:"KOSPI", name:"현대건설",         sector:"건설/수주/해외인프라",         marketCap:"70조",   basePer:10,  pbr:0.7, basePrice:40000  },
  { ticker:"097950", market:"KOSPI", name:"CJ제일제당",       sector:"식품/바이오/사료",             marketCap:"80조",   basePer:15,  pbr:0.9, basePrice:200000 },
  { ticker:"004370", market:"KOSPI", name:"농심",             sector:"라면/스낵/글로벌K푸드",       marketCap:"25조",   basePer:15,  pbr:1.2, basePrice:350000 },
  { ticker:"003230", market:"KOSPI", name:"삼양식품",         sector:"불닭볶음면/수출/글로벌",       marketCap:"90조",   basePer:25,  pbr:15,  basePrice:800000 },
  { ticker:"069960", market:"KOSPI", name:"현대백화점",       sector:"백화점/면세점/유통",           marketCap:"30조",   basePer:8,   pbr:0.4, basePrice:60000  },
  { ticker:"023530", market:"KOSPI", name:"롯데쇼핑",         sector:"백화점/마트/이커머스",          marketCap:"40조",   basePer:8,   pbr:0.3, basePrice:75000  },
  { ticker:"000120", market:"KOSPI", name:"CJ대한통운",       sector:"물류/택배/글로벌SCM",           marketCap:"40조",   basePer:12,  pbr:0.8, basePrice:120000 },
  { ticker:"010140", market:"KOSPI", name:"삼성중공업",       sector:"조선/LNG선/드릴십",             marketCap:"80조",   basePer:null,pbr:1.5, basePrice:12000  },
  { ticker:"035000", market:"KOSPI", name:"종근당",           sector:"제약/ETC의약품/CDMO",           marketCap:"20조",   basePer:12,  pbr:1.2, basePrice:90000  },
  { ticker:"051600", market:"KOSPI", name:"한전KPS",          sector:"발전정비/원전O&M/해외",          marketCap:"12조",   basePer:12,  pbr:1.5, basePrice:50000  },
  { ticker:"011790", market:"KOSPI", name:"SKC",              sector:"동박/반도체소재/친환경",          marketCap:"20조",   basePer:null,pbr:0.8, basePrice:60000  },
  { ticker:"361610", market:"KOSPI", name:"SK아이이테크놀로지",sector:"분리막/배터리소재/LiBS",        marketCap:"30조",   basePer:null,pbr:1.5, basePrice:100000 },
  { ticker:"007070", market:"KOSPI", name:"GS리테일",         sector:"편의점GS25/호텔/홈쇼핑",        marketCap:"20조",   basePer:10,  pbr:0.6, basePrice:25000  },
  { ticker:"282330", market:"KOSPI", name:"BGF리테일",        sector:"편의점CU/프랜차이즈",            marketCap:"30조",   basePer:12,  pbr:1.2, basePrice:150000 },
  // ── KOSDAQ 추가 ──────────────────────────────────────────────────────
  { ticker:"403870", market:"KOSDAQ", name:"HPSP",            sector:"고압수소어닐링/반도체공정",     marketCap:"8조",    basePer:30,  pbr:8,   basePrice:50000  },
  { ticker:"058470", market:"KOSDAQ", name:"리노공업",         sector:"반도체검사소켓/PCB",            marketCap:"8조",    basePer:20,  pbr:5,   basePrice:200000 },
  { ticker:"064760", market:"KOSDAQ", name:"티씨케이",         sector:"SiC링/반도체소모품",            marketCap:"3조",    basePer:18,  pbr:3.5, basePrice:80000  },
  { ticker:"140860", market:"KOSDAQ", name:"파크시스템스",     sector:"원자력현미경/반도체측정",       marketCap:"4조",    basePer:35,  pbr:8,   basePrice:200000 },
  { ticker:"095340", market:"KOSDAQ", name:"ISC",              sector:"반도체테스트소켓",               marketCap:"2조",    basePer:18,  pbr:3,   basePrice:50000  },
  { ticker:"108860", market:"KOSDAQ", name:"셀바스AI",         sector:"AI음성인식/의료AI/필기",         marketCap:"0.8조",  basePer:null,pbr:2,   basePrice:10000  },
  { ticker:"045300", market:"KOSDAQ", name:"세틀뱅크",         sector:"핀테크/결제/가상계좌",           marketCap:"0.6조",  basePer:10,  pbr:1.2, basePrice:20000  },
  { ticker:"248070", market:"KOSDAQ", name:"솔루스첨단소재",   sector:"동박/전기차배터리소재",          marketCap:"3조",    basePer:null,pbr:1.5, basePrice:20000  },
  { ticker:"322000", market:"KOSDAQ", name:"현대바이오",        sector:"신약/코비드치료제",              marketCap:"0.5조",  basePer:null,pbr:1,   basePrice:10000  },
  { ticker:"053030", market:"KOSDAQ", name:"바이넥스",          sector:"바이오CDMO/위탁생산소형",       marketCap:"0.5조",  basePer:null,pbr:1.2, basePrice:8000   },
  { ticker:"290650", market:"KOSDAQ", name:"자이언트스텝",      sector:"AI영상/버추얼휴먼/XR콘텐츠",   marketCap:"0.3조",  basePer:null,pbr:1.5, basePrice:8000   },
  { ticker:"065350", market:"KOSDAQ", name:"신성이엔지",        sector:"태양광/클린룸/데이터센터",      marketCap:"2조",    basePer:12,  pbr:2,   basePrice:7000   },
  { ticker:"039200", market:"KOSDAQ", name:"오스코텍",          sector:"신약/골다공증/표적항암",        marketCap:"1조",    basePer:null,pbr:3,   basePrice:30000  },
  { ticker:"237690", market:"KOSDAQ", name:"에스티팜",          sector:"올리고뉴클레오타이드/mRNA원료", marketCap:"1.5조",  basePer:null,pbr:3,   basePrice:80000  },
  { ticker:"214450", market:"KOSDAQ", name:"파마리서치",        sector:"PN주사/리쥬란/의료미용",        marketCap:"2조",    basePer:18,  pbr:5,   basePrice:100000 },
  { ticker:"347890", market:"KOSDAQ", name:"엠앤씨솔루션",      sector:"방산부품/항공엔진부품",          marketCap:"0.5조",  basePer:15,  pbr:2,   basePrice:30000  },
  { ticker:"003350", market:"KOSDAQ", name:"한진",              sector:"택배/물류/항공화물",             marketCap:"2조",    basePer:8,   pbr:0.8, basePrice:60000  },
  { ticker:"059090", market:"KOSDAQ", name:"미코바이오메드",    sector:"진단키트/현장진단IVD",          marketCap:"0.3조",  basePer:null,pbr:1,   basePrice:7000   },
  { ticker:"950200", market:"KOSDAQ", name:"파두",              sector:"팹리스/AI SSD컨트롤러",         marketCap:"0.3조",  basePer:null,pbr:1.5, basePrice:10000  },
  { ticker:"049630", market:"KOSDAQ", name:"재영솔루텍",        sector:"사출성형/자동차부품/가전",      marketCap:"0.2조",  basePer:8,   pbr:0.6, basePrice:3000   },
  { ticker:"036640", market:"KOSDAQ", name:"에스엔유",          sector:"디스플레이검사/OLED장비",       marketCap:"0.5조",  basePer:15,  pbr:1.5, basePrice:15000  },
  { ticker:"131970", market:"KOSDAQ", name:"두산테스나",        sector:"반도체테스트/후공정",            marketCap:"1.5조",  basePer:15,  pbr:2.5, basePrice:50000  },
  { ticker:"336370", market:"KOSDAQ", name:"솔브레인홀딩스",    sector:"반도체소재지주",                marketCap:"1조",    basePer:10,  pbr:1,   basePrice:30000  },
  { ticker:"310210", market:"KOSDAQ", name:"보로노이",          sector:"표적항암신약/KRAS저해제",       marketCap:"0.8조",  basePer:null,pbr:4,   basePrice:30000  },
  // ── NASDAQ 추가 ──────────────────────────────────────────────────────
  { ticker:"DELL",  market:"NASDAQ", name:"델테크놀로지스",    sector:"AI서버/PC/클라우드인프라",      marketCap:"700조",  basePer:14,  pbr:null,basePrice: Math.round(120*USD_KRW) },
  { ticker:"HPE",   market:"NASDAQ", name:"HPE",              sector:"서버/네트워킹/엣지컴퓨팅",      marketCap:"200조",  basePer:10,  pbr:1.2, basePrice: Math.round(20*USD_KRW)  },
  { ticker:"SHOP",  market:"NASDAQ", name:"쇼피파이",          sector:"이커머스플랫폼/결제",            marketCap:"150조",  basePer:null,pbr:15,  basePrice: Math.round(120*USD_KRW) },
  { ticker:"SQ",    market:"NASDAQ", name:"블록(스퀘어)",      sector:"핀테크/비트코인/결제",           marketCap:"80조",   basePer:null,pbr:3,   basePrice: Math.round(90*USD_KRW)  },
  { ticker:"SOFI",  market:"NASDAQ", name:"소파이테크놀로지",  sector:"디지털뱅킹/핀테크/학자금대출",  marketCap:"20조",   basePer:null,pbr:1.5, basePrice: Math.round(15*USD_KRW)  },
  { ticker:"MSTR",  market:"NASDAQ", name:"마이크로스트래티지",sector:"비트코인보유/기업인텔리전스",   marketCap:"150조",  basePer:null,pbr:null,basePrice: Math.round(350*USD_KRW) },
  { ticker:"RBLX",  market:"NASDAQ", name:"로블록스",          sector:"메타버스/게임플랫폼/UGC",        marketCap:"45조",   basePer:null,pbr:null,basePrice: Math.round(45*USD_KRW)  },
  { ticker:"PATH",  market:"NASDAQ", name:"유아이패스",        sector:"RPA/엔터프라이즈AI자동화",      marketCap:"20조",   basePer:null,pbr:3,   basePrice: Math.round(13*USD_KRW)  },
  { ticker:"AI",    market:"NASDAQ", name:"C3.ai",            sector:"엔터프라이즈AI/산업AI",          marketCap:"5조",    basePer:null,pbr:3,   basePrice: Math.round(20*USD_KRW)  },
  { ticker:"SOUN",  market:"NASDAQ", name:"사운드하운드AI",    sector:"음성AI/자동차AI/외식AI",         marketCap:"7조",    basePer:null,pbr:15,  basePrice: Math.round(10*USD_KRW)  },
  { ticker:"RXRX",  market:"NASDAQ", name:"리커전파마슈티컬",  sector:"AI신약개발/생명공학",            marketCap:"5조",    basePer:null,pbr:2,   basePrice: Math.round(8*USD_KRW)   },
  { ticker:"ACHR",  market:"NASDAQ", name:"아처에비에이션",    sector:"eVTOL/도심항공모빌리티",         marketCap:"4조",    basePer:null,pbr:2,   basePrice: Math.round(5*USD_KRW)   },
  { ticker:"JOBY",  market:"NASDAQ", name:"조비에비에이션",    sector:"eVTOL/UAM/도심항공",             marketCap:"7조",    basePer:null,pbr:3,   basePrice: Math.round(7*USD_KRW)   },
  // ── KOSPI 추가 2차 ────────────────────────────────────────────────────
  { ticker:"090430", market:"KOSPI", name:"아모레퍼시픽",      sector:"화장품/K뷰티/글로벌",            marketCap:"80조",   basePer:35,  pbr:2,   basePrice:130000 },
  { ticker:"005000", market:"KOSPI", name:"아모레G",           sector:"화장품지주/K뷰티",               marketCap:"35조",   basePer:20,  pbr:1.2, basePrice:45000  },
  { ticker:"000240", market:"KOSPI", name:"한국타이어앤테크놀로지",sector:"타이어/EV타이어/전기차",     marketCap:"80조",   basePer:7,   pbr:0.8, basePrice:70000  },
  { ticker:"011170", market:"KOSPI", name:"롯데케미칼",        sector:"석유화학/수소/배터리소재",        marketCap:"40조",   basePer:null,pbr:0.5, basePrice:60000  },
  { ticker:"010120", market:"KOSPI", name:"LS ELECTRIC",      sector:"전력기기/ESS/스마트그리드",       marketCap:"40조",   basePer:10,  pbr:1.5, basePrice:200000 },
  { ticker:"006260", market:"KOSPI", name:"LS",               sector:"동/에너지케이블/LS일렉트릭지주", marketCap:"40조",   basePer:7,   pbr:0.7, basePrice:85000  },
  { ticker:"000880", market:"KOSPI", name:"한화",             sector:"방산지주/화약/한화에어로",        marketCap:"30조",   basePer:10,  pbr:0.8, basePrice:40000  },
  { ticker:"018880", market:"KOSPI", name:"한온시스템",        sector:"자동차공조/전장냉각/EV",          marketCap:"40조",   basePer:25,  pbr:1.5, basePrice:8000   },
  { ticker:"020150", market:"KOSPI", name:"롯데에너지머티리얼즈",sector:"동박/배터리소재/전기차",       marketCap:"15조",   basePer:null,pbr:1.5, basePrice:30000  },
  { ticker:"000080", market:"KOSPI", name:"하이트진로",        sector:"맥주/소주/주류",                 marketCap:"15조",   basePer:18,  pbr:1.2, basePrice:20000  },
  { ticker:"007340", market:"KOSPI", name:"롯데칠성음료",      sector:"음료/소주/맥주/제로슈거",        marketCap:"20조",   basePer:15,  pbr:0.8, basePrice:120000 },
  { ticker:"011780", market:"KOSPI", name:"금호석유",          sector:"합성고무/카본블랙/화학",          marketCap:"30조",   basePer:8,   pbr:0.8, basePrice:110000 },
  { ticker:"010060", market:"KOSPI", name:"OCI홀딩스",         sector:"태양광폴리실리콘/화학",           marketCap:"15조",   basePer:null,pbr:0.7, basePrice:80000  },
  { ticker:"004490", market:"KOSPI", name:"세방전지",          sector:"자동차배터리/납산배터리",          marketCap:"6조",    basePer:6,   pbr:0.5, basePrice:70000  },
  { ticker:"047040", market:"KOSPI", name:"대우건설",          sector:"건설/아파트/해외플랜트",           marketCap:"15조",   basePer:6,   pbr:0.5, basePrice:5000   },
  { ticker:"001680", market:"KOSPI", name:"대상",              sector:"MSG/바이오발효/식품소재",          marketCap:"10조",   basePer:8,   pbr:0.5, basePrice:20000  },
  { ticker:"302440", market:"KOSPI", name:"SK바이오사이언스",   sector:"백신/CDMO/바이오",                marketCap:"15조",   basePer:null,pbr:2,   basePrice:50000  },
  { ticker:"000990", market:"KOSPI", name:"DB하이텍",          sector:"파운드리/8인치/전력반도체",        marketCap:"20조",   basePer:10,  pbr:1.5, basePrice:40000  },
  { ticker:"002380", market:"KOSPI", name:"KCC",              sector:"건축자재/페인트/실리콘",           marketCap:"15조",   basePer:8,   pbr:0.4, basePrice:200000 },
  { ticker:"085620", market:"KOSPI", name:"미래에셋생명",      sector:"생명보험/변액보험",                marketCap:"8조",    basePer:5,   pbr:0.4, basePrice:4000   },
  { ticker:"001040", market:"KOSPI", name:"CJ",               sector:"지주사/CJ제일제당/CGV",           marketCap:"20조",   basePer:6,   pbr:0.3, basePrice:70000  },
  { ticker:"009240", market:"KOSPI", name:"한샘",              sector:"가구/인테리어/리하우스",           marketCap:"10조",   basePer:null,pbr:1.2, basePrice:50000  },
  // ── KOSDAQ 추가 2차 ────────────────────────────────────────────────────
  { ticker:"053800", market:"KOSDAQ", name:"안랩",             sector:"사이버보안/V3/EDR",               marketCap:"3조",    basePer:18,  pbr:2.5, basePrice:60000  },
  { ticker:"089790", market:"KOSDAQ", name:"씨젠",             sector:"분자진단/PCR/다중검사",           marketCap:"2조",    basePer:null,pbr:1.5, basePrice:20000  },
  { ticker:"181710", market:"KOSDAQ", name:"NHN",             sector:"IT서비스/클라우드/웹보드게임",     marketCap:"5조",    basePer:20,  pbr:1.5, basePrice:20000  },
  { ticker:"048410", market:"KOSDAQ", name:"현대바이오랜드",   sector:"화장품원료/천연소재/한방",         marketCap:"0.5조",  basePer:15,  pbr:1,   basePrice:10000  },
  { ticker:"044450", market:"KOSDAQ", name:"KG이니시스",       sector:"PG결제/이커머스결제",              marketCap:"0.8조",  basePer:10,  pbr:1,   basePrice:10000  },
  { ticker:"039830", market:"KOSDAQ", name:"오로라월드",        sector:"캐릭터완구/라이선스/IP",           marketCap:"0.5조",  basePer:null,pbr:1,   basePrice:5000   },
  { ticker:"058970", market:"KOSDAQ", name:"엠로",             sector:"B2B SCM/AI구매솔루션",            marketCap:"0.3조",  basePer:15,  pbr:2,   basePrice:10000  },
  { ticker:"033100", market:"KOSDAQ", name:"제주반도체",        sector:"모바일D램/IoT반도체",              marketCap:"0.5조",  basePer:null,pbr:1,   basePrice:8000   },
  { ticker:"101140", market:"KOSDAQ", name:"인터파크트리플",    sector:"여행OTA/공연/항공",                marketCap:"0.5조",  basePer:null,pbr:1.5, basePrice:5000   },
  { ticker:"024840", market:"KOSDAQ", name:"큐라클",            sector:"안과신약/망막질환",                marketCap:"0.4조",  basePer:null,pbr:2,   basePrice:8000   },
  { ticker:"192400", market:"KOSDAQ", name:"쿠쿠홀딩스",        sector:"전기밥솥/정수기렌탈/가전",        marketCap:"1.5조",  basePer:8,   pbr:1,   basePrice:23000  },
  { ticker:"086960", market:"KOSDAQ", name:"MDS테크",           sector:"임베디드SW/자동차소프트웨어",      marketCap:"0.5조",  basePer:15,  pbr:2,   basePrice:10000  },
  { ticker:"226950", market:"KOSDAQ", name:"올리패스",          sector:"RNA간섭신약/비만당뇨치료제",       marketCap:"0.3조",  basePer:null,pbr:2,   basePrice:5000   },
  { ticker:"236200", market:"KOSDAQ", name:"슈프리마",          sector:"지문인식/바이오인식/보안",         marketCap:"0.5조",  basePer:12,  pbr:1.5, basePrice:18000  },
  { ticker:"254490", market:"KOSDAQ", name:"이오테크닉스",      sector:"레이저마킹/반도체레이저장비",      marketCap:"1조",    basePer:15,  pbr:3,   basePrice:100000 },
  { ticker:"043090", market:"KOSDAQ", name:"카카오VX",          sector:"스크린골프/골프IT플랫폼",          marketCap:"0.3조",  basePer:null,pbr:1,   basePrice:5000   },
  { ticker:"025900", market:"KOSDAQ", name:"동화기업",           sector:"HDD파티클보드/도료/배터리전해질", marketCap:"0.5조",  basePer:5,   pbr:0.5, basePrice:17000  },
  { ticker:"096530", market:"KOSDAQ", name:"씨젠의료재단",      sector:"임상검사/분자진단",                marketCap:"0.3조",  basePer:10,  pbr:1,   basePrice:15000  },
  { ticker:"078140", market:"KOSDAQ", name:"대봉엘에스",         sector:"의약품원료/정밀화학",              marketCap:"0.3조",  basePer:8,   pbr:0.7, basePrice:10000  },
  { ticker:"094360", market:"KOSDAQ", name:"칩스앤미디어",       sector:"팹리스/영상IP/AI반도체IP",        marketCap:"0.5조",  basePer:15,  pbr:3,   basePrice:20000  },
  { ticker:"365270", market:"KOSDAQ", name:"큐라티스",           sector:"mRNA백신/면역항암",               marketCap:"0.3조",  basePer:null,pbr:2,   basePrice:10000  },
  { ticker:"029960", market:"KOSDAQ", name:"코엔텍",            sector:"환경폐기물처리/소각",              marketCap:"0.3조",  basePer:8,   pbr:1,   basePrice:8000   },
  { ticker:"039440", market:"KOSDAQ", name:"에스티큐브",         sector:"면역항암/PD-L1저해제",            marketCap:"0.3조",  basePer:null,pbr:2,   basePrice:5000   },
  { ticker:"043370", market:"KOSDAQ", name:"피에이치에이",       sector:"자동차부품/스탬핑/경량화",         marketCap:"0.3조",  basePer:6,   pbr:0.6, basePrice:8000   },
  // ── NASDAQ 추가 2차 ────────────────────────────────────────────────────
  { ticker:"NOW",   market:"NASDAQ", name:"서비스나우",         sector:"AI에이전트/워크플로우자동화",     marketCap:"2200조", basePer:60,  pbr:25,  basePrice: Math.round(1000*USD_KRW)},
  { ticker:"WDAY",  market:"NASDAQ", name:"워크데이",           sector:"HR클라우드/ERP/AI인력관리",       marketCap:"700조",  basePer:50,  pbr:8,   basePrice: Math.round(260*USD_KRW) },
  { ticker:"ZS",    market:"NASDAQ", name:"지스케일러",         sector:"제로트러스트/SASE/클라우드보안",  marketCap:"400조",  basePer:null,pbr:25,  basePrice: Math.round(200*USD_KRW) },
  { ticker:"OKTA",  market:"NASDAQ", name:"옥타",              sector:"ID보안/SSO/IAM/제로트러스트",     marketCap:"200조",  basePer:null,pbr:8,   basePrice: Math.round(110*USD_KRW) },
  { ticker:"MDB",   market:"NASDAQ", name:"몽고DB",             sector:"NoSQL/클라우드DB/Atlas",          marketCap:"200조",  basePer:null,pbr:10,  basePrice: Math.round(260*USD_KRW) },
  { ticker:"TTD",   market:"NASDAQ", name:"더트레이드데스크",   sector:"프로그래매틱광고/DSP/CTV",        marketCap:"300조",  basePer:null,pbr:15,  basePrice: Math.round(80*USD_KRW)  },
  { ticker:"APP",   market:"NASDAQ", name:"앱러빈",             sector:"AI광고플랫폼/모바일마케팅",       marketCap:"700조",  basePer:40,  pbr:30,  basePrice: Math.round(280*USD_KRW) },
  { ticker:"AXON",  market:"NASDAQ", name:"엑슨엔터프라이즈",   sector:"바디캠/테이저/공공안전AI",         marketCap:"400조",  basePer:80,  pbr:20,  basePrice: Math.round(600*USD_KRW) },
  { ticker:"DKNG",  market:"NASDAQ", name:"드래프트킹스",       sector:"스포츠베팅/온라인도박/iGaming",   marketCap:"100조",  basePer:null,pbr:5,   basePrice: Math.round(35*USD_KRW)  },
  { ticker:"RDDT",  market:"NASDAQ", name:"레딧",               sector:"소셜미디어/커뮤니티/광고",         marketCap:"150조",  basePer:null,pbr:10,  basePrice: Math.round(125*USD_KRW) },
  { ticker:"HOOD",  market:"NASDAQ", name:"로빈후드",           sector:"리테일투자/암호화폐/MFA거래",      marketCap:"80조",   basePer:null,pbr:4,   basePrice: Math.round(45*USD_KRW)  },
  { ticker:"DUOL",  market:"NASDAQ", name:"듀오링고",           sector:"AI언어교육/구독/게이미피케이션",   marketCap:"100조",  basePer:null,pbr:20,  basePrice: Math.round(300*USD_KRW) },
  { ticker:"CELH",  market:"NASDAQ", name:"셀시우스홀딩스",     sector:"에너지음료/헬스음료",              marketCap:"70조",   basePer:30,  pbr:8,   basePrice: Math.round(30*USD_KRW)  },
  { ticker:"LUNR",  market:"NASDAQ", name:"인튜이티브머신즈",   sector:"달탐사/우주/NASA계약",             marketCap:"10조",   basePer:null,pbr:5,   basePrice: Math.round(10*USD_KRW)  },
  { ticker:"GFS",   market:"NASDAQ", name:"글로벌파운드리즈",   sector:"파운드리/비삼성/미국반도체",       marketCap:"200조",  basePer:25,  pbr:2,   basePrice: Math.round(40*USD_KRW)  },
  { ticker:"GTLB",  market:"NASDAQ", name:"깃랩",              sector:"DevSecOps/코드플랫폼/AI코딩",      marketCap:"80조",   basePer:null,pbr:8,   basePrice: Math.round(60*USD_KRW)  },
  { ticker:"DOCN",  market:"NASDAQ", name:"디지털오션",         sector:"SMB클라우드/VPS/AI클라우드",       marketCap:"20조",   basePer:null,pbr:3,   basePrice: Math.round(30*USD_KRW)  },
  { ticker:"FWONK", market:"NASDAQ", name:"포뮬러원그룹",       sector:"F1/모터스포츠/미디어",             marketCap:"180조",  basePer:50,  pbr:4,   basePrice: Math.round(80*USD_KRW)  },
  { ticker:"SPOT",  market:"NASDAQ", name:"스포티파이",         sector:"음악스트리밍/팟캐스트/AI추천",     marketCap:"600조",  basePer:50,  pbr:20,  basePrice: Math.round(620*USD_KRW) },
  { ticker:"RKLB",  market:"NASDAQ", name:"로켓랩",            sector:"소형로켓/위성발사/우주스타트업",   marketCap:"60조",   basePer:null,pbr:10,  basePrice: Math.round(22*USD_KRW)  },
  { ticker:"ASTS",  market:"NASDAQ", name:"AST스페이스모바일", sector:"위성직접통신/스페이스셀룰러",      marketCap:"30조",   basePer:null,pbr:10,  basePrice: Math.round(20*USD_KRW)  },
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

  // 한국 주식은 Yahoo Finance(.KS/.KQ), 미국 주식도 Yahoo Finance
  const krTickers = parsed.filter(p => p.market === "KOSPI" || p.market === "KOSDAQ");

  const krFdrMap = krTickers.length > 0
    ? await yahooKrMultiQuote(krTickers.map(p => ({ ticker: p.ticker, market: p.market })))
    : {} as Record<string, KrQuote>;

  try {
    const results = await Promise.all(
      parsed.map(async (p) => {
        const isKorean = p.market === "KOSPI" || p.market === "KOSDAQ";

        if (isKorean) {
          const fq = krFdrMap[p.ticker];
          if (!fq) return { ticker: p.ticker, market: p.market, ok: false };
          const univEntry = SCREEN_UNIVERSE.find(s => s.ticker === p.ticker && s.market === p.market);
          return {
            ticker:        p.ticker,
            market:        p.market,
            price:         fq.close,
            priceKRW:      fq.close,
            changePercent: fq.changePercent,
            change:        fq.change,
            volume:        fq.volume,
            high:          fq.high,
            low:           fq.low,
            high52w:       fq.high52w,
            low52w:        fq.low52w,
            avgVolume10d:  fq.volume,
            fiftyDayAvg:   0,
            prevClose:     fq.prevClose,
            currency:      "KRW",
            name:          univEntry?.name ?? p.ticker,
            ok:            true,
          };
        }

        // 미국 주식 — Yahoo Finance
        try {
          const q = await yahooFinance.quote(p.yahooTicker);
          const priceKRW = Math.round((q.regularMarketPrice ?? 0) * liveRate);
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

// ─── 저평가 우량주 스크리닝 + 전체 유니버스 조회 ─────────────────────────────
router.get("/stocks/screen", async (req, res) => {
  const market = (req.query.market as string) ?? "ALL";
  // filter=all → 전체 종목 반환 / filter=undervalued(기본) → 저평가만
  const filter = (req.query.filter as string) ?? "undervalued";

  const cacheKey = `${market}:${filter}`;
  const cached = screenCache.get(cacheKey);
  if (cached) return res.json(cached);

  const liveRate = await getLiveUsdKrw();

  const candidates = SCREEN_UNIVERSE.filter(
    (s) => market === "ALL" || s.market === market
  );

  // 한국 주식 일괄 Yahoo Finance(.KS/.KQ) 조회
  const krCandidates = candidates.filter(c => c.market === "KOSPI" || c.market === "KOSDAQ");
  const krFdrMap = krCandidates.length > 0
    ? await yahooKrMultiQuote(krCandidates.map(c => ({ ticker: c.ticker, market: c.market })))
    : {} as Record<string, KrQuote>;

  const results = await Promise.allSettled(
    candidates.map(async (c) => {
      const isKorean = c.market === "KOSPI" || c.market === "KOSDAQ";

      let livePrice: number;
      let changePercent: number;

      if (isKorean) {
        const fq = krFdrMap[c.ticker];
        if (!fq) throw new Error(`Yahoo no data for ${c.ticker}`);
        livePrice    = fq.close;
        changePercent = fq.changePercent;
      } else {
        const yt = toYahooTicker(c.ticker, c.market);
        const q  = await yahooFinance.quote(yt);
        livePrice    = q.regularMarketPrice ?? 0;
        changePercent = q.regularMarketChangePercent ?? 0;
      }

      const priceKRW = isKorean ? livePrice : Math.round(livePrice * liveRate);

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
        currency:     isKorean ? "KRW" : "USD",
      };
    })
  );

  const fulfilled = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);

  let output: any[];
  if (filter === "all") {
    // 전체 반환: 저평가 먼저(점수 낮을수록 더 저평가), 그 다음 일반 종목 변동률 순
    const uv  = fulfilled.filter(s => s.isUndervalued).sort((a, b) => a.score - b.score);
    const rest = fulfilled.filter(s => !s.isUndervalued).sort((a, b) => b.changePercent - a.changePercent);
    output = [...uv, ...rest];
  } else {
    output = fulfilled.filter(s => s.isUndervalued).sort((a, b) => a.score - b.score);
  }

  screenCache.set(cacheKey, output, TTL.SCREEN);
  return res.json(output);
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
    // 재무 데이터는 Yahoo Finance; 한국 주식 가격/52w도 Yahoo(.KS/.KQ)로 통일
    const [summary, rawQuote, krQ] = await Promise.all([
      yahooFinance.quoteSummary(yahooTicker, {
        modules: ["defaultKeyStatistics", "financialData", "summaryDetail", "price"],
      }).catch(() => null),
      isKorean ? Promise.resolve(null) : yahooFinance.quote(yahooTicker).catch(() => null),
      isKorean ? yahooKrQuote(ticker, market) : Promise.resolve(null),
    ]);

    const q  = rawQuote as any;
    const fd = (summary as any)?.financialData ?? {};
    const ks = (summary as any)?.defaultKeyStatistics ?? {};
    const sd = (summary as any)?.summaryDetail ?? {};
    const pr = (summary as any)?.price ?? {};

    // 가격/시세: 한국은 Yahoo(.KS/.KQ), 미국은 Yahoo 직접
    const currentPrice: number = isKorean
      ? (krQ?.close ?? pr?.regularMarketPrice ?? 0)
      : (q?.regularMarketPrice ?? 0);
    const priceKRW: number = isKorean ? currentPrice : Math.round(currentPrice * liveRate);
    const high52w: number = isKorean ? (krQ?.high52w ?? pr?.fiftyTwoWeekHigh ?? 0) : (q?.fiftyTwoWeekHigh ?? 0);
    const low52w:  number = isKorean ? (krQ?.low52w  ?? pr?.fiftyTwoWeekLow  ?? 0) : (q?.fiftyTwoWeekLow  ?? 0);
    const high52wKRW: number = isKorean ? high52w : Math.round(high52w * liveRate);
    const low52wKRW:  number = isKorean ? low52w  : Math.round(low52w  * liveRate);
    const changePercent: number = isKorean
      ? (krQ?.changePercent ?? 0)
      : (q?.regularMarketChangePercent ?? 0);
    const prevClose: number = isKorean
      ? (krQ?.prevClose ?? 0)
      : (q?.regularMarketPreviousClose ?? 0);

    const per: number | null          = sd?.trailingPE ?? null;
    const forwardPer: number | null   = sd?.forwardPE ?? null;
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
    const univEntry = SCREEN_UNIVERSE.find(s => s.ticker === ticker && s.market === market);
    const name: string = univEntry?.name ?? pr?.shortName ?? q?.shortName ?? ticker;
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
  const liveRate = await getLiveUsdKrw();

  try {
    let data: any[];

    if (isKorean) {
      // 한국 주식 — Yahoo Finance(.KS/.KQ) 일봉 데이터
      const krRows = await yahooKrHistory(ticker, market, days);
      data = krRows.map(d => ({
        date:   d.date,
        open:   d.open,
        high:   d.high,
        low:    d.low,
        close:  d.close,
        volume: d.volume,
      }));
    } else {
      // 미국 주식 — Yahoo Finance
      const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const period2 = new Date();
      const raw = await yahooFinance.historical(yahooTicker, {
        period1: period1.toISOString().split("T")[0],
        period2: period2.toISOString().split("T")[0],
      }).catch(() => []);

      data = (raw as any[])
        .filter((d: any) => d.close != null)
        .map((d: any) => ({
          date:   (d.date instanceof Date ? d.date : new Date(d.date)).toISOString().split("T")[0],
          open:   Math.round(d.open  * liveRate),
          high:   Math.round(d.high  * liveRate),
          low:    Math.round(d.low   * liveRate),
          close:  Math.round(d.close * liveRate),
          volume: d.volume ?? 0,
        }));
    }

    const payload = { ticker, market, period, data };
    historyCache.set(cacheKey, payload, TTL.HISTORY);
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// ─── 종합 AI 분석: 1년 과거 데이터 기반 분할매수·익절·재무·리스크 자동 계산 ──────
const analyzeCache = new TtlCache<any>();

function pctile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function calcEntries(data: {high:number;close:number}[], beta: number | null): [number,number,number] {
  const dds: number[] = [];
  for (let i = 20; i < data.length; i++) {
    let peak = 0;
    for (let j = i - 20; j < i; j++) peak = Math.max(peak, data[j].high);
    if (peak <= 0) continue;
    const dd = ((peak - data[i].close) / peak) * 100;
    if (dd > 1.5) dds.push(dd);
  }
  if (dds.length < 10) {
    const b = Math.max(0.3, Math.abs(beta ?? 1.0));
    return [
      Math.max(3,  Math.min(15, Math.round(b * 5.5))),
      Math.max(7,  Math.min(25, Math.round(b * 10.5))),
      Math.max(13, Math.min(40, Math.round(b * 17))),
    ];
  }
  dds.sort((a, b) => a - b);
  const e1 = Math.max(3,  Math.min(15, Math.round(pctile(dds, 35) * 2) / 2));
  const e2 = Math.max(7,  Math.min(25, Math.round(pctile(dds, 62) * 2) / 2));
  const e3 = Math.max(13, Math.min(45, Math.round(pctile(dds, 87) * 2) / 2));
  return [e1, e2, e3];
}

function calcProfitTargets(e1: number, e2: number, e3: number, targetUpPct: number | null): [number, number, number] {
  const pt1 = Math.max(3,  Math.min(12, Math.round(e1 * 0.8  * 2) / 2));
  const blended = (0.3 * e1 + 0.3 * e2) / 0.6;
  const pt2 = Math.max(8,  Math.min(25, Math.round(blended * 0.65 * 2) / 2));
  const pt3 = targetUpPct !== null && targetUpPct > pt2
    ? Math.max(15, Math.min(60, Math.round(targetUpPct * 2) / 2))
    : Math.max(15, Math.min(50, Math.round(e3 * 0.75 * 2) / 2));
  return [pt1, pt2, pt3];
}

router.get("/stocks/analyze", async (req, res) => {
  const ticker = (req.query.ticker as string) ?? "";
  const market  = (req.query.market  as string) ?? "NASDAQ";
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const cacheKey = `analyze:${ticker}:${market}`;
  const cached = analyzeCache.get(cacheKey);
  if (cached) return res.json(cached);

  const yahooTicker = toYahooTicker(ticker, market);
  const isKorean = market === "KOSPI" || market === "KOSDAQ";
  const liveRate = await getLiveUsdKrw();

  try {
    const period1 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const period2 = new Date().toISOString().split("T")[0];

    // 한국 주식: 과거 OHLCV + 현재가도 Yahoo Finance(.KS/.KQ)로 통일
    const [summary, rawHistoryYahoo, krRows, krQ] = await Promise.all([
      yahooFinance.quoteSummary(yahooTicker, {
        modules: ["defaultKeyStatistics", "financialData", "summaryDetail", "price", "summaryProfile"] as any,
      }).catch(() => null),
      isKorean
        ? Promise.resolve([] as any[])
        : yahooFinance.historical(yahooTicker, { period1, period2 }).catch(() => []),
      isKorean ? yahooKrHistory(ticker, market, 365) : Promise.resolve([]),
      isKorean ? yahooKrQuote(ticker, market) : Promise.resolve(null),
    ]);

    const fd = (summary as any)?.financialData      ?? {};
    const ks = (summary as any)?.defaultKeyStatistics ?? {};
    const sd = (summary as any)?.summaryDetail       ?? {};
    const pr = (summary as any)?.price               ?? {};
    const sp = (summary as any)?.summaryProfile      ?? {};

    // 현재가/52w: 한국은 Yahoo(.KS/.KQ), 미국은 Yahoo 직접
    const currentPrice: number = isKorean
      ? (krQ?.close ?? pr?.regularMarketPrice ?? 0)
      : (pr?.regularMarketPrice ?? 0);
    const priceKRW: number = isKorean ? currentPrice : Math.round(currentPrice * liveRate);
    const high52w: number  = isKorean
      ? (krQ?.high52w ?? pr?.fiftyTwoWeekHigh ?? sd?.fiftyTwoWeekHigh ?? 0)
      : (pr?.fiftyTwoWeekHigh ?? sd?.fiftyTwoWeekHigh ?? 0);
    const low52w:  number  = isKorean
      ? (krQ?.low52w ?? pr?.fiftyTwoWeekLow ?? sd?.fiftyTwoWeekLow ?? 0)
      : (pr?.fiftyTwoWeekLow ?? sd?.fiftyTwoWeekLow ?? 0);
    const high52wKRW = isKorean ? Math.round(high52w) : Math.round(high52w * liveRate);
    const low52wKRW  = isKorean ? Math.round(low52w)  : Math.round(low52w  * liveRate);

    const per: number | null          = sd?.trailingPE     ?? null;
    const pbr: number | null          = ks?.priceToBook    ?? null;
    const roeRaw: number | null       = fd?.returnOnEquity ?? null;
    const roe: number | null          = roeRaw != null ? +(roeRaw * 100).toFixed(1) : null;
    const debtEq: number | null       = fd?.debtToEquity   ?? null;
    const debtRatio: number | null    = debtEq  != null ? +(debtEq).toFixed(1) : null;
    const revGrowthRaw: number | null = fd?.revenueGrowth  ?? null;
    const revenueGrowth: number | null= revGrowthRaw != null ? +(revGrowthRaw * 100).toFixed(1) : null;
    const beta: number | null         = sd?.beta ?? ks?.beta ?? null;
    const targetMean: number | null   = fd?.targetMeanPrice ?? null;
    const targetMeanKRW: number | null= targetMean
      ? (isKorean ? Math.round(targetMean) : Math.round(targetMean * liveRate)) : null;
    const recKey: string              = fd?.recommendationKey ?? "";

    const fromUniverse = SCREEN_UNIVERSE.find(s => s.ticker === ticker && s.market === market);
    const sectorEn     = sp?.sector   ?? "";
    const industryEn   = sp?.industry ?? "";
    const sector: string = fromUniverse?.sector
      || [sectorEn, industryEn].filter(Boolean).join("/") || "기타";
    const name: string = fromUniverse?.name ?? pr?.shortName ?? pr?.longName ?? ticker;

    // 과거 OHLCV 정규화: 한국은 Yahoo(.KS/.KQ, KRW 그대로), 미국은 Yahoo(USD→KRW)
    const histData = isKorean
      ? krRows
          .filter(d => d.close > 0 && d.high > 0)
          .map(d => ({ high: d.high, low: d.low, close: d.close }))
      : (rawHistoryYahoo as any[])
          .filter((d: any) => d.close != null && d.high != null)
          .map((d: any) => ({
            high:  d.high  * liveRate,
            low:   d.low   * liveRate,
            close: d.close * liveRate,
          }));

    const [e1, e2, e3] = calcEntries(histData, beta);
    const splitEntries = [
      { ratio: 30, dropPercent: e1, targetPrice: Math.round(priceKRW * (1 - e1 / 100)) },
      { ratio: 30, dropPercent: e2, targetPrice: Math.round(priceKRW * (1 - e2 / 100)) },
      { ratio: 40, dropPercent: e3, targetPrice: Math.round(priceKRW * (1 - e3 / 100)) },
    ];

    const targetUpPct = targetMeanKRW && priceKRW > 0
      ? +((targetMeanKRW - priceKRW) / priceKRW * 100).toFixed(1) : null;
    const [pt1, pt2, pt3] = calcProfitTargets(e1, e2, e3, targetUpPct);
    const profitTargets = [
      { percent: pt1, price: Math.round(priceKRW * (1 + pt1 / 100)) },
      { percent: pt2, price: Math.round(priceKRW * (1 + pt2 / 100)) },
      { percent: pt3, price: Math.round(priceKRW * (1 + pt3 / 100)) },
    ];

    const support    = low52wKRW  > 0 ? low52wKRW  : Math.round(priceKRW * 0.72);
    const resistance = high52wKRW > 0 ? high52wKRW : Math.round(priceKRW * 1.35);
    let boxPos: "저점권"|"중간권"|"고점권" = "중간권";
    if (support > 0 && resistance > support) {
      const rng = (priceKRW - support) / (resistance - support);
      if (rng <= 0.30) boxPos = "저점권";
      else if (rng >= 0.70) boxPos = "고점권";
    }

    const anchor    = targetMeanKRW ?? Math.round(priceKRW * 1.12);
    const anchorPct = priceKRW > 0 ? (anchor - priceKRW) / priceKRW * 100 : 12;
    const forecasts = [
      { period: "1일 후",    price: Math.round(priceKRW * 1.003),                            changePercent: 0.3 },
      { period: "1주 후",    price: Math.round(priceKRW * (1 + anchorPct * 0.07 / 100)),     changePercent: +(anchorPct * 0.07).toFixed(1) },
      { period: "1개월 후",  price: Math.round(priceKRW * (1 + anchorPct * 0.25 / 100)),     changePercent: +(anchorPct * 0.25).toFixed(1) },
      { period: "3개월 후",  price: Math.round(priceKRW * (1 + anchorPct * 0.50 / 100)),     changePercent: +(anchorPct * 0.50).toFixed(1) },
      { period: "6개월 후",  price: Math.round(priceKRW * (1 + anchorPct * 0.75 / 100)),     changePercent: +(anchorPct * 0.75).toFixed(1) },
      { period: "12개월 후", price: anchor,                                                   changePercent: +anchorPct.toFixed(1) },
      { period: "1800일",    price: Math.round(priceKRW * (1 + anchorPct * 5   / 100)),     changePercent: +(anchorPct * 5).toFixed(1) },
    ];

    function evalFin(per: number|null, pbr: number|null, mkt: string): string {
      if (!per || per <= 0 || !pbr || pbr <= 0) return "적정";
      if (mkt === "NASDAQ") {
        if (per < 15 && pbr < 3)  return "강한 저평가";
        if (per < 20 && pbr < 5)  return "저평가";
        if (per > 60 || pbr > 20) return "심각한 거품";
        if (per > 40 || pbr > 12) return "거품";
        if (per < 25 && pbr < 6)  return "저평가";
      } else if (mkt === "KOSPI") {
        if (per < 8  && pbr < 0.8) return "강한 저평가";
        if (per < 12 && pbr < 1.2) return "저평가";
        if (per > 25 || pbr > 3)   return "거품";
      } else {
        if (per < 12 && pbr < 1.5) return "저평가";
        if (per > 35 || pbr > 5)   return "거품";
      }
      return "적정";
    }
    const evaluation = evalFin(per, pbr, market);

    const fPer = per ? `PER ${per.toFixed(1)}배` : "";
    const fPbr = pbr ? `PBR ${pbr.toFixed(2)}배` : "";
    const fRoe = roe != null ? `ROE ${roe.toFixed(1)}%` : "";
    const fDbt = debtRatio != null ? `부채비율 ${debtRatio}%` : "";
    const fGrw = revenueGrowth != null ? `매출성장 ${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%` : "";
    const finSummary =
      [fPer, fPbr, fRoe, fDbt, fGrw].filter(Boolean).join(" · ") +
      (targetMeanKRW ? ` · 목표가 ₩${targetMeanKRW.toLocaleString()}` : "") +
      `. 재무 평가: ${evaluation}.`;

    const grade: "우량주"|"중형주"|"소형주" =
      roe != null && roe > 15 && (debtRatio == null || debtRatio < 200) ? "우량주"
      : roe != null && roe < 3 ? "소형주"
      : "중형주";

    const region = isKorean ? "국내장" : "미국장";

    const mktRisk = market === "NASDAQ"
      ? "미국 연준(Fed) 금리 결정, 달러 강세/약세, 지정학적 갈등(중동·러-우)이 주요 외부 리스크."
      : market === "KOSPI"
      ? "외국인 수급 변동, 원/달러 환율, 미중 무역 갈등, 국내 정치 불확실성이 주요 리스크."
      : "개인 투자자 수급 의존도 높음. 테마 소멸 시 급락 위험. 코스닥 특례기업 심사 이슈 주의.";

    const betaStr = beta != null
      ? beta > 1.5
        ? `고변동성(β=${beta.toFixed(2)}) — 시장 대비 ${((beta - 1) * 100).toFixed(0)}% 높은 변동성. 분할매수 필수.`
        : beta > 1.0
        ? `중간 변동성(β=${beta.toFixed(2)}) — 시장 평균 이상 변동. 포지션 사이징 주의.`
        : `저변동성(β=${beta.toFixed(2)}) — 안정적 종목이나 시장 하락 시 연동 하락 주의.`
      : "베타 데이터 미수집. 최근 차트로 변동성 직접 확인 필요.";

    const techStr = boxPos === "저점권"
      ? `52주 저점(₩${low52wKRW.toLocaleString()}) 근처. RSI 과매도 구간 진입 시 강한 반등 기대. 분할매수 적기.`
      : boxPos === "고점권"
      ? `52주 고점(₩${high52wKRW.toLocaleString()}) 근처. 신고점 돌파 시 추세 지속이나 저항 실패 시 눌림목 조정.`
      : `박스권 중간 구간. 지지선(₩${low52wKRW.toLocaleString()}) 이탈 여부가 핵심 기술적 신호.`;

    const strategyStr =
      `분할매수: 1차 -${e1}%, 2차 -${e2}%, 3차 -${e3}% (30:30:40 비율). ` +
      `목표 수익: 1차 +${pt1}%, 2차 +${pt2}%, 3차 +${pt3}%. ` +
      (targetMeanKRW && priceKRW > 0
        ? `애널리스트 평균 목표가 ₩${targetMeanKRW.toLocaleString()} (${targetUpPct?.toFixed(1)}% 상승여력).`
        : `손절: 3차 진입가 -7% 이탈 시 전량 청산.`);

    const entryRec = recKey === "strongBuy" || recKey === "buy"
      ? `${e1}% 하락 시 1차 진입(₩${Math.round(priceKRW * (1 - e1/100)).toLocaleString()}). 애널리스트 매수 추천 — RSI 45 이하 확인 후 진입.`
      : recKey === "sell"
      ? `신중한 접근 권장. ${e2}% 이상 하락 확인 후 2차 진입 검토. 손절 철저 준수.`
      : `${e1}% 하락 시 1차 진입(₩${Math.round(priceKRW * (1 - e1/100)).toLocaleString()}). RSI 과매도 + 거래량 증가 확인 후 진입 최적.`;

    const dayFeatures = isKorean ? [
      { day: "월요일", feature: "외국인·기관 매매 방향 결정 요일. 주말 글로벌 이슈 소화로 갭 등락이 잦습니다.", caution: "갭 하락 시 섣부른 추격 매수 금지. 매매 방향 확인 후 진입." },
      { day: "화요일", feature: "수급 안정화 구간. 기관 프로그램 매매 집중되는 경향이 있습니다.", caution: "오전 9:00~9:30 변동성 구간 주의." },
      { day: "수요일", feature: "한 주 중 가장 안정적인 수급 패턴. 추세가 유지되는 경향.", caution: "FOMC 발표 주간에는 야간 미국 장 영향에 주의." },
      { day: "목요일", feature: "기관 분기말·월말 수급 조정 구간. 프로그램 매도 증가 가능.", caution: "선물·옵션 만기일(매월 두 번째 목요일) 변동성 급증 주의." },
      { day: "금요일", feature: "포지션 청산 경향. 주말 리스크 회피로 오후 매도세 강화.", caution: "금요일 오후 보유 포지션 점검 필수. 주말 뉴스 리스크 대비." },
    ] : [
      { day: "월요일", feature: "주말 글로벌 뉴스 소화. 선물 시장 방향 선행 파악 중요.", caution: "갭 변동성 구간. 개장 30분 내 급등락 시 섣부른 진입 금지." },
      { day: "화요일", feature: "수급 안정화. 기술적 신호 신뢰도 높아지는 구간.", caution: "실적 발표 시즌에는 어닝 서프라이즈/쇼크 주의." },
      { day: "수요일", feature: "FOMC 성명 발표 주간에 변동성 최고조. 평소엔 추세 지속 구간.", caution: "FOMC 발표 전후 ±2% 이상 변동 가능. 레버리지 축소 권장." },
      { day: "목요일", feature: "주간 실업수당 청구건수 발표일. 고용 지표 영향 있음.", caution: "월별 CPI·PPI 발표일 겹칠 시 변동성 급증." },
      { day: "금요일", feature: "고용보고서(NFP) 발표일. 포지션 정리로 거래량 감소하는 경향.", caution: "주말 포지션 리스크 최소화. 오후 장 유동성 감소 주의." },
    ];

    const witchDay = !isKorean
      ? `마녀의 날(분기별 옵션·선물 동시 만기) 전날 오후부터 ${ticker} 변동성 급증. 포지션의 50%는 만기 전날 익절 또는 스탑로스 설정. 만기 당일 오전 급락 시 단기 반등 매수 기회.`
      : `옵션 만기일(매월 두 번째 목요일) 전후 수급 왜곡 주의. ${ticker} 포지션은 만기 3일 전부터 비중 조절 권장.`;

    const upside = targetMeanKRW && priceKRW > 0
      ? ` 애널리스트 평균 목표가 ₩${targetMeanKRW.toLocaleString()} (${targetUpPct?.toFixed(0)}% 상승여력).` : "";
    const recStr: Record<string, string> = {
      strongBuy: " 강력 매수 추천.", buy: " 매수 추천.", hold: " 중립 의견.", sell: " 매도 의견.",
    };
    const description =
      `${name}(${ticker}) — ${sector}. ${region} ${grade}. ` +
      `52주 범위 ₩${low52wKRW.toLocaleString()}~₩${high52wKRW.toLocaleString()}, 현재 ${boxPos} 위치. ` +
      [fPer, fPbr, fRoe].filter(Boolean).join(" · ") +
      `${upside}${recStr[recKey] ?? ""}`;

    const themes: string[] = fromUniverse?.sector
      ? [fromUniverse.sector]
      : [sectorEn, industryEn].filter(Boolean).slice(0, 2);
    if (!themes.length) themes.push(sector);

    const result = {
      ticker, market, name, grade, region,
      themes, description, splitEntries, profitTargets,
      boxRange: { support, resistance, currentPosition: boxPos },
      forecasts,
      financials: {
        per: per ?? 0, pbr: pbr ?? 0, roe: roe ?? 0,
        debtRatio: debtRatio ?? 0, revenueGrowth: revenueGrowth ?? 0,
        evaluation, summary: finSummary,
      },
      dayFeatures,
      risk: { geopolitical: mktRisk, technicalBounce: betaStr, strategy: strategyStr },
      witchDayStrategy: witchDay,
      entryRecommendation: entryRec,
    };

    analyzeCache.set(cacheKey, result, TTL.HISTORY);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
