import { CONFIG } from "../config.js";

export type BtcSnapshot = {
  native_balance: string;
  token_balances: { asset_id: string; amount: string }[];
  metadata: Record<string, any>;
};

export async function btcFetchSnapshot(address: string): Promise<BtcSnapshot> {
  const url = `${CONFIG.btc.apiBase}/address/${address}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`btc api error ${r.status}`);
  const j: any = await r.json();

  const funded = Number(j.chain_stats?.funded_txo_sum || 0) + Number(j.mempool_stats?.funded_txo_sum || 0);
  const spent = Number(j.chain_stats?.spent_txo_sum || 0) + Number(j.mempool_stats?.spent_txo_sum || 0);
  const sats = funded - spent;
  const btc = (sats / 100_000_000).toFixed(8);

  return {
    native_balance: btc,
    token_balances: [],
    metadata: { sats }
  };
}
