use anchor_lang::prelude::*;
use crate::state::UserState;
use crate::errors::CodeEternalError;
use crate::instructions::update_site_url::BACKEND_AUTHORITY;

#[derive(Accounts)]
pub struct AwardMemory<'info> {
    /// Authorized oracle (same key as backend for MVP)
    #[account(
        constraint = oracle_authority.key() == BACKEND_AUTHORITY @ CodeEternalError::UnauthorizedOracle
    )]
    pub oracle_authority: Signer<'info>,

    /// UserState PDA of the user receiving the score
    #[account(
        mut,
        seeds = [b"user", user_wallet.key().as_ref()],
        bump = user_state.bump,
    )]
    pub user_state: Account<'info, UserState>,

    /// CHECK: used only as a seed for PDA derivation
    pub user_wallet: AccountInfo<'info>,
}

pub fn handler(ctx: Context<AwardMemory>, score: u64) -> Result<()> {
    let user_state = &mut ctx.accounts.user_state;

    user_state.memory_score = user_state.memory_score
        .checked_add(score)
        .ok_or(CodeEternalError::Overflow)?;

    emit!(MemoryAwarded {
        wallet: user_state.owner,
        score_added: score,
        total_score: user_state.memory_score,
    });

    msg!(
        "Memory score awarded: {} points, total: {}",
        score, user_state.memory_score
    );
    Ok(())
}

#[event]
pub struct MemoryAwarded {
    pub wallet: Pubkey,
    pub score_added: u64,
    pub total_score: u64,
}
