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
RUN cd frontend && bun install --production --ci

# Copy source code
COPY --link . .

# Build frontend
WORKDIR /app/frontend

# List files for debugging
RUN ls -la
RUN ls -la src || echo "src directory not found"
RUN cat vite.config.ts || echo "vite.config.ts not available"

# Try to build with explicit path to config
RUN bun run vite build --config ./vite.config.ts || \
    echo "Failed with explicit config path"

# Fallback approach: Use a simple vite config if the original one is problematic
RUN if [ ! -f dist/index.html ]; then \
      echo "Trying fallback build approach"; \
      echo "import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()] });" > simple-vite.config.js; \
      bun run vite build --config simple-vite.config.js; \
    fi

# Check if build succeeded
RUN if [ ! -f dist/index.html ]; then \
      echo "Build failed: no dist/index.html file"; \
      exit 1; \
    else \
      echo "Build succeeded"; \
    fi

# Clean up frontend directory, leaving only dist folder
RUN find . -mindepth 1 ! -regex '^./dist\(/.*\)?' -delete

# Final stage
FROM base

# Copy built application
COPY --from=build /app /app

EXPOSE 3010
CMD [ "bun", "run", "start" ]