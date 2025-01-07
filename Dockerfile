ARG BUN_VERSION=1.1.21
FROM oven/bun:${BUN_VERSION}-slim as base

LABEL launch_runtime="Bun"

WORKDIR /app

ENV NODE_ENV="production"

FROM base as build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY --link bun.lockb package.json ./
RUN bun install --ci

COPY --link frontend/bun.lockb frontend/package.json ./frontend/
RUN cd frontend && bun install --ci

COPY --link . .

WORKDIR /app/frontend
RUN bun run build
RUN find . -mindepth 1 ! -regex '^./dist\(/.*\)?' -delete

FROM base

COPY --from=build /app /app

EXPOSE 3010
CMD [ "bun", "run", "start" ]