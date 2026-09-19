# syntax=docker/dockerfile:1.7
#
# Built from the repository root so the workspace manifests and the shared
# contracts package are in context:
#   docker build -f apps/api/Dockerfile .
ARG NODE_IMAGE=node:24-bookworm-slim

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---------------------------------------------------------------------------
# Dependencies are installed from the manifests alone, so editing source code
# does not invalidate this layer.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @cloover/api... --filter .

# ---------------------------------------------------------------------------
FROM deps AS build
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @cloover/contracts build \
 && pnpm --filter @cloover/api exec prisma generate \
 && pnpm --filter @cloover/api build

# ---------------------------------------------------------------------------
# Collects the runtime dependency tree.
#
# This installs from scratch with --prod rather than pruning the build stage.
# @prisma/client declares the Prisma CLI and TypeScript as optional peers, and
# pnpm resolves an optional peer to whatever the workspace already has, so
# pruning a dev install drags the CLI, Studio, the query engines and the
# TypeScript compiler into the serving image. Installing without dev
# dependencies in the first place leaves those peers simply absent, which the
# driver-adapter runtime does not need.
FROM base AS bundle
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @cloover/api... --filter .
COPY --from=build /repo/packages/contracts/dist packages/contracts/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
RUN pnpm --filter @cloover/api deploy --prod --legacy /out

# ---------------------------------------------------------------------------
# Applies migrations and seeds. Run as a one-shot job before the API starts,
# rather than from inside the server, so concurrent replicas cannot race to
# migrate the same database. It reuses the build stage because it needs the
# Prisma CLI and the migration files, none of which belong in a serving image.
FROM build AS migrator
WORKDIR /repo/apps/api
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed"]

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=bundle --chown=node:node /out/node_modules ./node_modules
COPY --from=bundle --chown=node:node /out/dist ./dist
COPY --from=bundle --chown=node:node /out/package.json ./package.json

# Runs unprivileged: a container escape then starts without root.
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
