# Official Node image on Debian slim, pinned by digest. Bump the digest for OS
# fixes and rescan the image with Trivy.
FROM node:24.22.3-trixie-slim@sha256:4d00acb4bcc42c454c4eb801526f7ad7f772ea3bd4fd168c5cc2e384abcbb9d4 AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY encryptor ./encryptor
RUN yarn build

FROM node:24.22.3-trixie-slim@sha256:4d00acb4bcc42c454c4eb801526f7ad7f772ea3bd4fd168c5cc2e384abcbb9d4 AS production-dependencies

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production=true \
    && yarn cache clean

FROM node:24.22.3-trixie-slim@sha256:4d00acb4bcc42c454c4eb801526f7ad7f772ea3bd4fd168c5cc2e384abcbb9d4 AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Volume mount points for dist/encryptor/encrypt.js, which reads and writes
# encryptor/input and encryptor/output relative to /app as the node user.
RUN mkdir -p encryptor/input encryptor/output \
    && chown -R node:node encryptor

# The app starts node directly. The package managers of the base image are
# not needed at runtime, and their bundled packages carry CVEs.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn-v1.22.22 /usr/local/bin/yarn /usr/local/bin/yarnpkg

# The platform pipeline passes the build args; a build without them, such as
# the release build, writes `dev`. The app reads branch and commit at start.
ARG BUILD_VERSION=dev
ARG BUILD_BRANCH=dev
ARG BUILD_COMMIT=dev
RUN node -e " \
  const info = { version: process.env.BUILD_VERSION, branch: process.env.BUILD_BRANCH, commit: process.env.BUILD_COMMIT }; \
  for (const [field, value] of Object.entries(info)) if (!value) throw new Error('BUILD_' + field.toUpperCase() + ' is empty'); \
  require('fs').writeFileSync('build-info.json', JSON.stringify(info));"

# The same ids as the node user of the base image
USER 1000:1000

# Debian slim has no wget or curl, so the check uses node itself
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.HTTP_PORT || 8989}/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "dist/src/index.js"]
