import { Client } from "xrpl";
import { CONFIG } from "../config.js";

export type XrplSnapshot = {
  native_balance: string;
  token_balances: { asset_id: string; amount: string }[];
  metadata: Record<string, any>;
};

function assetIdForIssued(currency: string, issuer: string) {
  return `xrpl:${currency}:${issuer}`;
}

export async function xrplFetchSnapshot(address: string): Promise<XrplSnapshot> {
  const client = new Client(CONFIG.xrpl.ws);
  await client.connect();

  try {
    const info = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated"
    });

    const drops = String((info.result as any).account_data?.Balance || "0");
    const xrp = (Number(drops) / 1_000_000).toFixed(6);

    const lines = await client.request({
      command: "account_lines",
      account: address,
      ledger_index: "validated"
    });

    const token_balances: { asset_id: string; amount: string }[] = [];
    const arr = ((lines.result as any).lines || []) as any[];

    for (const l of arr) {
      const currency = String(l.currency);
      const issuer = String(l.account);
      const bal = String(l.balance);
      token_balances.push({
        asset_id: assetIdForIssued(currency, issuer),
        amount: bal
      });
    }

    return {
      native_balance: xrp,
      token_balances,
      metadata: {
        ledger_index: (info.result as any).ledger_index,
        validated: true
      }
    };
  } finally {
    await client.disconnect();
  }
}
