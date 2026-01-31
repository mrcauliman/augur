import fs from "fs-extra";
import path from "node:path";
import { pVault, DIRS } from "./paths.js";
import { nowIso, jsonlLine, sha1 } from "./utils.js";
import { AccountSchema, type Account, type Snapshot, type Event } from "./schema.js";

export async function ensureVault(vaultPath: string) {
  const requiredDirs = Object.values(DIRS).map((parts) => pVault(vaultPath, ...parts));
  for (const d of requiredDirs) await fs.ensureDir(d);

  const vaultFile = pVault(vaultPath, "DL_VAULT.json");
  if (!(await fs.pathExists(vaultFile))) {
    await fs.writeJson(vaultFile, { vault_version: "1.0.0", created_at: nowIso() }, { spaces: 2 });
  }

  const accountsFile = pVault(vaultPath, ...DIRS.accounts, "accounts.jsonl");
  if (!(await fs.pathExists(accountsFile))) await fs.writeFile(accountsFile, "");

  const assetsFile = pVault(vaultPath, ...DIRS.assets, "assets.jsonl");
  if (!(await fs.pathExists(assetsFile))) await fs.writeFile(assetsFile, "");

  const lastSeen = pVault(vaultPath, ...DIRS.indexes, "last_seen.json");
  if (!(await fs.pathExists(lastSeen))) await fs.writeJson(lastSeen, {}, { spaces: 2 });

  const dedupe = pVault(vaultPath, ...DIRS.indexes, "tx_dedupe.json");
  if (!(await fs.pathExists(dedupe))) await fs.writeJson(dedupe, {}, { spaces: 2 });

  const settings = pVault(vaultPath, ...DIRS.config, "settings.json");
  if (!(await fs.pathExists(settings))) {
    await fs.writeJson(
      settings,
      {
        vault_version: "1.0.0",
        timezone: "America/Los_Angeles",
        snapshot_schedule: { freq: "daily", hour: 6, minute: 0 },
        monthly_record_schedule: { day: 1, hour: 7, minute: 0 },
        privacy: { store_raw_payloads: true },
        security: { encryption_enabled: false, auto_lock_minutes: 5 }
      },
      { spaces: 2 }
    );
  }
}

export async function readAccounts(vaultPath: string): Promise<Account[]> {
  const file = pVault(vaultPath, ...DIRS.accounts, "accounts.jsonl");
  const text = await fs.readFile(file, "utf8");
  const lines = text.split("\n").filter(Boolean);
  const out: Account[] = [];
  for (const line of lines) out.push(AccountSchema.parse(JSON.parse(line)));
  return out;
}

export async function addAccount(
  vaultPath: string,
  input: { type: Account["type"]; chain: Account["chain"]; label: string; address_or_identifier: string }
): Promise<Account> {
  const account_id = `acct_${input.chain}_${sha1(input.label + input.address_or_identifier).slice(0, 8)}`;
  const account: Account = {
    account_id,
    type: input.type,
    chain: input.chain,
    label: input.label,
    address_or_identifier: input.address_or_identifier,
    created_at: nowIso(),
    status: "active"
  };

  const file = pVault(vaultPath, ...DIRS.accounts, "accounts.jsonl");
  await fs.appendFile(file, jsonlLine(account));
  return account;
}

export async function appendSnapshot(vaultPath: string, chain: string, accountId: string, snap: Snapshot) {
  const day = snap.ts.slice(0, 10);
  const year = day.slice(0, 4);
  const file = pVault(vaultPath, ...DIRS.snapshots, chain, accountId, year, `${day}.jsonl`);
  await fs.ensureDir(path.dirname(file));
  await fs.appendFile(file, jsonlLine(snap));
}

export async function appendEvent(vaultPath: string, chain: string, accountId: string, evt: Event) {
  const month = evt.ts.slice(0, 7);
  const year = month.slice(0, 4);
  const file = pVault(vaultPath, ...DIRS.events, chain, accountId, year, `${month}.jsonl`);
  await fs.ensureDir(path.dirname(file));
  await fs.appendFile(file, jsonlLine(evt));
}
