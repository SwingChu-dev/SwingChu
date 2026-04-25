# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**스윙의 정석** — 개인 스윙트레이딩 앱. Expo React Native(SDK 54) + Express API pnpm 모노레포.

- **데이터**: Yahoo Finance (실시간) · KIS Open API (한국주식 fallback)
- **AI**: Claude Haiku (종목 분석·AI 신호)
- **디자인**: 토스증권 스타일 — `#0064FF` primary, `#F04452` 상승, `#1B63E8` 하락

> 참고: `Swing` 레포는 실수로 만든 중복본 (deprecated). 이 `SwingChu`가 활성 레포입니다. **default branch는 `master`** (main 아님).

## Three environments

This repo runs in three places. Pick workflow based on where Claude Code is running:

### 1. Local (Replit / Windows)
원래는 Replit에서 개발. 윈도우 로컬에서 돌리려면 Git Bash 또는 WSL 필요 — 워크스페이스 루트의 `preinstall` 스크립트가 `sh`를 사용함.

```bash
pnpm install
pnpm --filter @workspace/api-server dev      # API
pnpm --filter @workspace/stock-dashboard start  # Expo Metro :8081
```

### 2. GitHub Codespaces (phone / tablet / any browser)
`.devcontainer/devcontainer.json` 자동 프로비저닝: Node 20 + pnpm + Claude Code CLI.

```bash
pnpm install                                              # postCreateCommand가 자동 실행
pnpm --filter @workspace/api-server dev                   # API
pnpm --filter @workspace/stock-dashboard start            # Expo Metro :8081
pnpm --filter @workspace/api-server typecheck             # 빠른 sanity
```

Secrets는 **GitHub → repo Settings → Secrets and variables → Codespaces** 에 등록. `dotenv`가 기존 env를 덮어쓰지 않으므로 그대로 작동.

필요한 Secrets (사용 중인 외부 API에 따라):
- `DATABASE_URL` — Neon (사용 중이라면)
- `KIS_APPKEY`, `KIS_APPSECRET` — 한국투자증권
- `ANTHROPIC_API_KEY` — Claude Haiku 분석
- `FINNHUB_API_KEY` (선택)

포트 3000 / 8081 / 19000 / 19006 / 5173 자동 포워드.

### 3. Claude Code Web (claude.ai/code — lightweight)
코드 읽기·편집·PR 준비용. 실제 dev 서버는 Codespaces로.

## Workspace layout

```
.
├── artifacts/
│   ├── api-server/        # Express 5 + TypeScript
│   │   └── src/routes/
│   │       ├── stocks.ts          # 시세·상세·분석·뉴스·히스토리·과열진단
│   │       ├── signalAnalysis.ts  # AI 매매신호 (/stocks/signals)
│   │       ├── marketRisk.ts      # 지경학적 리스크
│   │       └── health.ts
│   ├── stock-dashboard/   # Expo 앱 (관심종목·종목 상세 10탭)
│   └── mockup-sandbox/    # Vite UI 샌드박스
├── lib/                   # 공유 패키지 (db, api-zod 등 워크스페이스)
├── scripts/               # 유틸 스크립트
├── .devcontainer/         # GitHub Codespaces config
├── .claude/               # Claude Code per-repo permissions
└── replit.md              # Replit 메타
```

## Key pnpm commands

| Command | What it does |
|---------|--------------|
| `pnpm install` | Install all workspace deps |
| `pnpm --filter @workspace/api-server typecheck` | API 타입 체크 (가장 빠른 sanity) |
| `pnpm --filter @workspace/api-server dev` | API dev 서버 |
| `pnpm --filter @workspace/api-server build` | esbuild 빌드 |
| `pnpm --filter @workspace/stock-dashboard typecheck` | 모바일 타입 체크 |
| `pnpm --filter @workspace/stock-dashboard start` | Expo Metro :8081 |

## Architecture notes

자세한 내용은 `replit.md` 참고. 주요 포인트:

- **API 서버**는 `artifacts/api-server/src/routes/` 아래 라우트 분리. 새 라우트 추가 시 `index.ts`에서 mount.
- **Yahoo Finance + KIS fallback** 패턴으로 한국주식 데이터 수집 (KIS는 1 토큰/분 제한).
- **AI 신호 분류** (`/stocks/signals`): Claude Haiku → fallback 룰엔진. 출력: `세력진입 | 세력이탈 | 매집중 | 분산중 | 관망`.
- **모바일 앱 전용 디자인 토큰**: `#0064FF` (primary), `#F04452` (up), `#1B63E8` (down) — 토스증권 스타일 강제.

## Deploying changes

Default branch는 **`master`**. PR 생성 시 base 주의:
```bash
git checkout -B fix/<name>
git add <files> && git commit -m "..."
git push -u origin fix/<name>
gh pr create --base master --head fix/<name> --title "..." --body "..."
```

## Secrets / environment

Never commit `.env`. 키 목록은 위 "GitHub Codespaces" 섹션 참조.
