FROM node:18
RUN apt-get update && apt-get install -y postgresql-client

WORKDIR /app

COPY common ./common
RUN cd common && npm install

COPY product-service/package*.json ./product-service/
COPY product-service/src ./product-service/src
COPY product-service/wait-for-db.sh ./product-service/
COPY product-service/.env ./product-service/

WORKDIR /app/product-service
RUN npm install
RUN chmod +x wait-for-db.sh

CMD ["sh", "-c", "./wait-for-db.sh && npm run start:with-migrate"]
