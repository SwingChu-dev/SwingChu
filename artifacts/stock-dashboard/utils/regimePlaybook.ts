/**
 * 공격적 중단기 스윙 트레이더용 국면별 행동 수칙.
 *
 * 11단계 Stovall 사이클 phase를 4개 regime으로 묶어 각 regime마다 진입·익절·사이즈·금지
 * 4 카테고리의 구체 규칙을 담는다. 콘텐츠는 정적 큐레이션 (AI 호출·외부 fetch 없음).
 */

import type { CyclePhase } from "@/hooks/useMarketIntel";

export type RegimeKey = "BULL_EARLY" | "BULL_HOT" | "SIDEWAYS" | "BEAR";

export interface Playbook {
  key:     RegimeKey;
  label:   string;
  emoji:   string;
  color:   string;
  summary: string;
  rules: {
    entry:  string[];
    exit:   string[];
    sizing: string[];
    avoid:  string[];
  };
}

const PHASE_TO_REGIME: Record<CyclePhase, RegimeKey> = {
  DISBELIEF:    "BULL_EARLY",
  HOPE:         "BULL_EARLY",
  OPTIMISM:     "BULL_EARLY",
  BELIEF:       "BULL_HOT",
  THRILL:       "BULL_HOT",
  EUPHORIA:     "BULL_HOT",
  COMPLACENCY:  "SIDEWAYS",
  ANXIETY:      "SIDEWAYS",
  DENIAL:       "BEAR",
  PANIC:        "BEAR",
  CAPITULATION: "BEAR",
};

const PLAYBOOKS: Record<RegimeKey, Playbook> = {
  BULL_EARLY: {
    key:     "BULL_EARLY",
    label:   "회복 / 불장 초입",
    emoji:   "🌱",
    color:   "#22C55E",
    summary: "추세 막 시작. 가장 보상 큰 구간 — 사이즈 키우고 손절은 여유롭게.",
    rules: {
      entry: [
        "MA20 위에 안착한 종목 위주 분할 매수 (3~5회).",
        "RSI 40~60 구간 + 거래량 1.5배 이상에서 진입.",
        "관심 카테고리 우량주 비중을 우선 채워 넣기.",
      ],
      exit: [
        "분할 익절 +8% / +15% / +25% 설정.",
        "손절 -8~10% (변동성 흡수 위해 넓게).",
        "MA20 이탈 + 거래량 동반 하락 시 절반 청산.",
      ],
      sizing: [
        "총 포지션 비중 70~85% 유지.",
        "단일 종목 최대 비중 15% 이내.",
        "현금 15~30%는 기회 종목용 보존.",
      ],
      avoid: [
        "추세 미확정 종목 추격 매수.",
        "20일선 깨진 직후 \"저점\"이라며 즉시 분할.",
      ],
    },
  },

  BULL_HOT: {
    key:     "BULL_HOT",
    label:   "과열 / 불장 후반",
    emoji:   "🔥",
    color:   "#F04452",
    summary: "환희 구간. 추세는 살아있지만 신규 진입 위험↑. 익절 짧게, 현금 회복.",
    rules: {
      entry: [
        "신규 진입 자제. 추세 추종은 트레일링 스탑으로만.",
        "굳이 진입한다면 사이즈 1/2, 박스 상단 돌파 확인 후.",
        "RSI 70+ 종목은 신규 진입 금지.",
      ],
      exit: [
        "분할 익절 단위 짧게 +3~5% 단위.",
        "트레일링 스탑 -5%로 좁힘.",
        "VIX 20+로 튀거나 거래량 폭증 시 50% 즉시 청산.",
      ],
      sizing: [
        "현금 비중 30~50%로 점진 회복.",
        "신규 단일 종목 5% 이내.",
        "익절 자금은 현금 유지 (재진입 X).",
      ],
      avoid: [
        "FOMO 진입 — 차트 끝에 매수.",
        "손절선 \"조금만 더\" 미루기.",
        "과열 신호 무시한 추격 매수.",
      ],
    },
  },

  SIDEWAYS: {
    key:     "SIDEWAYS",
    label:   "횡보 / 정체",
    emoji:   "↔️",
    color:   "#F59E0B",
    summary: "방향성 부재. 박스권 매매에 집중, 사이즈 절반.",
    rules: {
      entry: [
        "박스 하단 -2% 진입 / 상단 +3% 익절 룰 엄격 준수.",
        "지지선 2회 이상 검증된 종목만.",
        "거래량 증가 + RSI 40~50 동시 충족 시 1차 진입.",
      ],
      exit: [
        "익절 +3~5% 단위로 짧게 끊기.",
        "손절 -4~5% (박스 이탈 즉시).",
        "박스 상단 도달 시 절반 익절 후 트레일.",
      ],
      sizing: [
        "단일 종목 진입 사이즈 평소의 50%.",
        "현금 비중 40~50% 유지.",
        "동시 박스권 종목 3~4개 이상 보유 자제.",
      ],
      avoid: [
        "돌파 기대 매수 (박스 상단 +3% 추격).",
        "장기 보유 의도 — 박스 안에서는 회전이 답.",
        "스윙 시간 늘려 잡기.",
      ],
    },
  },

  BEAR: {
    key:     "BEAR",
    label:   "하락 / 공포",
    emoji:   "🛡️",
    color:   "#1B63E8",
    summary: "관망이 최고 수익. 현금 비중 50%+, 리바운드만 짧게 잡기.",
    rules: {
      entry: [
        "VIX 30+ 또는 F&G 25 이하에서만 50% 분할 진입 시작.",
        "베어마켓 랠리는 +5~7%만 노리고 즉시 익절.",
        "필수재·헬스케어 우량주만 우선.",
      ],
      exit: [
        "익절 +5~7% 짧게 끊기.",
        "손절 -5% 엄격 (관용 0).",
        "기술적 반등 신호 사라지면 즉시 청산.",
      ],
      sizing: [
        "현금 비중 50~70%.",
        "단일 종목 사이즈 평소의 1/3.",
        "신용·레버리지 금지.",
      ],
      avoid: [
        "\"바닥\" 예측 매수.",
        "하락 종목 물타기.",
        "신규 진입 종목 다수 진입.",
      ],
    },
  },
};

export function regimeFromPhase(phase: CyclePhase): RegimeKey {
  return PHASE_TO_REGIME[phase];
}

export function playbookFor(phase: CyclePhase): Playbook {
  return PLAYBOOKS[PHASE_TO_REGIME[phase]];
}
