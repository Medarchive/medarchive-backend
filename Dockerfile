FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
# drizzle-kit is a devDep but needed for migrations at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json pnpm-lock.yaml drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema ./src/db/schema

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 9090

ENTRYPOINT ["./entrypoint.sh"]
