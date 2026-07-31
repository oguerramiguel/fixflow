FROM node:22.14.0-alpine3.21 AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS prisma-client

COPY prisma/schema.prisma ./prisma/schema.prisma
RUN node node_modules/prisma/build/index.js generate

FROM base AS builder

ENV NODE_ENV=production
COPY --from=prisma-client /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS migration

ENV NODE_ENV=production
COPY --from=prisma-client /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
