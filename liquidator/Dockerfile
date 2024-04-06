FROM node:18.20.1

ENV NODE_ENV=production

WORKDIR /app

COPY . /app

RUN npm install

RUN npx tsc --project tsconfig.json

CMD node ./build/src/main.js