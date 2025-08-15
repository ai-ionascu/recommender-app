FROM node:20

WORKDIR /app

COPY auth-service/package*.json ./
RUN npm install

COPY auth-service/ .

COPY common/ ./common/

EXPOSE 4000

CMD ["npm", "run", "dev"]
