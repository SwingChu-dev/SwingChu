/**
 * 종목별 Anthropic·AI 산업 노출도. 공개된 자료 기반 큐레이션.
 *
 * 갱신 시점: 2026-05. 분기마다 점검 필요 (특히 투자 라운드·계약 변동).
 * 데이터 없는 종목은 getAnthropicLink가 NONE 폴백 반환.
 */

export type AnthropicRelation =
  | "INVESTOR"        // Anthropic 직접 투자자
  | "MAJOR_CUSTOMER"  // Claude API 핵심 도입사
  | "COMPUTE_PARTNER" // 컴퓨트·전력 공급 (GPU·데이터센터·SMR 등)
  | "COMPETITOR"      // 자체 LLM으로 직접 경쟁
  | "INDIRECT"        // 간접 수혜·반도체 공급망
  | "NONE";           // 직접 노출 없음

export type AnthropicLevel = "높음" | "중간" | "낮음" | "없음";

export interface AnthropicLink {
  level:       AnthropicLevel;
  type:        AnthropicRelation;
  /** 1줄 요약 — 카드 헤더에 표시 */
  description: string;
  /** 3-5 bullet 세부 정보 */
  details:     string[];
  /** 스윙 트레이딩 관점 — 진입·익절 함의 */
  swingNote:   string;
}

const NONE_FALLBACK: AnthropicLink = {
  level:       "없음",
  type:        "NONE",
  description: "조사 진행 중 — Anthropic·AI 산업과의 직접 노출 정보 없음.",
  details:     ["공개된 투자·도입·공급 관계 자료 없음"],
  swingNote:   "Anthropic 뉴스플로우와 무관. AI 테마 매매 시 영향 제한적.",
};

export const ANTHROPIC_DATA: Record<string, AnthropicLink> = {
  // ── INVESTOR (높음) — Anthropic에 직접 투자한 빅테크 ─────────────────
  amzn: {
    level:       "높음",
    type:        "INVESTOR",
    description: "Anthropic 최대 투자자 — AWS Bedrock·Trainium 핵심 파트너십.",
    details:     [
      "누적 투자 ≈ $80억 (2023~2024 라운드 합산)",
      "AWS Bedrock에서 Claude API 일급 호스팅",
      "Anthropic의 신규 모델 학습에 AWS Trainium 칩 채택",
      "Anthropic 매출 성장 = AWS AI 매출 성장과 직접 연동",
    ],
    swingNote:   "Anthropic 모델 출시·매출 발표 시 단기 모멘텀. AI 성장 thesis 핵심 베팅 종목.",
  },
  googl: {
    level:       "높음",
    type:        "INVESTOR",
    description: "Anthropic 2대 투자자 — Gemini 자체 LLM 보유로 hedged 포지션.",
    details:     [
      "누적 투자 ≈ $20~30억 + GCP 크레딧",
      "Anthropic이 Google Cloud TPU도 일부 사용",
      "동시에 Gemini 자체 모델로 직접 경쟁",
      "AI 패권 전쟁에서 양방향 베팅 (own + invest)",
    ],
    swingNote:   "Gemini 신규 발표 + Anthropic 진척 양쪽 모두 호재. AI 캡티브 익스포저 가장 큼.",
  },

  // ── COMPUTE_PARTNER (중간) — GPU·전력 공급 ────────────────────────────
  nvda: {
    level:       "중간",
    type:        "COMPUTE_PARTNER",
    description: "Anthropic 학습·추론 GPU 공급사 — H100·B200 핵심 의존.",
    details:     [
      "Anthropic이 H100·H200·B200 GPU 대량 사용",
      "AWS Trainium 채택으로 일부 다변화 중이나 NVDA 비중 여전히 큼",
      "Anthropic 외 OpenAI·Google·Meta 등 모든 LLM 학습에 NVDA",
      "AI 컴퓨트 수요 = NVDA 데이터센터 매출 직결",
    ],
    swingNote:   "Anthropic 단독 호재로 큰 변동은 없지만, AI 컴퓨트 전반 수요 신호.",
  },
  bwxt: {
    level:       "중간",
    type:        "COMPUTE_PARTNER",
    description: "SMR(소형원전) — AI 데이터센터 전력 공급 후보.",
    details:     [
      "AWS·Google이 SMR로 데이터센터 전력 확보 중",
      "Anthropic 컴퓨트 확장 = AWS·GCP 전력 수요 ↑",
      "BWXT는 미군·NASA 우라늄·SMR 핵심 공급사",
      "직접 계약은 미발표지만 AI 전력 narrative 수혜주",
    ],
    swingNote:   "AI 데이터센터 전력 부족 뉴스 시 강한 반응. 분기 실적보다 narrative 의존.",
  },
  gev: {
    level:       "중간",
    type:        "COMPUTE_PARTNER",
    description: "GE Vernova — 가스터빈·전력 인프라로 AI 데이터센터 수혜.",
    details:     [
      "데이터센터 신규 전력의 큰 비중이 가스터빈",
      "AI 캡엑스 사이클 = 전력 인프라 캡엑스 직결",
      "Anthropic 등 빅테크 컴퓨트 확장 시 간접 수혜",
      "직접 계약은 미발표",
    ],
    swingNote:   "AI 전력 부족 narrative + 금리 인하 시 동반 강세. 변동성 큼.",
  },

  // ── COMPETITOR (낮음) — 직접 경쟁사 ───────────────────────────────────
  msft: {
    level:       "낮음",
    type:        "COMPETITOR",
    description: "OpenAI 단일 베팅 — Anthropic과 직접 경쟁 구도.",
    details:     [
      "OpenAI에 ≈$130억 투자, Azure 독점 호스팅",
      "Copilot·Office 통합 = OpenAI 의존",
      "Anthropic 점유율 확대 = MSFT 직접 위협",
      "Microsoft Phi 자체 SLM도 보유하지만 frontier는 OpenAI",
    ],
    swingNote:   "Anthropic 호재가 MSFT엔 약한 악재로 작용 가능. OpenAI 사건 시 변동성 ↑.",
  },
  meta: {
    level:       "낮음",
    type:        "COMPETITOR",
    description: "Llama 자체 오픈소스 LLM — frontier 경쟁자.",
    details:     [
      "Llama 3·4 자체 모델 공개",
      "Anthropic·OpenAI 폐쇄형 vs Meta 오픈형 전략 충돌",
      "메타버스·광고 의존 매출 → AI 수익화 압박",
      "Anthropic과 직접 매출 충돌은 적음 (B2C·광고)",
    ],
    swingNote:   "Anthropic 단일 뉴스 영향 작음. Meta 자체 AI 발표가 주가 동인.",
  },

  // ── INDIRECT (중간) — 반도체·AI 공급망 ────────────────────────────────
  tsm: {
    level:       "중간",
    type:        "INDIRECT",
    description: "TSMC — Anthropic 학습 GPU(NVDA) 위탁 생산.",
    details:     [
      "NVDA H100·B200 모두 TSMC 4nm·3nm 위탁 생산",
      "AI 컴퓨트 수요 = TSMC 첨단공정 가동률 ↑",
      "Anthropic은 직접 거래 X — NVDA 통한 간접 수혜",
      "지정학(중·미·대만) 리스크는 별도 변수",
    ],
    swingNote:   "AI 컴퓨트 narrative + 첨단공정 가동률 상승 시 동반 강세.",
  },

  // 한국주식·기타 catalog 종목은 기본 NONE 반환
};

export function getAnthropicLink(stockId: string): AnthropicLink {
  return ANTHROPIC_DATA[stockId.toLowerCase()] ?? NONE_FALLBACK;
}
