FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter=@koomiteh/api...

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ARG BUILT_AT
ENV BUILT_AT=${BUILT_AT}
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-workspace.yaml package.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
