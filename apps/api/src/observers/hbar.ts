export async function hbarFetchSnapshot(address: string) {
  return {
    native_balance: "0",
    token_balances: [],
    metadata: { note: "hbar snapshot stub v1", address }
  };
}
