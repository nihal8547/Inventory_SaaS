# ==========================================
# STAGE 1: Base Image & Security Prereqs
# ==========================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat dumb-init

# ==========================================
# STAGE 2: Install All Dependencies
# ==========================================
FROM base AS deps
COPY package*.json ./
RUN npm install

# ==========================================
# STAGE 3: Build Source & Generate Prisma
# ==========================================
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Prune development dependencies for minimal production footprint
RUN npm prune --omit=dev

# ==========================================
# STAGE 4: Hardened Production Runner (Non-root)
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

# Copy production artifacts with ownership set to built-in 'node' user
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

# Security Hardening: Run as unprivileged user
USER node

EXPOSE 3001

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health/live || exit 1

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
