#![allow(ambiguous_glob_reexports)] // each module has a `handler` fn; glob needed for Anchor macro-generated types

pub mod register_user;
pub mod process_payment;
pub mod update_site_url;
pub mod award_memory;

pub use register_user::*;
pub use process_payment::*;
pub use update_site_url::*;
pub use award_memory::*;
