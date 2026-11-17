#!/bin/sh
set -eu

: "${DB_HOST:=db}"
: "${DB_PORT:=5432}"
: "${DB_NAME:=postgres}"
: "${DB_USER:=postgres}"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  );
"

applied_count=0
skipped_count=0

for f in /migrations/*.sql; do
  [ -e "$f" ] || continue
  version=$(basename "$f" .sql)

  already=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "select 1 from supabase_migrations.schema_migrations where version = '$version'")

  if [ "$already" = "1" ]; then
    skipped_count=$((skipped_count + 1))
    continue
  fi

  echo "==> applying $version"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$f"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "insert into supabase_migrations.schema_migrations (version) values ('$version');"
  applied_count=$((applied_count + 1))
done

echo "==> done: applied $applied_count, already up to date $skipped_count"
