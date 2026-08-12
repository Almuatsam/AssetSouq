#!/usr/bin/env bash
# Restores a gzip-compressed mysqldump backup produced by backup.sh.
# DESTRUCTIVE — overwrites the current contents of the target database.
# Requires typing the database name to confirm before proceeding.
set -euo pipefail

cd "$(dirname "$0")/.."  # repo root

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <path-to-backup.sql.gz>" >&2
  exit 1
fi
backup_file="$1"

if [ ! -f "$backup_file" ]; then
  echo "No such file: $backup_file" >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy .env.production.example and fill in real values first." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
db_name="${MYSQL_DATABASE:-assetsouq}"

echo "This will OVERWRITE the current contents of '${db_name}' with ${backup_file}."
read -r -p "Type the database name (${db_name}) to confirm: " confirmation
if [ "$confirmation" != "$db_name" ]; then
  echo "Confirmation did not match — aborted." >&2
  exit 1
fi

gunzip -c "$backup_file" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "$db_name"

echo "Restore complete."
