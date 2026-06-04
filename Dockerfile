FROM --platform=linux/amd64 node:18 AS building

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    python3-dev \
    make \
    g++ \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create python symlink for node-gyp
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Copy package files
COPY package.json yarn.lock ./
COPY ts*.json ./
COPY .nvmrc ./

# Install dependencies
RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean

# Copy source code and build
COPY ./src ./src
COPY ./encryptor ./encryptor
RUN yarn build

FROM --platform=linux/amd64 node:18-slim

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application
COPY --from=building /app/dist ./dist
COPY --from=building /app/node_modules ./node_modules
COPY package.json ts*.json ./

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8989

CMD ["node", "dist/main.js"]

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
CMD sh -c "wget -nv -t1 --spider http://localhost:$HTTP_PORT/health" || exit 1

CMD ["yarn", "start"]