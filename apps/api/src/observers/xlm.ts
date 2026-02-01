export async function xlmFetchSnapshot(address: string) {
  return {
    native_balance: "0",
    token_balances: [],
    metadata: { note: "xlm snapshot stub v1", address }
  };
}
