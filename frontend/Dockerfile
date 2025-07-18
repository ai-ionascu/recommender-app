# build
FROM node:18-alpine as builder

WORKDIR /app
COPY frontend/package*.json ./
COPY ../common ./common
RUN npm install

ARG VITE_API_URL
ARG VITE_CLOUDINARY_UPLOAD_URL
ARG VITE_CLOUDINARY_UPLOAD_PRESET

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLOUDINARY_UPLOAD_URL=$VITE_CLOUDINARY_UPLOAD_URL
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

COPY frontend/. .
RUN npm run build

# runtime
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]