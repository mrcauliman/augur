import { CONFIG } from "../config.js";

export type SolSnapshot = {
  native_balance: string;
  token_balances: { asset_id: string; amount: string }[];
  metadata: Record<string, any>;
};

export async function solFetchSnapshot(address: string): Promise<SolSnapshot> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [address]
  };

  const r = await fetch(CONFIG.sol.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!r.ok) throw new Error(`sol rpc error ${r.status}`);
  const j: any = await r.json();
  const lamports = Number(j.result?.value || 0);
  const sol = (lamports / 1_000_000_000).toFixed(9);

  return {
    native_balance: sol,
    token_balances: [],
    metadata: { lamports }
  };
}
