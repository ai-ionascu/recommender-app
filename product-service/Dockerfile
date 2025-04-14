FROM node:18
RUN apt-get update && apt-get install -y postgresql-client
WORKDIR /app
COPY package*.json ./
# COPY .env ./
RUN npm install
COPY . .
CMD ["sh", "-c", "npm run migrate && npm start"]