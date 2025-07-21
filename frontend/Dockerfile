# build
FROM node:18-alpine as builder

WORKDIR /app

COPY package.json ./
COPY common/package.json ./common/
COPY frontend/package*.json ./

RUN npm install

COPY common ./common
COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm run build

# runtime
FROM nginx:alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]