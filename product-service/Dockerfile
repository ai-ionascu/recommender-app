FROM node:18
RUN apt-get update && apt-get install -y postgresql-client

WORKDIR /app/product-service

COPY common ./common

COPY product-service/package*.json ./

RUN npm install

COPY product-service/src ./src
COPY product-service/wait-for-db.sh ./
COPY product-service/.env ./

RUN chmod +x wait-for-db.sh

CMD ["sh", "-c", "./wait-for-db.sh && npm run start:with-migrate"]