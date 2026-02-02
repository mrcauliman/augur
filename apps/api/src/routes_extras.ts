import type { Express, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";

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

// systemd WorkingDirectory is /var/www/augur/apps/api
// accounts store is /var/www/augur/apps/api/data/accounts.json
const DATA_DIR = path.resolve(process.cwd(), "data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const tmp = `${filePath}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, filePath);
}

function jsonBody(req: Request): any {
  return (req as any).body ?? {};
}

function requireMonth(body: any): { ok: true; month: string } | { ok: false; error: string; expected?: string } {
  const month = String(body?.month ?? "").trim();
  if (!month) return { ok: false, error: "missing_month" };
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "invalid_month", expected: "YYYY-MM" };
  return { ok: true, month };
}

function requireOutDir(body: any): { ok: true; outDir: string } | { ok: false; error: string } {
  const outDir = String(body?.outDir ?? "").trim();
  if (!outDir) return { ok: false, error: "missing_outDir" };
  return { ok: true, outDir };
}

export function registerExtras(app: Express) {
  app.get("/api/accounts", async (_req: Request, res: Response) => {
    const data = await readJsonFile<{ accounts: Account[] }>(ACCOUNTS_FILE, { accounts: [] });
    const accounts = Array.isArray((data as any).accounts) ? (data as any).accounts : [];
    res.json({ ok: true, accounts });
  });

  app.get("/api/accounts/all", async (_req: Request, res: Response) => {
    const data = await readJsonFile<{ accounts: Account[] }>(ACCOUNTS_FILE, { accounts: [] });
    const accounts = Array.isArray((data as any).accounts) ? (data as any).accounts : [];
    res.json({ ok: true, accounts });
  });

  app.delete("/api/accounts/:account_id", async (req: Request, res: Response) => {
    const id = String(req.params.account_id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "missing_account_id" });

    const data = await readJsonFile<{ accounts: Account[] }>(ACCOUNTS_FILE, { accounts: [] });
    const accounts = Array.isArray((data as any).accounts) ? (data as any).accounts : [];

    const before = accounts.length;
    const filtered = accounts.filter((a: any) => !(a && typeof a === "object" && a.account_id === id));
    const deleted = before - filtered.length;

    await writeJsonFile(ACCOUNTS_FILE, { ok: true, accounts: filtered });

    res.json({ ok: true, deleted, account_id: id });
  });

  app.post("/api/snapshot", async (_req: Request, res: Response) => {
    const data = await readJsonFile<{ accounts: Account[] }>(ACCOUNTS_FILE, { accounts: [] });
    const accounts = Array.isArray((data as any).accounts) ? (data as any).accounts : [];
    const active = accounts.filter((a: any) => a?.status === "active").length;

    res.json({
      ok: true,
      snapshot: {
        ok: true,
        type: "snapshot",
        created_at: new Date().toISOString(),
        counts: { active },
        accounts,
      },
    });
  });

  app.post("/api/monthly", async (req: Request, res: Response) => {
    const body = jsonBody(req);
    const m = requireMonth(body);
    if (!m.ok) return res.status(400).json(m);

    res.json({
      ok: true,
      type: "monthly",
      month: m.month,
      created_at: new Date().toISOString(),
    });
  });

  app.post("/api/export/public", async (req: Request, res: Response) => {
    const body = jsonBody(req);

    const out = requireOutDir(body);
    if (!out.ok) return res.status(400).json(out);

    const m = requireMonth(body);
    if (!m.ok) return res.status(400).json(m);

    const data = await readJsonFile<{ accounts: Account[] }>(ACCOUNTS_FILE, { accounts: [] });
    const accounts = Array.isArray((data as any).accounts) ? (data as any).accounts : [];
    const active = accounts.filter((a: any) => a?.status === "active").length;

    const snapshot = {
      ok: true,
      type: "snapshot",
      created_at: new Date().toISOString(),
      counts: { active },
      accounts,
    };

    const monthly = {
      ok: true,
      type: "monthly",
      month: m.month,
      created_at: new Date().toISOString(),
    };

    const latest = {
      ok: true,
      created_at: new Date().toISOString(),
      month: m.month,
      snapshot,
      monthly,
    };

    await fs.mkdir(out.outDir, { recursive: true });
    await fs.writeFile(path.join(out.outDir, "snapshot.json"), JSON.stringify({ ok: true, snapshot }, null, 2) + "\n", "utf8");
    await fs.writeFile(path.join(out.outDir, `monthly_${m.month}.json`), JSON.stringify(monthly, null, 2) + "\n", "utf8");
    await fs.writeFile(path.join(out.outDir, "latest.json"), JSON.stringify(latest, null, 2) + "\n", "utf8");

    res.json({ ok: true, outDir: out.outDir, latest: "latest.json", month: m.month });
  });
}
