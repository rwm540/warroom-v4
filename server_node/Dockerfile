FROM node:22-alpine

ENV NODE_ENV=production PORT=4010 HOST=0.0.0.0
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src ./src

# Non-root user warroom for consistency with root Dockerfile.api
RUN addgroup -S warroom && adduser -S warroom -G warroom && chown -R warroom:warroom /app
USER warroom

EXPOSE 4010
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:4010/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["npm", "start"]
