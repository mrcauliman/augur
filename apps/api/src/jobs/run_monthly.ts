import { CONFIG } from "../config.js";
import { ensureVault } from "../vault/writer.js";
import { generateMonthlyRecord } from "../reports/monthly.js";

function currentMonthUtc() {
  const d = new Date();
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function pickMonthArg(argv: string[]) {
  // Accept: tsx run_monthly.ts run 2026-01
  // Accept: pnpm monthly 2026-01 (script already includes run)
  // Accept: pnpm monthly run 2026-01 (extra run)
  const re = /^\d{4}-\d{2}$/;
  for (let i = argv.length - 1; i >= 0; i--) {
    if (re.test(argv[i])) return argv[i];
  }
  return "";
}

async function main() {
  const monthArg = pickMonthArg(process.argv);
  const month = monthArg || currentMonthUtc();

  await ensureVault(CONFIG.vaultPath);
  await generateMonthlyRecord(CONFIG.vaultPath, month);

  console.log("[augur] monthly complete", month);
}

main().catch((e) => {
  console.error("[augur] monthly fatal", e);
  process.exit(1);
});
