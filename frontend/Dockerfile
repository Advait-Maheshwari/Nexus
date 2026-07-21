FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install

COPY frontend ./frontend
COPY packages/shared ./packages/shared

EXPOSE 5173

CMD ["npm", "--workspace", "frontend", "run", "dev"]

