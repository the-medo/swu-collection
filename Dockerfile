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
COPY package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

# Install frontend dependencies
COPY frontend/package.json frontend/bun.lockb ./frontend/
RUN cd frontend && bun install --production --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN bun run build

# Clean up frontend directory, leaving only dist folder
RUN find . -mindepth 1 ! -regex '^./dist\(/.*\)?' -delete

# Final stage
FROM base

# Copy built application
COPY --from=build /app /app

EXPOSE 3010
CMD [ "bun", "run", "start" ]