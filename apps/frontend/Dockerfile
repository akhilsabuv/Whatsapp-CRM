FROM node:20-alpine

WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN apk add --no-cache git \
  && npm ci

COPY apps/frontend apps/frontend

RUN npm --workspace apps/frontend run build

WORKDIR /repo/apps/frontend

EXPOSE 3000

CMD ["npm", "run", "start"]
