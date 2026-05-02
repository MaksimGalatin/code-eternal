FROM node:24-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm install
COPY . .
RUN npm run build

FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm install --omit=dev && \
    npm cache clean --force && \
    apk del python3 make g++

COPY --from=builder /app/.next ./.next

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npx", "next", "start"]
