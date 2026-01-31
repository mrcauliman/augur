import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  port: Number(process.env.DL_PORT || 8787),
  vaultPath: process.env.DL_VAULT_PATH || "./vault/sample_vault",

  xrpl: {
    ws: process.env.DL_XRPL_WS || "wss://xrplcluster.com"
  },

  evm: {
    rpc: process.env.DL_EVM_RPC || "https://ethereum.publicnode.com",
    chainId: Number(process.env.DL_EVM_CHAIN_ID || 1)
  },

  btc: {
    apiBase: process.env.DL_BTC_API_BASE || "https://blockstream.info/api"
  },

  sol: {
    rpc: process.env.DL_SOL_RPC || "https://api.mainnet-beta.solana.com"
  }
};
