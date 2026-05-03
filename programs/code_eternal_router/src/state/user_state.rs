use anchor_lang::prelude::*;

/// Site generation status
pub const SITE_STATUS_PENDING: u8 = 0;
pub const SITE_STATUS_READY: u8 = 1;
pub const SITE_STATUS_ERROR: u8 = 2;

#[account]
#[derive(InitSpace)]
pub struct UserState {
    /// User's wallet
    pub owner: Pubkey,

    /// Who referred this user (None = came directly → maximum burn)
    pub referrer: Option<Pubkey>,

    /// Current tier: 1=Starter($10), 2=Pro($100), 3=Elite($1000)
    pub tier: u8,

    /// Unix timestamp of registration
    pub registered_at: i64,

    /// Think-to-Earn points (Proof-of-Memory)
    pub memory_score: u64,

    /// Arweave URL of the eternal site (filled after site generation)
    /// Empty = [0u8; 64] until the site is generated
    pub arweave_url: [u8; 64],

    /// Site status: 0=pending, 1=ready, 2=error
    pub site_status: u8,

    /// PDA bump seed
    pub bump: u8,
}

impl UserState {
    /// Returns true if the site has been successfully generated
    pub fn has_site(&self) -> bool {
        self.site_status == SITE_STATUS_READY && self.arweave_url[0] != 0
    }

    /// Returns the Arweave URL as a string (strips null bytes)
    pub fn arweave_url_str(&self) -> &str {
        let end = self.arweave_url
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(64);
        std::str::from_utf8(&self.arweave_url[..end]).unwrap_or("")
    }
}
