import fs from "fs-extra";
import path from "node:path";
import { pVault, DIRS } from "../vault/paths.js";
import { readAccounts } from "../vault/writer.js";
import { readJsonl } from "../vault/reader.js";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

export async function generateMonthlyRecord(vaultPath: string, month: string) {
  const { start, end } = monthRange(month);

  const accounts = await readAccounts(vaultPath);

  let total_in_xrp = 0;
  let total_out_xrp = 0;
  let fee_xrp = 0;
  let tx_count = 0;

  const perAccount: any[] = [];

  for (const a of accounts) {
    if (a.status !== "active") continue;

    let acc_in = 0;
    let acc_out = 0;
    let acc_tx = 0;

    if (a.chain === "xrpl") {
      const file = pVault(vaultPath, ...DIRS.events, "xrpl", a.account_id, String(start.getUTCFullYear()), `${month}.jsonl`);
      const rows: any[] = await readJsonl(file);

      for (const e of rows) {
        const ts = new Date(e.ts);
        if (ts < start || ts >= end) continue;

        acc_tx += 1;

        if (e.kind === "transfer_in" && e.asset_id === "xrpl:XRP") acc_in += Number(e.amount);
        if (e.kind === "transfer_out" && e.asset_id === "xrpl:XRP") acc_out += Number(e.amount);
        if (e.kind === "fee" && e.asset_id === "xrpl:XRP") fee_xrp += Number(e.amount);
      }
    }

    total_in_xrp += acc_in;
    total_out_xrp += acc_out;
    tx_count += acc_tx;

    perAccount.push({
      account_id: a.account_id,
      chain: a.chain,
      label: a.label,
      in_xrp: Number(acc_in.toFixed(6)),
      out_xrp: Number(acc_out.toFixed(6)),
      tx_count: acc_tx
    });
  }

  const summary = {
    month,
    totals: {
      in_xrp: Number(total_in_xrp.toFixed(6)),
      out_xrp: Number(total_out_xrp.toFixed(6)),
      fee_xrp: Number(fee_xrp.toFixed(6)),
      tx_count
    },
    accounts: perAccount,
    generated_at: new Date().toISOString()
  };

  const outDir = pVault(vaultPath, ...DIRS.reportsMonthly, month);
  await fs.ensureDir(outDir);
  await fs.writeJson(path.join(outDir, "summary.json"), summary, { spaces: 2 });

  return summary;
}
