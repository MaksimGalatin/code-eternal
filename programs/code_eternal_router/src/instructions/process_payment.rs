use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::UserState;
use crate::errors::CodeEternalError;

/// USDC amounts (6 decimals): $10 = 10_000_000, $100 = 100_000_000, $1000 = 1_000_000_000
pub const TIER_1_AMOUNT: u64 = 10_000_000;
pub const TIER_2_AMOUNT: u64 = 100_000_000;
pub const TIER_3_AMOUNT: u64 = 1_000_000_000;

/// Basis points for distribution (10000 = 100%)
pub const ECOSYSTEM_FUND_BPS: u64 = 500;    // 5%
pub const BASE_BURN_BPS: u64 = 500;  // 5% always burned
pub const REF1_BPS: u64 = 1500;      // 15%
pub const REF2_BPS: u64 = 700;       // 7%
pub const REF3_BPS: u64 = 300;       // 3%
pub const VAULT_BPS: u64 = 6500;     // 65%
// Total: 500+500+1500+700+300+6500 = 10000 ✅

/// Ecosystem fund wallet (generated 2026-04-19, Devnet)
/// Keypair stored in secrets/ecosystem-fund-keypair.json
pub const ECOSYSTEM_FUND_WALLET: Pubkey = pubkey!("CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c");

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    /// Payer (subscription buyer)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Payer's UserState PDA (must already exist via register_user)
    #[account(
        mut,
        seeds = [b"user", payer.key().as_ref()],
        bump = user_state.bump,
        constraint = user_state.owner == payer.key()
    )]
    pub user_state: Account<'info, UserState>,

    /// Payer's USDC token account
    #[account(
        mut,
        constraint = payer_token_account.owner == payer.key(),
        constraint = payer_token_account.mint == payment_mint.key()
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    /// Vault PDA — authority over vault_token_account (holds no data)
    /// CHECK: PDA used only as ATA authority
    #[account(seeds = [b"vault"], bump)]
    pub vault: UncheckedAccount<'info>,

    /// Vault USDC ATA — protocol treasury (65%)
    /// Initialized once at deploy time, only mutated here
    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Ecosystem fund USDC token account — receives 5%
    #[account(
        mut,
        constraint = ecosystem_fund_token_account.owner == ECOSYSTEM_FUND_WALLET @ CodeEternalError::UnauthorizedBackend,
        constraint = ecosystem_fund_token_account.mint == payment_mint.key(),
    )]
    pub ecosystem_fund_token_account: Account<'info, TokenAccount>,

    /// Referral L1 — either a real token account or System Program ID if no referral
    /// CHECK: if key() == System Program → no referral, otherwise treated as token account
    #[account(mut)]
    pub ref1_token_account: UncheckedAccount<'info>,

    /// CHECK: same as ref1_token_account
    #[account(mut)]
    pub ref2_token_account: UncheckedAccount<'info>,

    /// CHECK: same as ref1_token_account
    #[account(mut)]
    pub ref3_token_account: UncheckedAccount<'info>,

    /// USDC mint — for validating mint on all token accounts
    pub payment_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ProcessPayment>,
    amount_usdc: u64,
    tier: u8,
    ref1: Option<Pubkey>,
    ref2: Option<Pubkey>,
    ref3: Option<Pubkey>,
) -> Result<()> {
    // 1. Validate tier and amount
    let expected_amount = match tier {
        1 => TIER_1_AMOUNT,
        2 => TIER_2_AMOUNT,
        3 => TIER_3_AMOUNT,
        _ => return Err(CodeEternalError::InvalidTier.into()),
    };
    require!(amount_usdc == expected_amount, CodeEternalError::InvalidAmount);

    // 2. Check balance
    require!(
        ctx.accounts.payer_token_account.amount >= amount_usdc,
        CodeEternalError::InsufficientFunds
    );

    // 3. Calculate distribution
    let ecosystem_fund_amount = calc_bps(amount_usdc, ECOSYSTEM_FUND_BPS)?;
    let ref1_amount   = calc_bps(amount_usdc, REF1_BPS)?;
    let ref2_amount   = calc_bps(amount_usdc, REF2_BPS)?;
    let ref3_amount   = calc_bps(amount_usdc, REF3_BPS)?;
    let vault_amount  = calc_bps(amount_usdc, VAULT_BPS)?;

    // 5% base burn + shares from unfilled referral levels
    let mut burn_amount = calc_bps(amount_usdc, BASE_BURN_BPS)?;

    // Clone AccountInfo once to avoid borrow checker errors on sequential CPIs
    let payer_ai   = ctx.accounts.payer_token_account.to_account_info();
    let payer_auth = ctx.accounts.payer.to_account_info();
    let token_prog = ctx.accounts.token_program.to_account_info();
    let sys_id     = anchor_lang::system_program::ID;
    let expected_mint = ctx.accounts.payment_mint.key();

    // Validate referral account mints before any transfers — prevents token confusion attacks
    for ref_account in [
        &ctx.accounts.ref1_token_account,
        &ctx.accounts.ref2_token_account,
        &ctx.accounts.ref3_token_account,
    ] {
        if ref_account.key() != sys_id {
            let data = ref_account.try_borrow_data()?;
            // SPL TokenAccount mint field is at bytes 0..32
            require!(data.len() >= 32, CodeEternalError::InvalidReferralMint);
            let mint_bytes: [u8; 32] = data[0..32].try_into().unwrap();
            require!(
                Pubkey::from(mint_bytes) == expected_mint,
                CodeEternalError::InvalidReferralMint
            );
        }
    }

    // 4. Transfer to ecosystem fund (5%)
    transfer_usdc(
        payer_ai.clone(),
        ctx.accounts.ecosystem_fund_token_account.to_account_info(),
        payer_auth.clone(),
        token_prog.clone(),
        ecosystem_fund_amount,
    )?;

    // 5. Referral L1 (15%) or burn
    if ctx.accounts.ref1_token_account.key() != sys_id {
        transfer_usdc(
            payer_ai.clone(),
            ctx.accounts.ref1_token_account.to_account_info(),
            payer_auth.clone(),
            token_prog.clone(),
            ref1_amount,
        )?;
    } else {
        burn_amount = burn_amount.checked_add(ref1_amount)
            .ok_or(CodeEternalError::Overflow)?;
    }

    // 6. Referral L2 (7%) or burn
    if ctx.accounts.ref2_token_account.key() != sys_id {
        transfer_usdc(
            payer_ai.clone(),
            ctx.accounts.ref2_token_account.to_account_info(),
            payer_auth.clone(),
            token_prog.clone(),
            ref2_amount,
        )?;
    } else {
        burn_amount = burn_amount.checked_add(ref2_amount)
            .ok_or(CodeEternalError::Overflow)?;
    }

    // 7. Referral L3 (3%) or burn
    if ctx.accounts.ref3_token_account.key() != sys_id {
        transfer_usdc(
            payer_ai.clone(),
            ctx.accounts.ref3_token_account.to_account_info(),
            payer_auth.clone(),
            token_prog.clone(),
            ref3_amount,
        )?;
    } else {
        burn_amount = burn_amount.checked_add(ref3_amount)
            .ok_or(CodeEternalError::Overflow)?;
    }

    // 8. Transfer to vault (65%)
    transfer_usdc(
        payer_ai.clone(),
        ctx.accounts.vault_token_account.to_account_info(),
        payer_auth.clone(),
        token_prog.clone(),
        vault_amount,
    )?;

    // 9. Burn on-chain (5% base + void referral slots)
    // Payer is the signer so they authorize the burn from their own token account
    burn_usdc(
        ctx.accounts.payment_mint.to_account_info(),
        payer_ai,
        payer_auth,
        token_prog,
        burn_amount,
    )?;

    // 10. Update tier in UserState
    let user_state = &mut ctx.accounts.user_state;
    user_state.tier = tier;

    // 11. Emit event — listener picks this up and triggers site generation
    let clock = Clock::get()?;
    emit!(PaymentProcessed {
        wallet: ctx.accounts.payer.key(),
        tier,
        amount_usdc,
        ref1,
        ref2,
        ref3,
        burn_amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Payment processed: {} USDC, tier {}, burn {} USDC",
        amount_usdc, tier, burn_amount
    );

    Ok(())
}

/// USDC transfer via SPL Token CPI
/// Takes AccountInfo to avoid borrow checker issues on multiple calls
fn transfer_usdc<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let cpi_accounts = Transfer { from, to, authority };
    let cpi_ctx = CpiContext::new(token_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}

/// SPL Token burn CPI — burns from payer's token account (payer is signer)
fn burn_usdc<'info>(
    mint: AccountInfo<'info>,
    from: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let cpi_accounts = Burn { mint, from, authority };
    let cpi_ctx = CpiContext::new(token_program, cpi_accounts);
    token::burn(cpi_ctx, amount)?;
    Ok(())
}

/// Basis points calculation without u64 overflow
fn calc_bps(amount: u64, bps: u64) -> Result<u64> {
    amount
        .checked_mul(bps)
        .and_then(|v| v.checked_div(10_000))
        .ok_or(CodeEternalError::Overflow.into())
}

/// Event for the listener — contains everything needed to generate a site
#[event]
pub struct PaymentProcessed {
    pub wallet: Pubkey,
    pub tier: u8,
    pub amount_usdc: u64,
    pub ref1: Option<Pubkey>,
    pub ref2: Option<Pubkey>,
    pub ref3: Option<Pubkey>,
    /// USDC amount burned on-chain (void referral slots + 5% base)
    pub burn_amount: u64,
    pub timestamp: i64,
}
