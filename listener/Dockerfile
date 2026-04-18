FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production image ────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Healthcheck — ECS Fargate проверяет каждые 30 сек
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
