use anchor_lang::prelude::*;
use crate::state::{UserState, SITE_STATUS_READY, SITE_STATUS_ERROR};
use crate::errors::CodeEternalError;

/// Minimum seconds between site URL updates per user
pub const UPDATE_COOLDOWN_SECS: i64 = 60;

#[derive(Accounts)]
pub struct UpdateSiteUrl<'info> {
    /// Authorized backend — public key is hardcoded
    #[account(
        constraint = backend_authority.key() == BACKEND_AUTHORITY @ CodeEternalError::UnauthorizedBackend
    )]
    pub backend_authority: Signer<'info>,

    /// UserState PDA of the user whose URL we are updating
    #[account(
        mut,
        seeds = [b"user", user_wallet.key().as_ref()],
        bump = user_state.bump,
    )]
    pub user_state: Account<'info, UserState>,

    /// User's wallet (needed for seed derivation only)
    /// CHECK: used only as a seed for PDA derivation
    pub user_wallet: AccountInfo<'info>,
}

/// Public key of the authorized backend service (generated 2026-04-19)
/// Private key stored in secrets/credentials.env as BACKEND_PRIVATE_KEY (base64)
pub const BACKEND_AUTHORITY: Pubkey = pubkey!("96JwAJL2hn3FHxViqy9oirBdpcDH5rGsvukjTGyiTap4");

pub fn handler(
    ctx: Context<UpdateSiteUrl>,
    arweave_url: [u8; 64],
    site_status: u8,
) -> Result<()> {
    require!(
        site_status == SITE_STATUS_READY || site_status == SITE_STATUS_ERROR,
        CodeEternalError::UrlTooLong // TODO: rename to InvalidSiteStatus post-hackathon
    );

    let clock = Clock::get()?;
    let user_state = &mut ctx.accounts.user_state;

    // Rate-limit: reject if last update was less than UPDATE_COOLDOWN_SECS ago
    require!(
        user_state.last_site_update == 0
            || clock.unix_timestamp - user_state.last_site_update >= UPDATE_COOLDOWN_SECS,
        CodeEternalError::UpdateCooldown
    );

    user_state.arweave_url = arweave_url;
    user_state.site_status = site_status;
    user_state.last_site_update = clock.unix_timestamp;

    emit!(SiteUrlUpdated {
        wallet: user_state.owner,
        arweave_url,
        site_status,
        timestamp: clock.unix_timestamp,
    });

    msg!("Arweave URL updated for {}", user_state.owner);
    Ok(())
}

#[event]
pub struct SiteUrlUpdated {
    pub wallet: Pubkey,
    pub arweave_url: [u8; 64],
    pub site_status: u8,
    pub timestamp: i64,
}
