#!/usr/bin/env bash
# Dumps the production MySQL database to a timestamped, gzip-compressed
# file and prunes backups older than RETENTION_DAYS. Run from the host
# machine running the production stack (needs Docker Compose + a filled-
# in .env.production) — see docs/07-Deployment.md's "Backups" section
# for the recommended cron setup.
set -euo pipefail

cd "$(dirname "$0")/.."  # repo root

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy .env.production.example and fill in real values first." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
db_name="${MYSQL_DATABASE:-assetsouq}"
out_file="${BACKUP_DIR}/assetsouq-${timestamp}.sql.gz"

echo "Backing up ${db_name} to ${out_file} ..."
# --single-transaction takes a consistent InnoDB snapshot without
# locking tables — safe to run against the live database, no
# maintenance-window downtime needed.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql \
  mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" \
  --single-transaction --routines --triggers \
  "$db_name" | gzip > "$out_file"

echo "Backup complete: ${out_file} ($(du -h "$out_file" | cut -f1))"

echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name 'assetsouq-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete
