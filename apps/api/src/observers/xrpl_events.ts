import { Client } from "xrpl";
import { CONFIG } from "../config.js";
import { sha1 } from "../vault/utils.js";
import type { Event } from "../vault/schema.js";
import type { LastSeen, Dedupe } from "../vault/indexes.js";

function dropsToXrpFromNumberish(drops: string | number) {
  const n = typeof drops === "number" ? drops : Number(drops);
  return (n / 1_000_000).toFixed(6);
}

function assetIdXrp() {
  return "xrpl:XRP";
}

function assetIdIou(currency: string, issuer: string) {
  const c = String(currency || "").toUpperCase();
  const i = String(issuer || "");
  return `xrpl:IOU:${c}:${i}`;
}

function xrplTimeToIso(xrplSeconds: number) {
  return new Date((xrplSeconds + 946684800) * 1000).toISOString();
}

function isIouAmount(a: any): a is { currency: string; issuer: string; value: string } {
  return (
    !!a &&
    typeof a === "object" &&
    typeof a.currency === "string" &&
    typeof a.issuer === "string" &&
    typeof a.value === "string"
  );
}

export async function xrplFetchEvents(
  address: string,
  accountId: string,
  lastSeen: LastSeen,
  dedupe: Dedupe,
  limit = 200
): Promise<Event[]> {
  const client = new Client(CONFIG.xrpl.ws);
  await client.connect();

  try {
    const key = `xrpl:last_ts:${accountId}`;
    const sinceIso = (lastSeen as any)[key] ? String((lastSeen as any)[key]) : "";

    const resp = await client.request({
      command: "account_tx",
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit
    });

    const txs: any[] =
      resp && (resp as any).result && (resp as any).result.transactions
        ? (resp as any).result.transactions
        : [];

    const out: Event[] = [];

    for (const row of txs) {
      const tx = row && (row.tx_json || row.tx) ? (row.tx_json || row.tx) : null;
      const meta = row && row.meta ? row.meta : null;
      const validatedFlag = row ? row.validated : undefined;

      if (validatedFlag === false) continue;
      if (!tx) continue;

      const txid = String((row && row.hash ? row.hash : "") || (tx.hash ? tx.hash : ""));
      if (!txid) continue;

      const tsIso =
        row && row.close_time_iso
          ? String(row.close_time_iso)
          : typeof tx.date === "number"
            ? xrplTimeToIso(tx.date)
            : new Date().toISOString();

      if (sinceIso && tsIso <= sinceIso) continue;

      const dedupeKey = `xrpl:${accountId}:${txid}`;
      if ((dedupe as any)[dedupeKey]) continue;

      const t = String(tx.TransactionType || "Unknown");

      if (t === "Payment") {
        const from = String(tx.Account || "");
        const to = String(tx.Destination || "");

        const isOut = from === address;
        const isIn = to === address;
        if (!isOut && !isIn) continue;

        const direction = isIn ? "transfer_in" : "transfer_out";
        const counterparty = direction === "transfer_in" ? from : to;

        const delivered =
          meta && (meta as any).delivered_amount !== undefined
            ? (meta as any).delivered_amount
            : tx.Amount;

        if (typeof delivered === "string" || typeof delivered === "number") {
          const xrp = dropsToXrpFromNumberish(delivered);
          out.push({
            event_id: `evt_xrpl_${sha1(accountId + txid).slice(0, 12)}`,
            account_id: accountId,
            ts: tsIso,
            kind: direction as any,
            asset_id: assetIdXrp(),
            amount: xrp,
            counterparty,
            txid,
            memo: "",
            tags: [],
            note: "",
            raw_ref: { row, tx, meta }
          });
        } else if (isIouAmount(delivered)) {
          out.push({
            event_id: `evt_xrpl_${sha1(accountId + txid).slice(0, 12)}`,
            account_id: accountId,
            ts: tsIso,
            kind: direction as any,
            asset_id: assetIdIou(delivered.currency, delivered.issuer),
            amount: String(delivered.value),
            counterparty,
            txid,
            memo: "",
            tags: [],
            note: "",
            raw_ref: { row, tx, meta }
          });
        } else {
          out.push({
            event_id: `evt_xrpl_${sha1(accountId + txid).slice(0, 12)}`,
            account_id: accountId,
            ts: tsIso,
            kind: direction as any,
            asset_id: "xrpl:payment:unknown",
            amount: "0",
            counterparty,
            txid,
            memo: "",
            tags: [],
            note: "payment amount unsupported in v1",
            raw_ref: { row, tx, meta }
          });
        }
      } else if (t === "TrustSet") {
        out.push({
          event_id: `evt_xrpl_${sha1(accountId + txid).slice(0, 12)}`,
          account_id: accountId,
          ts: tsIso,
          kind: "trustline",
          asset_id: "xrpl:trustline",
          amount: "0",
          counterparty: "",
          txid,
          memo: "",
          tags: [],
          note: "",
          raw_ref: { row, tx, meta }
        });
      } else {
        out.push({
          event_id: `evt_xrpl_${sha1(accountId + txid).slice(0, 12)}`,
          account_id: accountId,
          ts: tsIso,
          kind: "unknown",
          asset_id: "xrpl:unknown",
          amount: "0",
          counterparty: "",
          txid,
          memo: "",
          tags: [],
          note: t,
          raw_ref: { row, tx, meta }
        });
      }

      (dedupe as any)[dedupeKey] = true;
    }

    if (out.length) {
      const newest = out.map((e) => e.ts).sort().slice(-1)[0];
      (lastSeen as any)[key] = newest;
    }

    return out.sort((a, b) => (a.ts < b.ts ? -1 : 1));
  } finally {
    await client.disconnect();
  }
}
