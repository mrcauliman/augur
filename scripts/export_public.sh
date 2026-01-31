#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="${DL_VAULT_PATH:-$ROOT/vault/sample_vault}"

# month arg optional, defaults to current YYYY-MM in UTC
MONTH="${1:-$(date -u +%Y-%m)}"

SRC="$VAULT/reports/monthly/$MONTH/summary.json"
DST="$ROOT/public_data/summary.json"

if [ ! -f "$SRC" ]; then
  echo "[dl] missing monthly summary: $SRC"
  echo "[dl] run: pnpm monthly $MONTH"
  exit 1
fi

mkdir -p "$(dirname "$DST")"
cp -f "$SRC" "$DST"

echo "[dl] exported $MONTH -> public_data/summary.json"
