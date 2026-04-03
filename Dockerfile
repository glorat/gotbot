FROM node:22-alpine
RUN apk update && apk add wget git jq bash && rm -rf /var/cache/apk/*

WORKDIR /usr/src/gotbot

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

COPY client client
COPY lib lib
COPY test test
COPY *.ts ./

COPY run ./
COPY gotcron ./

RUN mkdir data

RUN chown -R node:node .

RUN chmod -R 777 data

VOLUME /usr/src/gotbot/data

USER node

EXPOSE 3030

RUN pnpm install --frozen-lockfile

CMD ./run
