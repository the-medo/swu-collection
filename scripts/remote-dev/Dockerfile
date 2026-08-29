FROM postgres:16-alpine

# The scheduled task uses PostgreSQL client tools and AWS CLI directly. It does
# not need access to the Docker socket or to the production application image.
RUN apk add --no-cache aws-cli bash coreutils findutils git util-linux

WORKDIR /app
COPY . /app/scripts/remote-dev
RUN chmod +x /app/scripts/remote-dev/create-sanitized-db-backup.sh

CMD ["sh", "-c", "exec sleep infinity"]
