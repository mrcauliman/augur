import { CONFIG } from "../config.js";
import { ensureVault } from "../vault/writer.js";
import { generateMonthlyRecord } from "../reports/monthly.js";

function currentMonthUtc() {
  const d = new Date();
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function main() {
  const cmd = process.argv[2] || "run";
  const monthArg = process.argv[3];

  if (cmd !== "run") {
    console.log("[dl] usage: monthly run [YYYY-MM]");
    process.exit(1);
  }

  await ensureVault(CONFIG.vaultPath);

  const month = monthArg || currentMonthUtc();
  await generateMonthlyRecord(CONFIG.vaultPath, month);

  console.log("[dl] monthly complete", month);
}

main().catch((e) => {
  console.error("[dl] monthly fatal", e);
  process.exit(1);
});
