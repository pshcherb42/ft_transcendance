FROM node:20-alpine
WORKDIR /app

# Copy root workspace manifests
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all workspace deps from root
RUN npm install

# Copy backend source
COPY backend/ ./backend/

ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate --schema=./backend/prisma/schema.prisma

WORKDIR /app/backend
EXPOSE 3001
CMD ["../node_modules/.bin/nest", "start", "--watch"]
