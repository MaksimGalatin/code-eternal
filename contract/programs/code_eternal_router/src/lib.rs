#![allow(unexpected_cfgs)] // Anchor 0.30.1 emits cfg(anchor-debug) which Rust 1.89 flags
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("6EPLCgJA7RQ999rAVntjHSJnWzozPGGkcinZgYt15JXQ");

#[program]
pub mod code_eternal_router {
    use super::*;

    /// Registers a new user, creates a UserState PDA
    pub fn register_user(
        ctx: Context<RegisterUser>,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        instructions::register_user::handler(ctx, referrer)
    }

    /// Core instruction: accepts USDC and distributes 5/5/15/7/3/65
    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount_usdc: u64,
        tier: u8,
        ref1: Option<Pubkey>,
        ref2: Option<Pubkey>,
        ref3: Option<Pubkey>,
    ) -> Result<()> {
        instructions::process_payment::handler(ctx, amount_usdc, tier, ref1, ref2, ref3)
    }

    /// Writes the Arweave URL after site generation (authorized backend only)
    pub fn update_site_url(
        ctx: Context<UpdateSiteUrl>,
        arweave_url: [u8; 64],
        site_status: u8,
    ) -> Result<()> {
        instructions::update_site_url::handler(ctx, arweave_url, site_status)
    }

    /// Awards memory_score to a user (authorized oracle only)
    pub fn award_memory(
        ctx: Context<AwardMemory>,
        score: u64,
    ) -> Result<()> {
        instructions::award_memory::handler(ctx, score)
    }
}
