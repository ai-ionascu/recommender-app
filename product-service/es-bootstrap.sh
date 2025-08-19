#!/bin/sh
set -e

ES_URL="${ES_URL:-http://elasticsearch:9200}"
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
ES_INDEX="${ES_INDEX:-products-v1}"
ES_ALIAS="${ES_ALIAS:-products}"
ES_BACKFILL_ON_EMPTY="${ES_BACKFILL_ON_EMPTY:-true}"     
ES_FORCE_RECREATE="${ES_FORCE_RECREATE:-false}" # dev only
ES_RECREATE_ON_CHANGE="${ES_RECREATE_ON_CHANGE:-true}" # dev only

echo "[es-bootstrap] Waiting for Elasticsearch at $ES_URL ..."
for i in $(seq 1 120); do
  if curl -sf "$ES_URL" >/dev/null 2>&1; then break; fi
  [ "$i" -eq 120 ] && echo "[es-bootstrap] ES not reachable, aborting" && exit 1
  sleep 1
done
echo "[es-bootstrap] ES is up."

echo "[es-bootstrap] Waiting for Postgres at $PGHOST:$PGPORT ..."
for i in $(seq 1 120); do
  if pg_isready -h "$PGHOST" -p "$PGPORT" >/dev/null 2>&1; then break; fi
  [ "$i" -eq 120 ] && echo "[es-bootstrap] Postgres not reachable, aborting" && exit 1
  sleep 1
done
echo "[es-bootstrap] Postgres is up."

echo "[es-bootstrap] Running es:init ..."
ES_FORCE_RECREATE="$ES_FORCE_RECREATE" \
ES_RECREATE_ON_CHANGE="$ES_RECREATE_ON_CHANGE" \
ES_URL="$ES_URL" ES_INDEX="$ES_INDEX" ES_ALIAS="$ES_ALIAS" \
node /app/product-service/scripts/es/initProductsIndex.js || { echo "[es-bootstrap] es:init failed"; exit 1; }

# adding alias if not exists
if ! curl -sf "$ES_URL/_alias/$ES_ALIAS" >/dev/null 2>&1; then
  echo "[es-bootstrap] Creating alias $ES_ALIAS -> $ES_INDEX"
  curl -sf -X POST "$ES_URL/_aliases" -H 'Content-Type: application/json' \
    -d "{\"actions\":[{\"add\":{\"index\":\"$ES_INDEX\",\"alias\":\"$ES_ALIAS\"}}]}" >/dev/null
fi

# deciding if backfill
SHOULD_BACKFILL="false"
if [ "$ES_BACKFILL_ON_EMPTY" = "true" ]; then
  COUNT_JSON=$(curl -sf "$ES_URL/$ES_ALIAS/_count" || echo '{"count":0}')
  COUNT=$(echo "$COUNT_JSON" | sed -n 's/.*"count":[[:space:]]*\([0-9]\+\).*/\1/p')
  COUNT=${COUNT:-0}
  if [ "$COUNT" -eq 0 ]; then
    SHOULD_BACKFILL="true"
    echo "[es-bootstrap] Index is empty (count=0) -> will backfill."
  else
    echo "[es-bootstrap] Index not empty (count=$COUNT) -> skip backfill."
  fi
else
  SHOULD_BACKFILL="true"
  echo "[es-bootstrap] ES_BACKFILL_ON_EMPTY=false -> force backfill."
fi

if [ "$SHOULD_BACKFILL" = "true" ]; then
  echo "[es-bootstrap] Running es:backfill ..."
  node /app/product-service/scripts/es/backfillProductsToEs.js || { echo "[es-bootstrap] es:backfill failed"; exit 1; }
fi

echo "[es-bootstrap] Done."