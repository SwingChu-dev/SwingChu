import { Router } from "express";

const router = Router();

// ── RSS 파싱 유틸 ────────────────────────────────────────────────────────
function extractTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());
  }
  return results;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
}

// ── 리스크 키워드 점수 ────────────────────────────────────────────────────
const HIGH_RISK   = ["trade war", "tariff hike", "tariff increase", "sanction", "ban chinese", "decoupling", "escalat", "retaliati", "관세 전쟁", "무역 전쟁", "제재"];
const MED_RISK    = ["tariff", "trade", "executive order", "deal collapse", "negotiat", "관세", "행정명령", "협상 결렬"];
const LOW_RISK    = ["relief", "exemption", "deal", "agreement", "truce", "pause", "delay", "면제", "합의", "협상"];
const CALM_WORDS  = ["stable", "positive", "progress", "improve"];

function scoreHeadline(headline: string): number {
  const lower = headline.toLowerCase();
  if (HIGH_RISK.some(w => lower.includes(w)))  return 3;
  if (MED_RISK.some(w => lower.includes(w)))   return 1.5;
  if (LOW_RISK.some(w => lower.includes(w)))   return -0.5;
  if (CALM_WORDS.some(w => lower.includes(w))) return -1;
  return 0;
}

function levelFromScore(score: number): "calm" | "low" | "medium" | "high" | "extreme" {
  if (score >= 20) return "extreme";
  if (score >= 12) return "high";
  if (score >= 6)  return "medium";
  if (score >= 2)  return "low";
  return "calm";
}

const LEVEL_LABEL: Record<string, string> = {
  calm:    "안전 — 트럼프 무역 이슈 미미",
  low:     "주의 — 관련 뉴스 등장",
  medium:  "경계 — 관세·무역 갈등 확대",
  high:    "위험 — 무역전쟁 고조 국면",
  extreme: "극도 위험 — 시장 충격 주의",
};

// ── 캐시 (5분) ────────────────────────────────────────────────────────────
let _cache: any = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchTrumpRisk() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const queries = [
    "Trump+tariff+trade",
    "Trump+tariff+China",
    "Trump+executive+order+trade",
  ];

  const allHeadlines: { title: string; source: string; pubDate: string }[] = [];

  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StockApp/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const xml = await res.text();

      // <item>...</item> 블록만 추출
      const itemBlocks = extractTags(xml, "item");
      for (const item of itemBlocks.slice(0, 10)) {
        const titleArr   = extractTags(item, "title");
        const sourceArr  = extractTags(item, "source");
        const pubDateArr = extractTags(item, "pubDate");
        const title = stripHtml(titleArr[0] ?? "");
        const SKIP = ["google news", "top stories", "breaking news"];
        if (!title || title.length < 15 || SKIP.includes(title.toLowerCase())) continue;
        const already = allHeadlines.some(h => h.title === title);
        if (!already) {
          allHeadlines.push({
            title,
            source:  stripHtml(sourceArr[0] ?? ""),
            pubDate: stripHtml(pubDateArr[0] ?? ""),
          });
        }
      }
    } catch {}
  }

  // 점수 계산
  let totalScore = 0;
  for (const h of allHeadlines) totalScore += scoreHeadline(h.title);
  const score = Math.max(0, Math.min(30, totalScore));
  const level = levelFromScore(score);

  // 상위 5개 헤드라인만 반환
  const headlines = allHeadlines.slice(0, 6);

  const result = {
    score,
    maxScore: 30,
    level,
    label: LEVEL_LABEL[level],
    headlines,
    fetchedAt: new Date().toISOString(),
    headlineCount: allHeadlines.length,
  };

  _cache = result;
  _cacheTime = Date.now();
  return result;
}

// ── 라우트 ────────────────────────────────────────────────────────────────
router.get("/stocks/trump-risk", async (_req, res) => {
  try {
    const data = await fetchTrumpRisk();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
