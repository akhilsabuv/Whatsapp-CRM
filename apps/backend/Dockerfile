FROM node:20-alpine

WORKDIR /app

COPY apps/backend/package.json ./package.json
COPY apps/backend/tsconfig.json ./tsconfig.json
COPY apps/backend/prisma ./prisma

RUN apk add --no-cache git
# RUN npm install

COPY apps/backend/src ./src
COPY apps/backend/sessions ./sessions

EXPOSE 4000

CMD ["npm", "run", "dev"]
