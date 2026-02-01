import { nowIso, sha1 } from "../vault/utils.js";
import type { Account, Snapshot } from "../vault/schema.js";
import type { LastSeen, Dedupe } from "../vault/indexes.js";
import { appendSnapshot, appendEvent } from "../vault/writer.js";
import { xrplFetchSnapshot } from "../observers/xrpl.js";
import { evmFetchSnapshot } from "../observers/evm.js";
import { btcFetchSnapshot } from "../observers/btc.js";
import { solFetchSnapshot } from "../observers/sol.js";
import { xrplFetchEvents } from "../observers/xrpl_events.js";
import { xlmFetchSnapshot } from "../observers/xlm.js";
import { hbarFetchSnapshot } from "../observers/hbar.js";
import { adaFetchSnapshot } from "../observers/ada.js";

export async function snapshotAccount(vaultPath: string, account: Account, lastSeen: LastSeen, dedupe: Dedupe) {
  const ts = nowIso();

  let native_balance = "0";
  let token_balances: { asset_id: string; amount: string }[] = [];
  let metadata: Record<string, any> = {};

  if (account.chain === "xrpl") {
    const s = await xrplFetchSnapshot(account.address_or_identifier);
    native_balance = s.native_balance;
    token_balances = s.token_balances;
    metadata = s.metadata;

    const evts = await xrplFetchEvents(
      account.address_or_identifier,
      account.account_id,
      lastSeen,
      dedupe,
      200
    );
    for (const e of evts) await appendEvent(vaultPath, "xrpl", account.account_id, e);

  } else if (account.chain === "evm") {
    const s = await evmFetchSnapshot(account.address_or_identifier);
    native_balance = s.native_balance;
    token_balances = s.token_balances;
    metadata = s.metadata;

  } else if (account.chain === "btc") {
    const s = await btcFetchSnapshot(account.address_or_identifier);
    native_balance = s.native_balance;
    token_balances = s.token_balances;
    metadata = s.metadata;

  } else if (account.chain === "sol") {
    const s = await solFetchSnapshot(account.address_or_identifier);
    native_balance = s.native_balance;
    token_balances = s.token_balances;
    metadata = s.metadata;

  } else if (account.chain === "xlm") {
    const s = await xlmFetchSnapshot(account.address_or_identifier);
    native_balance = s.native_balance;
    token_balances = s.token_balances;
    metadata = s.metadata;

  } else if (account.chain === "hbar") {
    const s = await hbarFetchSnapshot(account.address_or_identifier);
    native_balance = s.native_balance;
    token_balances = s.token_balances;
    metadata = s.metadata;

  } else if (account.chain === "ada") {
    const s = await adaFetchSnapshot(account.address_or_identifier);
    native_balance = s.native_balance;
    token_balances = s.token_balances;
    metadata = s.metadata;

  } else {
    metadata = { note: "unsupported chain in v1 snapshot", chain: account.chain };
  }

  const snap: Snapshot = {
    snapshot_id: `snap_${account.chain}_${sha1(account.account_id + ts).slice(0, 10)}`,
    account_id: account.account_id,
    ts,
    native_balance,
    token_balances,
    metadata
  };

  await appendSnapshot(vaultPath, account.chain, account.account_id, snap);

  lastSeen[`snapshot:${account.account_id}`] = ts;
  dedupe[`snap:${account.account_id}:${ts}`] = true;
}
