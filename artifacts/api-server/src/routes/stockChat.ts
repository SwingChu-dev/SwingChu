import { Router } from "express";
import { rateLimit } from "../lib/rateLimit";

const router = Router();

const MODEL = "claude-haiku-4-5";

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

interface StockContext {
  ticker:        string;
  market:        string;
  name?:         string;
  currentPrice?: number;
  changePct?:    number;
  rsi14?:        number;
  ma20?:         number;
  ma60?:         number;
  high52w?:      number;
  low52w?:       number;
  smartMoneySummary?: string;
}

interface ChatBody {
  context:  StockContext;
  messages: ChatMessage[];
}

function buildSystemPrompt(ctx: StockContext): string {
  const lines: string[] = [
    `당신은 한국 스윙 트레이더의 1:1 분석 어시스턴트입니다.`,
    `종목: ${ctx.name ?? ctx.ticker} (${ctx.ticker} · ${ctx.market})`,
  ];
  if (ctx.currentPrice != null) {
    lines.push(
      `현재가: ${ctx.currentPrice.toLocaleString()}` +
        (ctx.changePct != null ? ` (${ctx.changePct >= 0 ? "+" : ""}${ctx.changePct.toFixed(2)}%)` : ""),
    );
  }
  if (ctx.rsi14 != null) lines.push(`RSI(14): ${ctx.rsi14.toFixed(1)}`);
  if (ctx.ma20 != null && ctx.ma60 != null) {
    lines.push(`MA20/MA60: ${ctx.ma20.toFixed(2)} / ${ctx.ma60.toFixed(2)}`);
  }
  if (ctx.high52w != null && ctx.low52w != null) {
    lines.push(`52주 범위: ${ctx.low52w.toFixed(2)} ~ ${ctx.high52w.toFixed(2)}`);
  }
  if (ctx.smartMoneySummary) {
    lines.push(`AI 신호 요약: ${ctx.smartMoneySummary}`);
  }
  lines.push(
    "",
    "톤·규칙:",
    "- 한국어, 담백·솔직. 과장 금지. 매수·매도 강권 금지.",
    "- 위 데이터 외에 추측이 필요하면 명시 (\"공시·뉴스로 확인 필요\").",
    "- 답은 6문장 이내. 마크다운 헤더 금지, 짧은 단락·불릿만.",
    "- \"투자 판단은 본인 책임\"을 매번 반복하지 말 것 — 첫 답에 한 번이면 충분.",
  );
  return lines.join("\n");
}

router.post("/stocks/chat", rateLimit("stocks-chat", 50), async (req, res) => {
  try {
    const body = req.body as ChatBody;
    if (!body?.context?.ticker || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: "context.ticker and messages required" });
    }
    if (body.messages.length > 20) {
      return res.status(400).json({ error: "messages length capped at 20" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY missing" });

    const system = buildSystemPrompt(body.context);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:       MODEL,
        max_tokens:  600,
        temperature: 0.4,
        system,
        messages:    body.messages.map((m) => ({
          role:    m.role,
          content: String(m.content ?? "").slice(0, 2000),
        })),
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return res.status(502).json({ error: `claude ${resp.status}`, detail: err });
    }

    const data: any = await resp.json();
    const blocks: any[] = data?.content ?? [];
    const text = blocks.map((b: any) => b?.text ?? "").join("").trim();

    return res.json({
      reply: text || "(응답 비어있음)",
      model: MODEL,
    });
  } catch (e: any) {
    console.error("[stocks/chat] error:", e);
    return res.status(500).json({ error: e?.message ?? "chat failed" });
  }
});

export default router;
