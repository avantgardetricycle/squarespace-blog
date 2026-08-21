#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

for f in prisma/migrations/*.sql; do
  echo "Applying $f"
  npx prisma db execute --file "$f"
done
