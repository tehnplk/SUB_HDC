FROM node:20-alpine

WORKDIR /opt/sync-deps

COPY package*.json ./
RUN npm ci --omit=dev

ENV NODE_PATH=/opt/sync-deps/node_modules

WORKDIR /sync

COPY . /sync

CMD ["sh", "-c", "node /sync/setup_cron.js && exec crond -f -l 8"]
