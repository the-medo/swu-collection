ARG BUN_VERSION=1.2.19
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL launch_runtime="Bun"

WORKDIR /app
ENV NODE_ENV=production

FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# --- backend ---
COPY --link package.json bun.lock ./
RUN bun ci --production          # = bun install --frozen-lockfile

# --- frontend ---
COPY --link frontend/package.json frontend/bun.lock ./frontend/
RUN cd frontend && bun ci

# Copy source code
COPY --link . .
WORKDIR /app/frontend
RUN bun run direct-build
RUN find . -mindepth 1 ! -regex '^./dist\(/.*\)?' -delete

# Final stage
FROM base

# Install fonts - for generating thumbnail images
RUN apt-get update && apt-get install --no-install-recommends -y \
  fonts-liberation fontconfig \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

EXPOSE 3010
CMD [ "bun", "run", "start" ]