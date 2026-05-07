import { API_BASE } from "@/utils/apiBase";
import type { DetectedPattern } from "@/services/patternDetection";

export interface PatternAnalysisRequest {
  ticker:        string;
  market:        string;
  name?:         string;
  patterns:      DetectedPattern[];
  lastClose?:    number;
  ma5?:          number;
  ma20?:         number;
  ma60?:         number;
  rsi14?:        number;
  recent20High?: number;
  recent20Low?:  number;
}

export async function analyzePattern(req: PatternAnalysisRequest): Promise<string> {
  const resp = await fetch(`${API_BASE}/stocks/pattern-analysis`, {
    method:  "POST",
    headers: { "content-type": "application/json" },
    body:    JSON.stringify(req),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error ?? `pattern-analysis ${resp.status}`);
  }
  const data = await resp.json() as { analysis?: string };
  return data.analysis ?? "";
}
