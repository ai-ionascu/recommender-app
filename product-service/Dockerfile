FROM node:20-alpine
RUN apk add --no-cache bash curl && \
    (apk add --no-cache postgresql-client || apk add --no-cache postgresql16-client)

WORKDIR /app

COPY common ./common
RUN cd common && npm install

COPY product-service/package*.json ./product-service/
COPY product-service/src ./product-service/src
COPY product-service/wait-for-db.sh ./product-service/
COPY product-service/.env ./product-service/

COPY product-service/es-bootstrap.sh ./product-service/es-bootstrap.sh
COPY scripts ./product-service/scripts

WORKDIR /app/product-service
RUN npm install
RUN chmod +x wait-for-db.sh es-bootstrap.sh

CMD ["sh", "-c", "./wait-for-db.sh && ./es-bootstrap.sh && npm run start:with-migrate"]
