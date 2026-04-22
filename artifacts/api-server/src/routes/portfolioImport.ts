/**
 * 증권사 앱 스크린샷 → 보유 종목 자동 추출
 * Claude Haiku의 비전 기능으로 한국 증권사 화면(토스/한투 등)에서
 * 종목명·수량·평가금액을 OCR + 카탈로그 매칭하여 보유 등록을 도움.
 */
import { Router } from "express";

const router = Router();
const CLAUDE_MODEL = "claude-haiku-4-5";

interface CatalogItem {
  ticker:   string;
  nameKr:   string;
  market:   "KOSPI" | "KOSDAQ" | "NASDAQ";
  currency: "KRW" | "USD";
}

interface ParsedPosition {
  nameKrShown:    string;
  ticker:         string | null;
  market:         "KOSPI" | "KOSDAQ" | "NASDAQ" | null;
  currency:       "KRW" | "USD" | null;
  quantity:       number;
  marketValueKRW: number;
  pnlPercent:     number | null;
  matched:        boolean;
}

router.post("/portfolio/parse-image", async (req, res) => {
  try {
    const { image, mimeType, catalog } = req.body as {
      image?:    string;
      mimeType?: string;
      catalog?:  CatalogItem[];
    };
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "image (base64) required" });
    }
    const mt = mimeType ?? "image/jpeg";
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mt)) {
      return res.status(400).json({ error: "unsupported mimeType" });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });

    const catalogTxt = (catalog ?? []).slice(0, 100).map(c =>
      `${c.ticker} (${c.market}/${c.currency}): ${c.nameKr}`
    ).join("\n");

    const prompt = `한국 증권사 앱(토스증권, 한국투자, 미래에셋 등)의 보유종목 화면 스크린샷이다.
각 보유 종목 행에서 다음을 추출하라:
- nameKrShown: 화면에 표시된 한글 이름 그대로
- quantity: 보유 수량 (주)
- marketValueKRW: 평가금액 (원)
- pnlPercent: 표시된 손익률 % (없으면 null, 빨강=양수, 파랑=음수가 한국식)

가능하면 아래 카탈로그에서 ticker/market/currency를 매칭하라.
정확히 매칭되지 않으면 ticker/market/currency 모두 null, matched=false.

== 카탈로그 ==
${catalogTxt}

응답은 반드시 아래 JSON 한 객체만, 코드블록·설명 없이:
{"positions":[{"nameKrShown":"...","ticker":"BWXT","market":"NASDAQ","currency":"USD","quantity":6,"marketValueKRW":1959551,"pnlPercent":0.6,"matched":true}]}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "content-type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:       CLAUDE_MODEL,
        max_tokens:  2048,
        temperature: 0.1,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mt, data: image } },
            { type: "text",  text: prompt },
          ],
        }],
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      return res.status(502).json({ error: `Claude ${resp.status}`, detail: errBody.slice(0, 500) });
    }
    const data: any = await resp.json();
    const text = (data?.content ?? []).map((b: any) => b.text ?? "").join("").trim();

    // JSON 추출 (Claude가 가끔 ```json 래퍼를 붙임)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: "Claude 응답 파싱 실패", raw: text.slice(0, 500) });
    }

    let parsed: { positions?: ParsedPosition[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(502).json({ error: "Claude JSON 파싱 실패", raw: text.slice(0, 500) });
    }

    const positions = Array.isArray(parsed.positions) ? parsed.positions.filter(p =>
      p && typeof p.nameKrShown === "string"
        && Number.isFinite(p.quantity) && p.quantity > 0
        && Number.isFinite(p.marketValueKRW) && p.marketValueKRW > 0
    ) : [];

    return res.json({ positions, asOf: Date.now() });
  } catch (e: any) {
    console.error("[portfolio/parse-image]", e);
    return res.status(500).json({ error: e?.message ?? "unknown" });
  }
});

export default router;
