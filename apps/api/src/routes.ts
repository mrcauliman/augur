import type { Express } from "express";
import { CONFIG } from "./config.js";
import { ensureVault, readAccounts, addAccount, setAccountStatus } from "./vault/writer.js";

export function routes(app: Express) {
  app.get("/health", (_req, res) => res.json({ ok: true, service: "dl-api" }));

  // Default: active only
  // Full list: /api/accounts?all=1
  app.get("/api/accounts", async (req, res) => {
    await ensureVault(CONFIG.vaultPath);
    const accounts = await readAccounts(CONFIG.vaultPath);

    const all = String(req.query.all || "") === "1";
    const out = all ? accounts : accounts.filter((a: any) => a.status === "active");

    res.json({ ok: true, accounts: out });
  });

  app.post("/api/accounts", async (req, res) => {
    const { type, chain, label, address_or_identifier, network } = req.body || {};
    if (!type || !chain || !label || !address_or_identifier) {
      return res.status(400).json({
        ok: false,
        error: "missing fields: type, chain, label, address_or_identifier"
      });
    }

    await ensureVault(CONFIG.vaultPath);
    const account = await addAccount(CONFIG.vaultPath, {
      type,
      chain,
      label,
      address_or_identifier,
      network
    });
    res.json({ ok: true, account });
  });

  app.post("/api/accounts/:id/pause", async (req, res) => {
    await ensureVault(CONFIG.vaultPath);
    const account = await setAccountStatus(CONFIG.vaultPath, req.params.id, "paused");
    res.json({ ok: true, account });
  });

  app.post("/api/accounts/:id/resume", async (req, res) => {
    await ensureVault(CONFIG.vaultPath);
    const account = await setAccountStatus(CONFIG.vaultPath, req.params.id, "active");
    res.json({ ok: true, account });
  });

  app.post("/api/accounts/:id/delete", async (req, res) => {
    await ensureVault(CONFIG.vaultPath);
    const account = await setAccountStatus(CONFIG.vaultPath, req.params.id, "deleted");
    res.json({ ok: true, account });
  });
}
