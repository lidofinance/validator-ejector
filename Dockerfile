FROM node:24.22.1-alpine3.23 AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY encryptor ./encryptor
RUN yarn build

FROM node:24.22.1-alpine3.23 AS production-dependencies

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production=true \
    && yarn cache clean

FROM node:24.22.1-alpine3.23 AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY scripts/check-runtime.mjs ./scripts/check-runtime.mjs
RUN mkdir -p encryptor/input encryptor/output \
    && chown -R node:node encryptor

USER node

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
CMD sh -c "wget -nv -t1 --spider http://localhost:${HTTP_PORT:-8989}/health" || exit 1

CMD ["node", "dist/src/index.js"]
