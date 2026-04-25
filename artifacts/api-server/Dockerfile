FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
RUN pnpm install --frozen-lockfile --filter @workspace/api-server...
COPY lib/api-zod ./lib/api-zod
COPY lib/db ./lib/db
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm --filter @workspace/api-server build
# Produce a hoisted, deployable node_modules with only production deps.
# --legacy: pnpm v10+ requires this unless inject-workspace-packages=true.
RUN pnpm deploy --legacy --filter=@workspace/api-server --prod /out

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/dist ./dist
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/index.cjs"]
