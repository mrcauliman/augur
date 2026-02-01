#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/digital-ledger"
SRC="$ROOT/cli/dl"
DST="/usr/local/bin/dl"

[ -f "$SRC" ] || { echo "[dl] missing $SRC"; exit 1; }

sudo install -m 0755 "$SRC" "$DST"
echo "[dl] installed $DST"
