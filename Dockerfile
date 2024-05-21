FROM node:18-alpine3.18

RUN apk add jq
RUN apk --no-cache add git

WORKDIR /app

ENTRYPOINT /bin/sh ./entrypoint.sh
