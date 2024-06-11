FROM node:22 AS build-env
COPY ./src /app/src
COPY ./package.json /app
COPY ./tsconfig.* /app
WORKDIR /app

RUN npm i
RUN npm run build

RUN npm prune --production

FROM node:22-alpine3.20
COPY --from=build-env /app /app

ENV NODE_ENV=production

WORKDIR /app
CMD ["npm", "run", "start:prod"]