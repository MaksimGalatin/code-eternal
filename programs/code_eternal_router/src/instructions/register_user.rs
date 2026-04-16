use anchor_lang::prelude::*;
use crate::state::UserState;
use crate::errors::CodeEternalError;

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    /// New user's wallet — pays rent for their own PDA
    #[account(mut)]
    pub payer: Signer<'info>,

    /// UserState PDA for this user
    /// Seeds: ["user", wallet pubkey]
    #[account(
        init,
        payer = payer,
        space = 8 + UserState::INIT_SPACE,
        seeds = [b"user", payer.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterUser>,
    referrer: Option<Pubkey>,
) -> Result<()> {
    if let Some(ref_key) = referrer {
        require!(ref_key != ctx.accounts.payer.key(), CodeEternalError::SelfReferral);
    }

    let user_state = &mut ctx.accounts.user_state;
    let clock = Clock::get()?;

    user_state.owner = ctx.accounts.payer.key();
    user_state.referrer = referrer;
    user_state.tier = 0; // tier is set during process_payment based on amount paid
    user_state.registered_at = clock.unix_timestamp;
    user_state.memory_score = 0;
    user_state.arweave_url = [0u8; 64];
    user_state.site_status = 0; // pending
    user_state.bump = ctx.bumps.user_state;

    emit!(UserRegistered {
        wallet: ctx.accounts.payer.key(),
        referrer,
        timestamp: clock.unix_timestamp,
    });

    msg!("User registered: {}", ctx.accounts.payer.key());
    Ok(())
}

/// Event for the listener service
#[event]
pub struct UserRegistered {
    pub wallet: Pubkey,
    pub referrer: Option<Pubkey>,
    pub timestamp: i64,
}
