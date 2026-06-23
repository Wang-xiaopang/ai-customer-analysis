# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# 只用 package.json，不锁版本，自动适配 Linux 平台
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install

COPY . .

# 构建时指定后端地址，Docker 内部用 http://backend:8000
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production runtime
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
