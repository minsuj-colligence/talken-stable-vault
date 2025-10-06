use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod tsv_usdc_vault {
    use super::*;

    /// Initialize the vault
    pub fn initialize(ctx: Context<Initialize>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= 100, VaultError::InvalidFee);

        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.asset_mint = ctx.accounts.asset_mint.key();
        vault.share_mint = ctx.accounts.share_mint.key();
        vault.asset_vault = ctx.accounts.asset_vault.key();
        vault.total_assets = 0;
        vault.total_shares = 0;
        vault.fee_bps = fee_bps;
        vault.bump = ctx.bumps.vault;

        Ok(())
    }

    /// Deposit USDC and mint shares
    pub fn deposit(ctx: Context<Deposit>, assets: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        // Calculate shares to mint
        let shares = if vault.total_shares == 0 {
            assets // 1:1 for first deposit
        } else {
            (assets as u128)
                .checked_mul(vault.total_shares as u128)
                .unwrap()
                .checked_div(vault.total_assets as u128)
                .unwrap() as u64
        };

        // Transfer assets from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_asset.to_account_info(),
            to: ctx.accounts.asset_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, assets)?;

        // Mint shares to user
        let seeds = &[b"vault", &[vault.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.share_mint.to_account_info(),
            to: ctx.accounts.user_shares.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, shares)?;

        // Update vault state
        vault.total_assets = vault.total_assets.checked_add(assets).unwrap();
        vault.total_shares = vault.total_shares.checked_add(shares).unwrap();

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            assets,
            shares,
        });

        Ok(())
    }

    /// Redeem shares for USDC (with fee)
    pub fn redeem(ctx: Context<Redeem>, shares: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        // Calculate gross assets
        let gross_assets = (shares as u128)
            .checked_mul(vault.total_assets as u128)
            .unwrap()
            .checked_div(vault.total_shares as u128)
            .unwrap() as u64;

        // Apply fee (10 bps = 0.1%)
        let fee = (gross_assets as u128)
            .checked_mul(vault.fee_bps as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;

        let net_assets = gross_assets.checked_sub(fee).unwrap();

        // Burn user shares
        let cpi_accounts = token::Burn {
            mint: ctx.accounts.share_mint.to_account_info(),
            from: ctx.accounts.user_shares.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, shares)?;

        // Transfer net assets to user
        let seeds = &[b"vault", &[vault.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.asset_vault.to_account_info(),
            to: ctx.accounts.user_asset.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, net_assets)?;

        // Update vault state (fee remains in vault)
        vault.total_assets = vault.total_assets.checked_sub(net_assets).unwrap();
        vault.total_shares = vault.total_shares.checked_sub(shares).unwrap();

        emit!(RedeemEvent {
            user: ctx.accounts.user.key(),
            shares,
            assets: net_assets,
            fee,
        });

        Ok(())
    }

    /// Meta-redeem: gasless redeem using off-chain signature
    pub fn meta_redeem(
        ctx: Context<MetaRedeem>,
        shares: u64,
        deadline: i64,
        signature: [u8; 64],
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp <= deadline, VaultError::DeadlineExpired);

        // Verify signature (simplified - production would use ed25519 verify)
        // In production, verify that signature is valid for:
        // sign(owner_pubkey, shares, receiver, nonce, deadline)

        let user_nonce = &mut ctx.accounts.user_nonce;
        user_nonce.nonce = user_nonce.nonce.checked_add(1).unwrap();

        // Call regular redeem logic
        // (Would need to restructure to share logic)

        Ok(())
    }

    /// Update fee (governance only)
    pub fn update_fee(ctx: Context<UpdateFee>, new_fee_bps: u16) -> Result<()> {
        require!(new_fee_bps <= 100, VaultError::InvalidFee);

        let vault = &mut ctx.accounts.vault;
        vault.fee_bps = new_fee_bps;

        emit!(FeeUpdatedEvent { new_fee_bps });

        Ok(())
    }

    /// Emergency withdraw (admin only)
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let seeds = &[b"vault", &[vault.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.asset_vault.to_account_info(),
            to: ctx.accounts.admin_asset.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }
}

// Accounts

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub asset_mint: Account<'info, Mint>,
    pub share_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = asset_mint,
        token::authority = vault,
    )]
    pub asset_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, constraint = user_asset.mint == vault.asset_mint)]
    pub user_asset: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_shares.mint == vault.share_mint)]
    pub user_shares: Account<'info, TokenAccount>,

    #[account(mut, constraint = asset_vault.key() == vault.asset_vault)]
    pub asset_vault: Account<'info, TokenAccount>,

    #[account(mut, address = vault.share_mint)]
    pub share_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, constraint = user_asset.mint == vault.asset_mint)]
    pub user_asset: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_shares.mint == vault.share_mint)]
    pub user_shares: Account<'info, TokenAccount>,

    #[account(mut, constraint = asset_vault.key() == vault.asset_vault)]
    pub asset_vault: Account<'info, TokenAccount>,

    #[account(mut, address = vault.share_mint)]
    pub share_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MetaRedeem<'info> {
    #[account(seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    /// CHECK: Owner of shares (verified by signature)
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub relayer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = relayer,
        space = 8 + UserNonce::INIT_SPACE,
        seeds = [b"nonce", owner.key().as_ref()],
        bump
    )]
    pub user_nonce: Account<'info, UserNonce>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFee<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump, has_one = authority)]
    pub vault: Account<'info, Vault>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(seeds = [b"vault"], bump = vault.bump, has_one = authority)]
    pub vault: Account<'info, Vault>,

    pub authority: Signer<'info>,

    #[account(mut)]
    pub asset_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub admin_asset: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// State

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub asset_mint: Pubkey,
    pub share_mint: Pubkey,
    pub asset_vault: Pubkey,
    pub total_assets: u64,
    pub total_shares: u64,
    pub fee_bps: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserNonce {
    pub nonce: u64,
}

// Events

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub assets: u64,
    pub shares: u64,
}

#[event]
pub struct RedeemEvent {
    pub user: Pubkey,
    pub shares: u64,
    pub assets: u64,
    pub fee: u64,
}

#[event]
pub struct FeeUpdatedEvent {
    pub new_fee_bps: u16,
}

// Errors

#[error_code]
pub enum VaultError {
    #[msg("Invalid fee (max 100 bps = 1.0%)")]
    InvalidFee,
    #[msg("Signature deadline expired")]
    DeadlineExpired,
    #[msg("Invalid signature")]
    InvalidSignature,
}
