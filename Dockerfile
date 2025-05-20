ARG BUN_VERSION=1.2.5
FROM oven/bun:${BUN_VERSION}-slim as base

LABEL launch_runtime="Bun"

WORKDIR /app

ENV NODE_ENV="production"

FROM base as build

# Install necessary build dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install backend dependencies
COPY --link package.json bun.lockb ./
RUN bun install --production --ci

# Install frontend dependencies
COPY --link frontend/package.json frontend/bun.lockb ./frontend/
RUN cd frontend && bun install --ci

# Copy source code
COPY --link . .

# Build frontend
WORKDIR /app/frontend

RUN bun run direct-build

# Clean up frontend directory, leaving only dist folder
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