# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with Yahoo Finance integration for Korean stock trading app.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- Routes: `src/routes/stocks.ts` — all stock API endpoints (TTL cached):
  - `GET /stocks/quotes` — real-time prices (30s TTL)
  - `GET /stocks/detail` — financial details / 52w range (5m TTL)
  - `GET /stocks/screen` — undervalue screener (10m TTL)
  - `GET /stocks/news` — news + sentiment (15m TTL)
  - `GET /stocks/history` — 1yr OHLC for backtesting (1h TTL)
  - `GET /stocks/search` — ticker search (5m TTL)
  - `GET /stocks/analyze` — **AI analysis**: 1yr drawdown-percentile split entries + analyst-target profit targets + full StockInfo fields (1h TTL)
  - `GET /stocks/overheating` — **과열진단**: RSI-14·MA20/60 이격도·52주 위치·Forward P/E 방향·매출/EPS 성장률 → 과열점수(0-100) + 시그널 리스트 (5m TTL)
  - `GET /stocks/signals` — **AI 신호 분석** (Claude Haiku-4-5): RSI-14, MACD, 볼린저밴드, 거래량비율 → 세력감지/단타레이더 JSON (10분 TTL); `?items=TICKER:MARKET,...` 형식
- **Data sources (Yahoo Finance 단일화)**:
  - **가격 데이터 (실시간 · 일봉)**: Yahoo Finance 전용
    - 국내주식: `${ticker}.KS` / `${ticker}.KQ` 형식
    - 미국주식: 티커 그대로 사용
    - USD/KRW: `USDKRW=X` (5분 TTL, 기본값 1450)
  - **재무 데이터** (PER, PBR, ROE 등): Yahoo Finance quoteSummary (5분 캐시)
  - **뉴스 · 검색**: Yahoo Finance
  - KIS API는 코드에서 완전 제거됨 (kis.ts 파일 자체는 Bar 타입 export로 유지)
- `calcEntries()` uses rolling 20-day peak drawdown distribution (35/62/87th percentile) → real volatility-based split entry levels
- `calcProfitTargets()` uses analyst target mean as anchor for pt3

### `artifacts/stock-dashboard` (`@workspace/stock-dashboard`)

Expo React Native mobile app — Korean swing trading dashboard **스윙의 정석**. Toss Securities UI style.

- **Predefined stocks (24)**: NVDA, GOOGL, IONQ, SNDK, EONR, BNAI, PLTR, BATL, XEL, BWXT, GEV, LMT, GNRG [NASDAQ/NYSE], 005930, 000660, 012450, 005380, 034020, 042660, 010140, 329180, 006400, 032820, 우리기술 [KOSPI/KOSDAQ]
- **AsyncStorage keys**: `@watchlist_ids_v2`, `@custom_stocks_v2`, `@portfolio_v2`, `@price_alerts_v1`, `@seen_signal_ids`, `@enriched_v1`
- **Provider chain**: WatchlistProvider → EnrichmentProvider → AISignalBridge(AISignalProvider) → PriceBridge(StockPriceProvider) → AlertProvider → PortfolioProvider → SignalProvider → RootLayoutNav
- **AISignalContext** (`context/AISignalContext.tsx`): 워치리스트 종목 5개씩 청크 → `/api/stocks/signals` 호출 → 세력감지(AISmartMoneySignal) + 단타레이더(AIScalpSignal) 제공; 10분 TTL + AsyncStorage 캐시
- **EnrichmentContext** (`context/EnrichmentContext.tsx`): bookmarked non-predefined stocks auto-trigger `enrichStock()` → `/api/stocks/analyze` → AsyncStorage `@enriched_v1` (24h TTL)
- **Navigation**: 단일 탭(관심종목). 더보기 탭 제거. 도구(레이더·신호·섹터·리스크·전략)는 메인화면 하단 도구 섹션에서 바로 접근.
- **Stock detail** (`app/stock/[id].tsx`): 13 tabs — 진입, 익절, 박스권, 전망, 재무, 기술, 리스크, 요일, 뉴스, 백테스트, 이스라엘, 공매도, 과열진단; data priority: enrichedData → detail API → stub
- **공매도 탭** (`components/detail/ShortSellSection.tsx`): shortRatio, shortPercentOfFloat, sharesShort 기반 0-100 위험 지수 + 게이지 + 해석 가이드 (미국주식만; 한국주식 KRX 데이터 미포함)
- **Design**: `#0064FF` primary, `#F04452` rise, `#1B63E8` fall, `TOSS_ORANGE` warning

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
