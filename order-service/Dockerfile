FROM node:20

WORKDIR /app
COPY order-service/package*.json ./
RUN npm install

COPY order-service/ .

COPY common/ ./common

CMD ["npm", "run", "start"]
