# Stage 1: Build
# 使用阿里云镜像，国内拉取快
FROM registry.cn-hangzhou.aliyuncs.com/library/node:24-alpine AS builder

WORKDIR /app

# npm 用阿里云镜像加速
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci --omit=dev

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production runtime
FROM registry.cn-hangzhou.aliyuncs.com/library/node:24-alpine AS runner

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
