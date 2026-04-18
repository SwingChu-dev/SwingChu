import { Router } from "express";
import NodeCache from "node-cache";

const router = Router();
const cache  = new NodeCache({ stdTTL: 30 * 60 });

const GEMINI_MODEL = "gemini-2.5-flash";

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.4,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  const resp = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini ${resp.status}: ${JSON.stringify(err)}`);
  }
  const data: any = await resp.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p.text ?? "").join("");
}

interface CoachInput {
  newPositions:         number;
  cooldownSaves:        number;
  totalSavedKRW:        number;
  firedStopLossCount:   number;
  firedTakeProfitCount: number;
  impulseCount:         number;
  monthlyPnLPercent:    number;
  healthScore:          number;
  topCategories:        Array<{ label: string; pct: number }>;
  topSectors:           Array<{ label: string; pct: number }>;
  recentTickers:        string[];
}

interface CoachOutput {
  praise:     string;
  warning:    string;
  nextWeek:   string[];
}

router.post("/weekly-coach", async (req, res) => {
  try {
    const input = req.body as CoachInput;
    if (!input || typeof input !== "object") {
      return res.status(400).json({ error: "Invalid body" });
    }

    const cacheKey = JSON.stringify(input);
    const cached   = cache.get<CoachOutput>(cacheKey);
    if (cached) return res.json(cached);

    const prompt = `당신은 한국 개인 스윙 트레이더의 "뇌동매매 방지 코치"입니다. 아래 주간 데이터를 보고 진심 어린 코멘트를 JSON으로 작성하세요.

## 주간 데이터
- 신규 진입: ${input.newPositions}건
- 뇌동 차단(쿨다운으로 취소): ${input.cooldownSaves}건, 추정 절약: ${Math.round(input.totalSavedKRW / 10000)}만원
- 손절 알림 발사: ${input.firedStopLossCount}회
- 익절 알림 발사: ${input.firedTakeProfitCount}회
- 뇌동 라벨 보유: ${input.impulseCount}개
- 이달 손익률: ${input.monthlyPnLPercent.toFixed(1)}%
- 헬스 스코어: ${input.healthScore}/100
- 카테고리 비중: ${input.topCategories.map(c => `${c.label} ${c.pct.toFixed(0)}%`).join(", ")}
- 섹터 집중: ${input.topSectors.map(s => `${s.label} ${s.pct.toFixed(0)}%`).join(", ")}
- 최근 진입: ${input.recentTickers.slice(0, 5).join(", ") || "없음"}

## 응답 형식 (JSON만)
{
  "praise":   "잘한 점 1-2문장. 데이터 근거 직접 언급. 칭찬할 게 없으면 사실 그대로 짧게.",
  "warning":  "위험 신호 1-2문장. 없으면 빈 문자열.",
  "nextWeek": ["다음 주 행동 가이드 2-3개. 구체적이고 실행가능하게."]
}

## 톤
- 한국어, 솔직하고 담백, 과장 금지
- 구체적 수치 인용 (예: "이달 -8% 손실 중", "뇌동 차단 3건")
- 격려보다 사실 우선
- 비속어/이모지 금지`;

    const text = await callGemini(prompt);
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonMatch = codeBlock ? codeBlock[1].match(/\{[\s\S]*\}/) : text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);

    const out: CoachOutput = {
      praise:   String(parsed.praise   ?? ""),
      warning:  String(parsed.warning  ?? ""),
      nextWeek: Array.isArray(parsed.nextWeek)
        ? parsed.nextWeek.slice(0, 4).map((x: any) => String(x))
        : [],
    };
    cache.set(cacheKey, out);
    return res.json(out);
  } catch (e: any) {
    console.error("[weekly-coach] error:", e);
    return res.status(500).json({ error: e?.message ?? "coach failed" });
  }
});

export default router;
