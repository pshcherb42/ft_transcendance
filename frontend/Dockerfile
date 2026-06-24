FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm install

COPY frontend/ ./frontend/

WORKDIR /app/frontend
EXPOSE 3000
CMD ["../node_modules/.bin/next", "dev"]
