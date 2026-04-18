FROM node:20-alpine

WORKDIR /app

COPY apps/frontend/package.json ./package.json
COPY apps/frontend/tsconfig.json ./tsconfig.json
COPY apps/frontend/next.config.ts ./next.config.ts

RUN apk add --no-cache git
# RUN npm install

COPY apps/frontend ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
