import { CONFIG } from "../config.js";
import { ensureVault, readAccounts } from "../vault/writer.js";
import { getLastSeen, setLastSeen, getDedupe, setDedupe } from "../vault/indexes.js";
import { snapshotAccount } from "../snapshot/snapshot.js";

async function main() {
  const cmd = process.argv[2] || "run";

  if (cmd === "init") {
    await ensureVault(CONFIG.vaultPath);
    console.log("[augur] vault initialized", CONFIG.vaultPath);
    return;
  }

  await ensureVault(CONFIG.vaultPath);

  const accounts = await readAccounts(CONFIG.vaultPath);
  const lastSeen = await getLastSeen(CONFIG.vaultPath);
  const dedupe = await getDedupe(CONFIG.vaultPath);

  const active = accounts.filter((a) => a.status === "active");
  console.log(`[augur] snapshot start accounts=${accounts.length} active=${active.length}`);

  for (const a of active) {
    try {
      await snapshotAccount(CONFIG.vaultPath, a, lastSeen, dedupe);
      console.log(`[augur] snapshot ok ${a.chain} ${a.account_id}`);
    } catch (e: any) {
      console.error(`[augur] snapshot fail ${a.chain} ${a.account_id}`, e?.message || e);
    }
  }

  await setLastSeen(CONFIG.vaultPath, lastSeen);
  await setDedupe(CONFIG.vaultPath, dedupe);

  console.log("[augur] snapshot complete");
}

main().catch((e) => {
  console.error("[augur] snapshot fatal", e);
  process.exit(1);
});
