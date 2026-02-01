import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";

type AccountStatus = "active" | "paused" | "deleted";

export type Account = {
  account_id: string;
  type: string;
  chain: string;
  label: string;
  address_or_identifier: string;
  network?: string;
  created_at: string;
  status: AccountStatus;
};

export type NewAccountInput = {
  type: string;
  chain: string;
  label: string;
  address_or_identifier: string;
  network?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeNetwork(network: unknown) {
  const n = String(network || "").trim();
  return n.length ? n : undefined;
}

function normalizeAddress(chain: string, addr: string) {
  const c = String(chain || "").toLowerCase().trim();
  const a = String(addr || "").trim();

  // EVM lowercased, XRPL unchanged
  if (
    c === "evm" ||
    c === "ethereum" ||
    c === "polygon" ||
    c === "arbitrum" ||
    c === "optimism" ||
    c === "base" ||
    c === "bsc"
  ) {
    return a.toLowerCase();
  }
  return a;
}

function dedupeKey(a: Pick<Account, "chain" | "network" | "address_or_identifier">) {
  const chain = String(a.chain || "").toLowerCase().trim();
  const network = String(a.network || "").toLowerCase().trim();
  const addr = String(a.address_or_identifier || "").trim();
  return `${chain}|${network}|${addr}`;
}

function isJsonl(p: string) {
  return p.endsWith(".jsonl");
}

async function exists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function defaultAccountsStoreCandidates(vaultPath: string) {
  return [
    path.join(vaultPath, "data/accounts/accounts.jsonl"),
    path.join(vaultPath, "data/accounts/accounts.json"),
    path.join(vaultPath, "accounts.jsonl"),
    path.join(vaultPath, "accounts.json")
  ];
}

async function resolveAccountsStorePath(vaultPath: string): Promise<string> {
  const candidates = defaultAccountsStoreCandidates(vaultPath);
  for (const p of candidates) {
    if (await exists(p)) return p;
  }

  // Fallback: scan for any json/jsonl containing "account_id" and "status"
  const found: string[] = [];
  async function walk(dir: string) {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
        continue;
      }
      if (!p.endsWith(".json") && !p.endsWith(".jsonl")) continue;

      try {
        const st = await fs.stat(p);
        if (st.size > 5_000_000) continue;

        const buf = await fs.readFile(p);
        if (!buf.includes(Buffer.from('"account_id"')) && !buf.includes(Buffer.from('"status"'))) continue;
        found.push(p);
      } catch {
        continue;
      }
    }
  }

  await walk(vaultPath);

  if (found.length) return found[0];

  // Default to the standard jsonl location
  return path.join(vaultPath, "data/accounts/accounts.jsonl");
}

async function readJsonlAccounts(p: string): Promise<Account[]> {
  try {
    const txt = await fs.readFile(p, "utf8");
    const out: Account[] = [];
    for (const lineRaw of txt.split("\n")) {
      const line = lineRaw.trim();
      if (!line) continue;
      out.push(JSON.parse(line));
    }
    return out;
  } catch (e: any) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
}

async function writeJsonlAccounts(p: string, accounts: Account[]) {
  const tmp = `${p}.tmp`;
  const lines = accounts.map((a) => JSON.stringify(a));
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(tmp, lines.join("\n") + "\n", "utf8");
  await fs.rename(tmp, p);
}

async function readJsonAccounts(p: string): Promise<Account[]> {
  try {
    const txt = await fs.readFile(p, "utf8");
    const data = JSON.parse(txt);
    if (Array.isArray(data)) return data as Account[];
    if (data && Array.isArray(data.accounts)) return data.accounts as Account[];
    return [];
  } catch (e: any) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
}

async function writeJsonAccounts(p: string, accounts: Account[]) {
  const tmp = `${p}.tmp`;
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(accounts, null, 2) + "\n", "utf8");
  await fs.rename(tmp, p);
}

async function readAccountsFromStore(vaultPath: string): Promise<{ storePath: string; accounts: Account[] }> {
  const storePath = await resolveAccountsStorePath(vaultPath);
  const accounts = isJsonl(storePath) ? await readJsonlAccounts(storePath) : await readJsonAccounts(storePath);
  return { storePath, accounts };
}

async function writeAccountsToStore(storePath: string, accounts: Account[]) {
  if (isJsonl(storePath)) return writeJsonlAccounts(storePath, accounts);
  return writeJsonAccounts(storePath, accounts);
}

export async function ensureVault(vaultPath: string) {
  await fs.mkdir(vaultPath, { recursive: true });
  await fs.mkdir(path.join(vaultPath, "data/accounts"), { recursive: true });

  const store = await resolveAccountsStorePath(vaultPath);
  await fs.mkdir(path.dirname(store), { recursive: true });

  if (!(await exists(store))) {
    if (isJsonl(store)) {
      await fs.writeFile(store, "", "utf8");
    } else {
      await fs.writeFile(store, "[]\n", "utf8");
    }
  }
}

export async function readAccounts(vaultPath: string): Promise<Account[]> {
  const { accounts } = await readAccountsFromStore(vaultPath);
  return accounts;
}

function makeAccountId(chain: string) {
  const hex = crypto.randomBytes(4).toString("hex");
  return `acct_${String(chain || "acct").toLowerCase()}_${hex}`;
}

export async function addAccount(vaultPath: string, input: NewAccountInput): Promise<Account> {
  const chain = String(input.chain || "").trim();
  const label = String(input.label || "").trim();
  const type = String(input.type || "").trim();
  const network = normalizeNetwork(input.network);
  const address_or_identifier = normalizeAddress(chain, String(input.address_or_identifier || "").trim());

  const { storePath, accounts } = await readAccountsFromStore(vaultPath);

  const incomingKey = dedupeKey({ chain, network, address_or_identifier });
  const existsAcc = accounts.find((a) => dedupeKey(a) === incomingKey);
  if (existsAcc) {
    return existsAcc;
  }

  const account: Account = {
    account_id: makeAccountId(chain),
    type,
    chain,
    label,
    address_or_identifier,
    network,
    created_at: nowIso(),
    status: "active"
  };

  accounts.push(account);
  await writeAccountsToStore(storePath, accounts);
  return account;
}

export async function setAccountStatus(vaultPath: string, accountId: string, status: AccountStatus): Promise<Account> {
  const id = String(accountId || "").trim();
  if (!id) throw new Error("missing account id");

  const { storePath, accounts } = await readAccountsFromStore(vaultPath);
  const idx = accounts.findIndex((a) => a.account_id === id);
  if (idx === -1) throw new Error("account not found");

  accounts[idx] = { ...accounts[idx], status };
  await writeAccountsToStore(storePath, accounts);
  return accounts[idx];
}

export async function purgeDeletedAccounts(vaultPath: string): Promise<{
  storePath: string;
  before: number;
  after: number;
  removed: number;
}> {
  const { storePath, accounts } = await readAccountsFromStore(vaultPath);

  const before = accounts.length;
  const kept = accounts.filter((a) => a.status !== "deleted");
  const after = kept.length;

  await writeAccountsToStore(storePath, kept);

  return {
    storePath,
    before,
    after,
    removed: before - after
  };
}
