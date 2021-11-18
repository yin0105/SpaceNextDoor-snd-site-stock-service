FROM node:14.17 as builder
LABEL maintainer="Harry Nguyen"
ENV NODE_OPTIONS=--max_old_space_size=4096
WORKDIR /var/source

COPY ./package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:14.17-buster-slim
USER node
WORKDIR /var/source

COPY --from=builder --chown=node:node /var/source ./

ENTRYPOINT ["npm"]
CMD ["run", "start:prod"]
