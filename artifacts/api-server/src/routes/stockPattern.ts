/**
 * 종목 차트 패턴 AI 심층 해설.
 *
 * 클라이언트가 규칙 기반으로 박스권/눌림목/추세전환 등을 1차 감지한 뒤
 * "AI 자세히" 버튼을 누르면 본 라우트가 호출됨. Claude Haiku에게 종목 컨텍스트 +
 * 규칙 기반 결과를 던지고 진입·익절·손절 함의를 1~2문단 한국어로 받음.
 */
import { Router } from "express";
import { rateLimit } from "../lib/rateLimit";

const router = Router();
const MODEL  = "claude-haiku-4-5";

interface ClientPattern {
  kind:       string;
  confidence: "low" | "medium" | "high";
  detail:     string;
  evidence:   string;
}

interface ChartSnapshot {
  ticker:   string;
  market:   string;
  name?:    string;
  /** 클라이언트가 이미 detect한 패턴들 — Claude는 이걸 검증·심화 해설 */
  patterns: ClientPattern[];
  /** 최근 가격 + 핵심 지표 요약 */
  lastClose?: number;
  ma5?:  number;
  ma20?: number;
  ma60?: number;
  rsi14?: number;
  recent20High?: number;
  recent20Low?:  number;
}

router.post("/stocks/pattern-analysis", rateLimit("stocks-pattern", 30), async (req, res) => {
  try {
    const body = req.body as ChartSnapshot;
    if (!body?.ticker || !Array.isArray(body.patterns)) {
      return res.status(400).json({ error: "ticker + patterns required" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY missing" });

    const ctxLines: string[] = [
      `종목: ${body.name ?? body.ticker} (${body.ticker} · ${body.market})`,
    ];
    if (body.lastClose != null) ctxLines.push(`현재가: ${body.lastClose}`);
    if (body.ma5  != null) ctxLines.push(`MA5: ${body.ma5.toFixed(2)}`);
    if (body.ma20 != null) ctxLines.push(`MA20: ${body.ma20.toFixed(2)}`);
    if (body.ma60 != null) ctxLines.push(`MA60: ${body.ma60.toFixed(2)}`);
    if (body.rsi14 != null) ctxLines.push(`RSI(14): ${body.rsi14.toFixed(1)}`);
    if (body.recent20High != null && body.recent20Low != null) {
      ctxLines.push(`최근 20봉 범위: ${body.recent20Low.toFixed(2)} ~ ${body.recent20High.toFixed(2)}`);
    }

    const patternLines = body.patterns.map(
      (p) => `- ${p.kind} (신뢰도 ${p.confidence}): ${p.detail} [${p.evidence}]`
    ).join("\n");

    const system = `당신은 한국 스윙 트레이더의 차트 분석 보조 도구입니다.
규칙 기반 감지 결과를 받아 더 깊이 있는 진입·익절·손절 함의를 한국어로 1~2문단 (총 3-5문장) 작성하세요.

규칙:
- 한국어, 담백·솔직. 과장 금지. "반드시 매수" 같은 단정적 표현 금지.
- 규칙 결과를 부정하지 말고 보완·심화하라. 다른 시나리오 1개 정도 살짝 언급 OK.
- 마지막 문장은 항상 "투자 판단은 본인 책임"을 함의 (직접 명시 X, 톤으로).
- 마크다운 헤더·불릿 금지. 자연스러운 단락만.`;

    const user = `## 차트 컨텍스트
${ctxLines.join("\n")}

## 규칙 기반 감지 결과
${patternLines}

위 결과를 바탕으로 진입·익절·손절 관점에서 어떻게 활용할지 1~2문단 해설.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:       MODEL,
        max_tokens:  500,
        temperature: 0.3,
        system,
        messages:    [{ role: "user", content: user }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return res.status(502).json({ error: `claude ${resp.status}`, detail: err });
    }

    const data: any = await resp.json();
    const blocks: any[] = data?.content ?? [];
    const text = blocks.map((b: any) => b?.text ?? "").join("").trim();

    return res.json({ analysis: text || "(응답 비어있음)", model: MODEL });
  } catch (e: any) {
    console.error("[stocks/pattern-analysis] error:", e);
    return res.status(500).json({ error: e?.message ?? "pattern analysis failed" });
  }
});

export default router;
