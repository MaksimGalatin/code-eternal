FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production image ────────────────────────────────────────────
FROM node:18-alpine AS production

WORKDIR /app

# Только prod зависимости
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Healthcheck — ECS Fargate проверяет каждые 30 сек
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
