FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 4010

ENV PORT=4010
ENV NODE_ENV=production

CMD ["node", "server.js"]
