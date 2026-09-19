# syntax=docker/dockerfile:1.7
#
# Built from the repository root:
#   docker build -f apps/web/Dockerfile .
ARG NODE_IMAGE=node:24-bookworm-slim

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @cloover/web... --filter .

# ---------------------------------------------------------------------------
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
# Opts into Next's standalone output, which traces exactly the files the
# server needs instead of shipping the whole dependency tree.
ENV NEXT_OUTPUT=standalone
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN pnpm --filter @cloover/contracts build \
 && pnpm --filter @cloover/web build

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
