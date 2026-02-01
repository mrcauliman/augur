#!/usr/bin/env bash
set -euo pipefail

TARGET="/usr/local/bin/dl"
ROOT="/var/www/digital-ledger"
VAULT_DEFAULT="$ROOT/vault/sample_vault"

sudo -n true 2>/dev/null || { echo "[dl] sudo needed"; exit 1; }

sudo tee "$TARGET" >/dev/null <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/digital-ledger"
VAULT_DEFAULT="$ROOT/vault/sample_vault"
VAULT_PATH="${DL_VAULT_PATH:-$VAULT_DEFAULT}"

need_repo() { [ -d "$ROOT/.git" ] || { echo "[dl] missing repo at $ROOT"; exit 1; }; }
run_root() { (cd "$ROOT" && pnpm "$@"); }

usage() {
  cat <<'EOF'
DL CLI

Core
  dl status
  dl api            run api in foreground
  dl api:stop       stop port 8787 listener
  dl snapshot
  dl monthly YYYY-MM
  dl publish        monthly + export public json

Accounts
  dl accounts
  dl add CHAIN ADDRESS LABEL
  dl pause ACCOUNT_ID

Vault
  dl vault:path
EOF
}

cmd="${1:-}"
case "$cmd" in
  status)
    need_repo
    echo "[dl] root $ROOT"
    echo "[dl] vault $VAULT_PATH"
    echo "[dl] git $(cd "$ROOT" && git rev-parse --short HEAD)"
    ;;
  vault:path) echo "$VAULT_PATH" ;;
  api) need_repo; run_root dev:api ;;
  api:stop)
    if command -v lsof >/dev/null 2>&1; then
      pid="$(lsof -t -i :8787 -sTCP:LISTEN 2>/dev/null | head -n1 || true)"
      if [ -n "${pid:-}" ]; then kill -9 "$pid" || true; echo "[dl] killed pid $pid on :8787"; else echo "[dl] nothing listening on :8787"; fi
    else
      echo "[dl] install lsof first"
      exit 1
    fi
    ;;
  accounts) curl -sS http://127.0.0.1:8787/api/accounts; echo ;;
  add)
    chain="${2:-}"; addr="${3:-}"; label="${4:-}"
    [ -n "$chain" ] && [ -n "$addr" ] && [ -n "$label" ] || { echo "[dl] usage: dl add CHAIN ADDRESS LABEL"; exit 1; }
    curl -sS -X POST http://127.0.0.1:8787/api/accounts \
      -H 'content-type: application/json' \
      -d "{\"type\":\"onchain_wallet\",\"chain\":\"$chain\",\"label\":\"$label\",\"address_or_identifier\":\"$addr\"}"
    echo
    ;;
  pause)
    acct="${2:-}"
    [ -n "$acct" ] || { echo "[dl] usage: dl pause ACCOUNT_ID"; exit 1; }
    curl -sS -X POST "http://127.0.0.1:8787/api/accounts/$acct/pause"
    echo
    ;;
  snapshot) need_repo; DL_VAULT_PATH="$VAULT_PATH" run_root snapshot ;;
  monthly)
    need_repo
    month="${2:-}"
    [ -n "$month" ] || { echo "[dl] usage: dl monthly YYYY-MM"; exit 1; }
    DL_VAULT_PATH="$VAULT_PATH" run_root monthly "$month"
    ;;
  publish) need_repo; DL_VAULT_PATH="$VAULT_PATH" run_root publish:public ;;
  help|-h|--help|"") usage ;;
  *) echo "[dl] unknown command: $cmd"; usage; exit 1 ;;
esac
BASH

sudo chmod 755 "$TARGET"
sudo chown root:root "$TARGET"
echo "[dl] installed clean -> $TARGET"
