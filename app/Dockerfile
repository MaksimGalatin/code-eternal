FROM node:24-alpine AS builder

ARG NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_PROGRAM_ID=8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_USDC_MINT=""

ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_PROGRAM_ID=$NEXT_PUBLIC_PROGRAM_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_USDC_MINT=$NEXT_PUBLIC_USDC_MINT

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
