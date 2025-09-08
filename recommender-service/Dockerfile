FROM node:20-alpine
WORKDIR /app

# (opțional) pentru healthcheck cu curl/wget — Alpine nu le are implicit
RUN apk add --no-cache wget

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3010
CMD ["npm", "start"]
