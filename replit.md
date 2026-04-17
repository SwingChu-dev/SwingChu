# 스윙의 정석 — 개인 스윙트레이딩 앱

## 개요
Expo React Native(SDK 54) + Express API 서버 pnpm 모노레포.
개인 스윙트레이딩 전용 앱. 야후 파이낸스 실시간 시세, Claude Haiku AI 분석, KIS Open API 연동.

## 기술 스택
- **모노레포**: pnpm workspaces
- **앱**: Expo React Native SDK 54 (TypeScript)
- **API**: Express 5 + tsx (TypeScript)
- **데이터**: Yahoo Finance (실시간) · KIS Open API (한국주식 fallback)
- **AI**: Claude Haiku (종목 분석·AI 신호)
- **디자인**: 토스증권 스타일 — #0064FF primary, #F04452 상승, #1B63E8 하락

## 구조

```
artifacts/
├── api-server/          # Express API 서버 (포트 8080)
│   └── src/routes/
│       ├── stocks.ts        # 시세·상세·분석·뉴스·히스토리·과열진단
│       ├── signalAnalysis.ts # AI 매매신호 (/stocks/signals)
│       ├── marketRisk.ts    # 지경학적 리스크
│       └── health.ts
└── stock-dashboard/     # Expo 앱
    ├── app/
    │   ├── (tabs)/
    │   │   ├── index.tsx    # 관심종목 메인 탭
    │   │   └── more.tsx     # 더보기 메뉴
    │   ├── stock/[id].tsx   # 종목 상세 (10탭)
    │   ├── geopolitical-risk.tsx
    │   └── add-stock.tsx
    ├── components/detail/
    │   ├── SplitEntrySection.tsx   # 5% 매수그물 (0/-5/-10/-15/-20%)
    │   ├── ProfitTargetSection.tsx # 3·5·8·15 분할 익절
    │   ├── BacktestSection.tsx     # 백테스트 (5% 그물망 전략)
    │   ├── TechnicalSection.tsx    # 기술지표 (실시간)
    │   ├── OverheatSection.tsx     # 과열진단
    │   ├── ShortSellSection.tsx    # 공매도
    │   ├── FinancialsSection.tsx   # 재무
    │   ├── ForecastSection.tsx     # 전망
    │   ├── RiskSection.tsx         # 리스크
    │   ├── DayFeaturesSection.tsx  # 요일 특성
    │   ├── NewsSection.tsx         # 뉴스
    │   ├── BoxRangeSection.tsx     # 박스권
    │   ├── IsraelSection.tsx       # 이스라엘 지경학
    │   └── AlertSettingsModal.tsx  # 알림 설정
    └── constants/
        ├── stockData.ts    # 종목 정의 (15개)
        └── israelData.ts   # 이스라엘 관련 종목 데이터
```

## 종목 상세 10탭 (v2 — 연관 탭 묶기)
진입 | 익절 | 박스권 | 재무·전망 | 기술·진단 | 리스크 | 요일 | 뉴스 | 백테스트 | 이스라엘
- 재무·전망: FinancialsSection + ForecastSection (수직 배치)
- 기술·진단: TechnicalSection + OverheatSection (수직 배치)
- 리스크: ShortSellSection + RiskSection (수직 배치)

## 지경학적 리스크 AI 코멘트
marketRisk.ts에서 VIX·유가·금·달러 4개 요인 중 가중치 가장 높은 요인을 rule-based 선별,
한 줄 해석(aiComment)을 API 응답에 포함 → geopolitical-risk.tsx 배너로 표시

## 푸시 알림 시스템
- expo-notifications: 포그라운드/백그라운드 즉시 로컬 알림
- expo-background-fetch + expo-task-manager: 앱 종료 후에도 15분마다 가격 체크
- AlertContext.checkPrices() → 조건 충족 시 sendAlertNotification() 호출
- AlertSettingsModal: 전략 퀵셋 버튼 추가
  - 매수 타점: -5/-10/-15/-20% (현재가 기준 원터치 등록)
  - 익절 타점: +3/+5/+8/+15% (원터치 등록)
  - 중복 등록 방지 (초록 체크 표시)
- 알림 유형: 매수 타점 진입 ↓ / 목표가 도달 ↑ / RSI 과매수·과매도 / 수익 목표 달성

## 매매 전략 (실제 적용)
- **매수**: 5% 단위 매수그물 — 0/-5/-10/-15/-20%, 비중 10/15/20/25/30%
- **매도**: 3·5·8·15% 4단계 분할 익절, 각 25%씩
- **손절**: MA5·MA20 하단 -2% 이탈 시 즉시

## API 캐시 TTL
- QUOTES 30초 / DETAIL 5분 / SCREEN 10분 / NEWS 15분 / HISTORY 1시간 / ANALYZE 30분 / OVERHEATING 5분

## 등록 종목 (15개)
국내: 에코프로(KOSDAQ), 한국항공우주(KOSPI), 현대해상(KOSPI), LS ELECTRIC(KOSPI)
해외: EONR, NVDA, TSLA, PLTR, MSTR, SNDK, AMD, AMZN, BWXT, GEV, OKLO

## 시크릿
- ANTHROPIC_API_KEY (Claude Haiku)
- KIS_APPKEY / KIS_APPSECRET (KIS Open API)
