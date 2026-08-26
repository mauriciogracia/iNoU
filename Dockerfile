# Stage 1: Build & Compilation
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY src/ ./src/
COPY bin/ ./bin/
COPY public/ ./public/
COPY browser/ ./browser/
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8765
ENV HOST=0.0.0.0
ENV INUO_DATA_DIR=/app/data
ENV LOCAL_LLM_URL=http://ollama:11434
ENV LOCAL_LLM_MODEL=qwen2.5:3b

# Install runtime security packages & create non-root user
RUN addgroup -S inuogroup && adduser -S inuo -G inuogroup
RUN mkdir -p /app/data && chown -R inuo:inuogroup /app

# Copy production artifacts & assets
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin
COPY public/ ./public/
COPY inuo-manifest.json ./
COPY docs/ ./docs/

USER inuo
EXPOSE 8765
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8765/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "bin/inuo.js", "serve", "8765"]
