FROM node:22-alpine

ENV NODE_ENV=production PORT=4010 HOST=0.0.0.0
WORKDIR /app

COPY server_node/package*.json ./
RUN npm ci --omit=dev
COPY server_node/src ./src

USER node
EXPOSE 4010
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:4010/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["npm", "start"]
