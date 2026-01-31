# Digital Ledger (DL)

Digital Ledger is a private, read-only system for recording and preserving digital financial activity across wallets and platforms.

DL is infrastructure inside House of Cauliman.

## Core Rules

- Read-only ingestion only
- Append-only storage
- No custody
- No signing
- No financial advice
- Local-first vault

## What DL Does

- Tracks accounts across chains and sources
- Creates snapshots and events as JSONL records
- Produces Monthly Records (markdown + json)
- Exports events CSV and full vault JSON
- Supports vault lock and unlock encryption at rest

## Vault Format

DL writes to a local vault directory using append-only JSONL records.

- data/accounts/accounts.jsonl
- data/snapshots/<chain>/<account>/<year>/<day>.jsonl
- data/events/<chain>/<account>/<year>/<month>.jsonl
- reports/monthly/<year>/<month>/monthly_record.md
- exports/json/
- exports/csv/
- data/indexes/last_seen.json
- data/indexes/tx_dedupe.json

## Deployment

DL runs as:
- API service
- UI static site

Recommended host path:
- /dl/ for UI
- /dl-api/ for API

## Contact

Temporary inbox:
- digitalledger.app@gmail.com

Canonical later:
- dl@houseofcauliman.com
