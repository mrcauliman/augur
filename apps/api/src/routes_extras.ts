import type { Express } from "express";
import fs from "node:fs/promises";
import path from "node:path";

type Account = {
  account_id: string;
  type: string;
  chain: string;
  label: string;
  address_or_identifier: string;
  network: string;
  created_at: string;
  status: string;
};

const DATA_DIR = "/var/www/augur/apps/api/data";
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const SNAPSHOT_FILE = path.join(DATA_DIR, "snapshot_latest.json");
const MONTHLY_FILE = (month: string) => path.join(DATA_DIR, `monthly_${month}.json`);
const PUBLIC_EXPORT_DIR_DEFAULT = "/var/www/augur/public_exports";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(file: string, obj: unknown) {
  const raw = JSON.stringify(obj, null, 2) + "\n";
  await fs.writeFile(file, raw, "utf-8");
}

async function loadAccounts(): Promise<Account[]> {
  await ensureDir(DATA_DIR);
  const data = await readJsonFile<{ accounts: Account[] }>(ACCOUNTS_FILE, { accounts: [] });
  if (!data || !Array.isArray(data.accounts)) return [];
  return data.accounts;
}

async function saveAccounts(accounts: Account[]) {
  await ensureDir(DATA_DIR);
  await writeJsonFile(ACCOUNTS_FILE, { accounts });
}

function isValidMonth(m: unknown): m is string {
  if (typeof m !== "string") return false;
  return /^\d{4}-\d{2}$/.test(m);
}

export function registerExtras(app: Express) {
  app.get("/api/accounts", async (_req, res) => {
    const accounts = await loadAccounts();
    res.json({ ok: true, accounts });
  });

  app.get("/api/accounts/all", async (_req, res) => {
    const accounts = await loadAccounts();
    res.json({ ok: true, accounts });
  });

  app.post("/api/accounts", async (req, res) => {
    const body = req.body || {};
    const accounts = await loadAccounts();

    const now = new Date().toISOString();
    const acct: Account = {
      account_id: String(body.account_id || `acct_${Math.random().toString(16).slice(2, 10)}`),
      type: String(body.type || "onchain_wallet"),
      chain: String(body.chain || "xrpl"),
      label: String(body.label || ""),
      address_or_identifier: String(body.address_or_identifier || ""),
      network: String(body.network || "mainnet"),
      created_at: String(body.created_at || now),
      status: String(body.status || "active"),
    };

    const exists = accounts.some(a => a.account_id === acct.account_id);
    const next = exists ? accounts.map(a => (a.account_id === acct.account_id ? acct : a)) : [...accounts, acct];

    await saveAccounts(next);
    res.json({ ok: true, account: acct });
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    const id = String(req.params.id || "");
    const accounts = await loadAccounts();
    const before = accounts.length;
    const next = accounts.filter(a => a.account_id !== id);
    await saveAccounts(next);
    res.json({ ok: true, deleted: before - next.length, account_id: id });
  });

  app.post("/api/snapshot", async (_req, res) => {
    const accounts = await loadAccounts();
    const active = accounts.filter(a => a.status === "active").length;

    const snapshot = {
      ok: true,
      type: "snapshot",
      created_at: new Date().toISOString(),
      counts: { active },
      accounts,
    };

    await ensureDir(DATA_DIR);
    await writeJsonFile(SNAPSHOT_FILE, snapshot);

    res.json({ ok: true, snapshot });
  });

  app.post("/api/monthly", async (req, res) => {
    const month = req.body?.month;

    if (!isValidMonth(month)) {
      res.status(400).json({ ok: false, error: "invalid_month", expected: "YYYY-MM" });
      return;
    }

    const monthly = {
      ok: true,
      type: "monthly",
      month,
      created_at: new Date().toISOString(),
    };

    await ensureDir(DATA_DIR);
    await writeJsonFile(MONTHLY_FILE(month), monthly);

    res.json(monthly);
  });

  app.post("/api/export/public", async (req, res) => {
    const outDir = String(req.body?.outDir || PUBLIC_EXPORT_DIR_DEFAULT);
    const month = String(req.body?.month || "");

    await ensureDir(outDir);

    const snapshot = await readJsonFile<any>(SNAPSHOT_FILE, { ok: false, error: "missing_snapshot" });
    const monthly = month && isValidMonth(month)
      ? await readJsonFile<any>(MONTHLY_FILE(month), { ok: false, error: "missing_month" })
      : { ok: false, error: "missing_month" };

    const latest = {
      ok: true,
      created_at: new Date().toISOString(),
      month,
      snapshot,
      monthly,
    };

    await writeJsonFile(path.join(outDir, "snapshot.json"), snapshot);
    if (month && isValidMonth(month)) await writeJsonFile(path.join(outDir, `monthly_${month}.json`), monthly);
    await writeJsonFile(path.join(outDir, "latest.json"), latest);

    res.json({ ok: true, outDir, latest: "latest.json", month });
  });
}
