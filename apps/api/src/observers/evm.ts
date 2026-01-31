import { ethers } from "ethers";
import { CONFIG } from "../config.js";

export type EvmSnapshot = {
  native_balance: string;
  token_balances: { asset_id: string; amount: string }[];
  metadata: Record<string, any>;
};

function assetIdErc20(chainId: number, contract: string) {
  return `evm:${chainId}:erc20:${contract.toLowerCase()}`;
}

export async function evmFetchSnapshot(address: string): Promise<EvmSnapshot> {
  const provider = new ethers.JsonRpcProvider(CONFIG.evm.rpc, CONFIG.evm.chainId);
  const balWei = await provider.getBalance(address);
  const native = ethers.formatEther(balWei);

  return {
    native_balance: native,
    token_balances: [],
    metadata: { chain_id: CONFIG.evm.chainId }
  };
}

export async function evmFetchErc20Balance(
  address: string,
  contract: string
): Promise<{ asset_id: string; amount: string }> {
  const provider = new ethers.JsonRpcProvider(CONFIG.evm.rpc, CONFIG.evm.chainId);
  const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
  const c = new ethers.Contract(contract, erc20Abi, provider);

  const [raw, decimals] = await Promise.all([c.balanceOf(address), c.decimals()]);
  const amount = ethers.formatUnits(raw, decimals);

  return {
    asset_id: assetIdErc20(CONFIG.evm.chainId, contract),
    amount
  };
}
