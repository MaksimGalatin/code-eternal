import type { Idl } from "@coral-xyz/anchor";

export const IDL: Idl = {
  address: "8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep",
  metadata: {
    name: "code_eternal_router",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "register_user",
      accounts: [
        { name: "payer", writable: true, signer: true },
        { name: "user_state", writable: true },
        { name: "system_program" },
      ],
      args: [
        { name: "referrer", type: { option: "pubkey" } },
      ],
    },
    {
      name: "process_payment",
      accounts: [
        { name: "payer", writable: true, signer: true },
        { name: "user_state", writable: true },
        { name: "payer_token_account", writable: true },
        { name: "vault" },
        { name: "vault_token_account", writable: true },
        { name: "ecosystem_fund_token_account", writable: true },
        { name: "ref1_token_account", writable: true },
        { name: "ref2_token_account", writable: true },
        { name: "ref3_token_account", writable: true },
        { name: "payment_mint" },
        { name: "token_program" },
        { name: "associated_token_program" },
        { name: "system_program" },
      ],
      args: [
        { name: "amount_usdc", type: "u64" },
        { name: "tier", type: "u8" },
        { name: "ref1", type: { option: "pubkey" } },
        { name: "ref2", type: { option: "pubkey" } },
        { name: "ref3", type: { option: "pubkey" } },
      ],
    },
    {
      name: "update_site_url",
      accounts: [
        { name: "backend_authority", signer: true },
        { name: "user_state", writable: true },
        { name: "user_wallet" },
      ],
      args: [
        { name: "arweave_url", type: { array: ["u8", 64] } },
        { name: "site_status", type: "u8" },
      ],
    },
    {
      name: "award_memory",
      accounts: [
        { name: "oracle", signer: true },
        { name: "user_state", writable: true },
      ],
      args: [
        { name: "score", type: "u64" },
      ],
    },
  ],
  accounts: [
    {
      name: "UserState",
      discriminator: [],
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "referrer", type: { option: "pubkey" } },
          { name: "tier", type: "u8" },
          { name: "registered_at", type: "i64" },
          { name: "memory_score", type: "u64" },
          { name: "arweave_url", type: { array: ["u8", 64] } },
          { name: "site_status", type: "u8" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "SelfReferral", msg: "Cannot refer yourself" },
    { code: 6001, name: "InvalidTier", msg: "Tier must be 1, 2, or 3" },
    { code: 6002, name: "InvalidAmount", msg: "Amount does not match tier" },
    { code: 6003, name: "InsufficientFunds", msg: "Insufficient token balance" },
    { code: 6004, name: "UnauthorizedBackend", msg: "Unauthorized backend authority" },
    { code: 6005, name: "UrlTooLong", msg: "Arweave URL too long or invalid status" },
    { code: 6006, name: "Overflow", msg: "Arithmetic overflow" },
    { code: 6007, name: "InvalidReferralMint", msg: "Referral account mint mismatch" },
  ],
} as unknown as Idl;

export type UserState = {
  owner: string;
  referrer: string | null;
  tier: number;
  registered_at: number;
  memory_score: number;
  arweave_url: number[];
  site_status: number;
  bump: number;
};

export const TIER_NAMES: Record<number, string> = {
  0: "UNREGISTERED",
  1: "STARTER ($10)",
  2: "PRO ($100)",
  3: "ELITE ($1000)",
};

export const SITE_STATUS: Record<number, string> = {
  0: "PENDING",
  1: "READY",
  2: "ERROR",
};
