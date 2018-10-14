FROM node:8-alpine
RUN apk update && apk add wget git jq bash && rm -rf /var/cache/apk/*

WORKDIR /usr/src/gotbot
COPY package*.json ./
COPY client client
COPY lib lib
COPY *.js ./

COPY *.sh ./
COPY .config/dev/*.js ./

RUN mkdir logs && mkdir data && mkdir client/stt.wiki

RUN chown -R node:node .

RUN chmod -R 777 data && chmod -R 777 logs && chmod -R 777 client/stt.wiki

VOLUME /usr/src/gotbot/data
VOLUME /usr/src/gotbot/logs
VOLUME /usr/src/gotbot/client/stt.wiki

USER node

EXPOSE 3030

RUN npm install

CMD ./run.sh
