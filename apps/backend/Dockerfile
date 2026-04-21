FROM node:20-alpine

WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN apk add --no-cache git openssl \
  && npm ci

COPY apps/backend apps/backend

RUN npm --workspace apps/backend run prisma:generate \
  && npm --workspace apps/backend run build

WORKDIR /repo/apps/backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
