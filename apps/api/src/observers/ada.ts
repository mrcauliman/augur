export async function adaFetchSnapshot(address: string) {
  return {
    native_balance: "0",
    token_balances: [],
    metadata: { note: "ada snapshot stub v1", address }
  };
}
