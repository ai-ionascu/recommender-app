#!/usr/bin/env sh
set -e

echo "[wait] Waiting for Postgres at $PG_HOST:$PG_PORT ..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" >/dev/null 2>&1; do
  sleep 2
done
echo "[wait] Postgres is ready."
