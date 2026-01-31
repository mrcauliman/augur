import { CONFIG } from "../config.js";
import { ensureVault, readAccounts } from "../vault/writer.js";
import { getLastSeen, setLastSeen, getDedupe, setDedupe } from "../vault/indexes.js";
import { snapshotAccount } from "../snapshot/snapshot.js";

async function main() {
  const cmd = process.argv[2] || "run";

  if (cmd === "init") {
    await ensureVault(CONFIG.vaultPath);
    console.log("[dl] vault initialized", CONFIG.vaultPath);
    return;
  }

  await ensureVault(CONFIG.vaultPath);

  const accounts = await readAccounts(CONFIG.vaultPath);
  const lastSeen = await getLastSeen(CONFIG.vaultPath);
  const dedupe = await getDedupe(CONFIG.vaultPath);

  console.log(`[dl] snapshot start accounts=${accounts.length}`);

  for (const a of accounts) {
    if (a.status !== "active") continue;
    try {
      await snapshotAccount(CONFIG.vaultPath, a, lastSeen, dedupe);
      console.log(`[dl] snapshot ok ${a.chain} ${a.account_id}`);
    } catch (e: any) {
      console.error(`[dl] snapshot fail ${a.chain} ${a.account_id}`, e?.message || e);
    }
  }

  await setLastSeen(CONFIG.vaultPath, lastSeen);
  await setDedupe(CONFIG.vaultPath, dedupe);

  console.log("[dl] snapshot complete");
}

main().catch((e) => {
  console.error("[dl] snapshot fatal", e);
  process.exit(1);
});
