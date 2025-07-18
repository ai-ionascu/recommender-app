FROM node:18
RUN apt-get update && apt-get install -y postgresql-client

WORKDIR /app

COPY product-service/package*.json ./
COPY common ./common/

RUN npm install

COPY product-service/. .

CMD ["sh", "-c", "npm run migrate && npm start"]