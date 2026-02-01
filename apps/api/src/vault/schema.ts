import { z } from "zod";

export const ChainSchema = z.enum([
  "xrpl",
  "evm",
  "btc",
  "sol",
  "ada",
  "hbar",
  "xlm"
]);
export type Chain = z.infer<typeof ChainSchema>;

export const AccountTypeSchema = z.enum([
  "onchain_wallet",
  "exchange",
  "merchant",
  "custom",
  "manual"
]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountStatusSchema = z.enum(["active", "paused", "deleted"]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

export const AccountSchema = z.object({
  account_id: z.string(),
  type: AccountTypeSchema,
  chain: ChainSchema,
  label: z.string(),
  address_or_identifier: z.string(),
  network: z.string().optional(),
  created_at: z.string(),
  status: AccountStatusSchema
});
export type Account = z.infer<typeof AccountSchema>;

export const SnapshotSchema = z.object({
  snapshot_id: z.string(),
  account_id: z.string(),
  ts: z.string(),
  native_balance: z.string(),
  token_balances: z.array(z.object({ asset_id: z.string(), amount: z.string() })),
  metadata: z.record(z.any()).default({})
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const EventSchema = z.object({
  event_id: z.string(),
  account_id: z.string(),
  ts: z.string(),
  kind: z.enum([
    "transfer_in",
    "transfer_out",
    "fee",
    "swap",
    "mint",
    "burn",
    "amm",
    "trustline",
    "reward",
    "staking",
    "unknown",
    "manual"
  ]),
  asset_id: z.string(),
  amount: z.string(),
  counterparty: z.string().optional().default(""),
  txid: z.string().optional().default(""),
  memo: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  note: z.string().default(""),
  raw_ref: z.record(z.any()).default({})
});
export type Event = z.infer<typeof EventSchema>;
