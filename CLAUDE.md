# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**스윙의 정석** — 개인 스윙트레이딩 앱. Expo React Native(SDK 54) + Express API pnpm 모노레포.

- **데이터**: Yahoo Finance (실시간) · KIS Open API (한국주식 fallback)
- **AI**: Claude Haiku (종목 분석·AI 신호)
- **디자인**: 토스증권 스타일 — `#0064FF` primary, `#F04452` 상승, `#1B63E8` 하락

> 참고: `Swing` 레포는 실수로 만든 중복본 (deprecated). 이 `SwingChu`가 활성 레포입니다. **default branch는 `master`** (main 아님).

## Where this runs

Replit·로컬은 더 이상 사용 안 함. 두 가지 환경:

### 1. GitHub Codespaces — 개발 (phone / tablet / any browser)
`.devcontainer/devcontainer.json` 자동 프로비저닝: Node 20 + pnpm + Claude Code CLI.

```bash
pnpm install                                              # postCreateCommand가 자동 실행
pnpm --filter @workspace/api-server dev                   # API :3000
pnpm --filter @workspace/stock-dashboard start            # Expo Metro :8081
pnpm --filter @workspace/api-server typecheck             # 빠른 sanity
```

Secrets는 **GitHub → repo Settings → Secrets and variables → Codespaces** 에 등록. `dotenv`가 기존 env를 덮어쓰지 않으므로 그대로 작동.

필요한 Secrets:
- `DATABASE_URL` — Neon (사용 중이라면)
- `KIS_APPKEY`, `KIS_APPSECRET` — 한국투자증권
- `ANTHROPIC_API_KEY` — Claude Haiku 분석
- `FINNHUB_API_KEY` (선택)

포트 3000 / 8081 / 19000 / 19006 자동 포워드.

### 2. Claude Code Web (claude.ai/code) — 코드 편집 / PR 준비
실제 dev 서버는 못 띄움. 코드 읽기·편집·커밋·PR용.

## Production deploy

### API 서버 — Fly.io
`artifacts/api-server/Dockerfile` + `fly.toml` 준비됨. 워크스페이스 루트에서:

```bash
flyctl auth login
flyctl launch --config artifacts/api-server/fly.toml --dockerfile artifacts/api-server/Dockerfile --no-deploy
flyctl secrets set ANTHROPIC_API_KEY=... KIS_APPKEY=... KIS_APPSECRET=... DATABASE_URL=... --config artifacts/api-server/fly.toml
flyctl deploy --config artifacts/api-server/fly.toml --dockerfile artifacts/api-server/Dockerfile .
```

도커 빌드 컨텍스트는 항상 워크스페이스 루트(`.`)여야 함 — Dockerfile이 `lib/`와 `pnpm-workspace.yaml`을 참조하기 때문.

### 모바일 앱 — EAS Build + EAS Update
첫 셋업:

```bash
cd artifacts/stock-dashboard
pnpm dlx eas-cli login
pnpm dlx eas-cli init                                         # projectId 생성, app.json/eas.json 자동 갱신
pnpm dlx eas-cli build --profile preview --platform ios       # 본인 폰 설치용 .ipa
pnpm dlx eas-cli build --profile preview --platform android   # .apk
```

이후 OTA 업데이트:

```bash
pnpm dlx eas-cli update --branch preview --message "<요약>"
```

`app.json`의 `updates.url`과 `extra.eas.projectId`는 `eas init` 실행 시 채워짐 (현재는 `REPLACE_WITH_PROJECT_ID` placeholder).

배포 환경변수는 EAS Secrets로 설정:
```bash
pnpm dlx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://swingchu-api.fly.dev
```

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
└── .claude/               # Claude Code per-repo permissions
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

## PR / merge policy

이 레포의 PR은 **Claude가 자동 머지**한다. 별도 확인 없이:

- 작업 완료 후 PR 만들고 CI/리뷰 코멘트 비어있으면 즉시 `merge` 메서드로 머지
- 단, 다음 경우엔 머지 전에 사용자에게 한 번 짚는다:
  - 시크릿 노출·키 회전 같은 보안 영향 PR
  - 데이터 마이그레이션·DB 스키마 파괴적 변경
  - 외부 서비스 청구·요금에 영향이 큰 변경 (예: 더 비싼 인스턴스 타입)

워크플로 실패 시엔 머지하지 않고 원인 디버깅 우선.

## Secrets / environment

Never commit `.env`. 키 목록은 위 "GitHub Codespaces" 섹션 참조.
