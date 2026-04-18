use anchor_lang::prelude::*;

#[error_code]
pub enum CodeEternalError {
    #[msg("Invalid tier. Allowed: 1 (Starter), 2 (Pro), 3 (Elite)")]
    InvalidTier,

    #[msg("Invalid USDC amount for the selected tier")]
    InvalidAmount,

    #[msg("Insufficient USDC balance")]
    InsufficientFunds,

    #[msg("Referrer cannot be the same wallet as the payer")]
    SelfReferral,

    #[msg("Only the authorized oracle can award memory score")]
    UnauthorizedOracle,

    #[msg("Only the authorized backend can update the site URL")]
    UnauthorizedBackend,

    #[msg("Arweave URL too long (max 64 bytes)")]
    UrlTooLong,

    #[msg("User is already registered")]
    AlreadyRegistered,

    #[msg("Arithmetic overflow in distribution calculation")]
    Overflow,

    #[msg("Referral token account mint does not match payment mint")]
    InvalidReferralMint,
}
