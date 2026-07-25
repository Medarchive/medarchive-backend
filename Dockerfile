FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

FROM base AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/db/schema ./src/db/schema

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh \
 && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 9090
ENV NODE_ENV=production

ENTRYPOINT ["./entrypoint.sh"]
