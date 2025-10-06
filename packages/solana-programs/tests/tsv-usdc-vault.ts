import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from '@solana/spl-token'
import { assert } from 'chai'
import { TsvUsdcVault } from '../target/types/tsv_usdc_vault'

describe('tsv-usdc-vault', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.TsvUsdcVault as Program<TsvUsdcVault>
  const payer = provider.wallet as anchor.Wallet

  let assetMint: PublicKey
  let shareMint: PublicKey
  let vaultPDA: PublicKey
  let assetVault: PublicKey
  let userAsset: PublicKey
  let userShares: PublicKey

  before(async () => {
    // Create asset mint (USDC)
    assetMint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6 // USDC decimals
    )

    // Create share mint
    shareMint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      18 // Share decimals
    )

    // Derive vault PDA
    ;[vaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('vault')], program.programId)

    // Create token accounts
    assetVault = await createAccount(provider.connection, payer.payer, assetMint, vaultPDA)

    userAsset = await createAccount(provider.connection, payer.payer, assetMint, payer.publicKey)

    userShares = await createAccount(provider.connection, payer.payer, shareMint, payer.publicKey)

    // Mint 10,000 USDC to user
    await mintTo(provider.connection, payer.payer, assetMint, userAsset, payer.publicKey, 10_000_000_000)
  })

  it('Initializes the vault', async () => {
    await program.methods
      .initialize(10) // 10 bps fee
      .accounts({
        vault: vaultPDA,
        authority: payer.publicKey,
        assetMint,
        shareMint,
        assetVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const vault = await program.account.vault.fetch(vaultPDA)

    assert.equal(vault.authority.toString(), payer.publicKey.toString())
    assert.equal(vault.feeBps, 10)
    assert.equal(vault.totalAssets.toString(), '0')
    assert.equal(vault.totalShares.toString(), '0')
  })

  it('Deposits USDC', async () => {
    const depositAmount = new anchor.BN(1_000_000_000) // 1,000 USDC

    await program.methods
      .deposit(depositAmount)
      .accounts({
        vault: vaultPDA,
        user: payer.publicKey,
        userAsset,
        userShares,
        assetVault,
        shareMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc()

    const vault = await program.account.vault.fetch(vaultPDA)

    assert.equal(vault.totalAssets.toString(), depositAmount.toString())
    assert.ok(vault.totalShares.gt(new anchor.BN(0)))
  })

  it('Redeems shares', async () => {
    const vault = await program.account.vault.fetch(vaultPDA)
    const shares = vault.totalShares

    const beforeBalance = await provider.connection.getTokenAccountBalance(userAsset)

    await program.methods
      .redeem(shares)
      .accounts({
        vault: vaultPDA,
        user: payer.publicKey,
        userAsset,
        userShares,
        assetVault,
        shareMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc()

    const afterBalance = await provider.connection.getTokenAccountBalance(userAsset)

    // Should receive assets minus 0.1% fee
    assert.ok(
      Number(afterBalance.value.amount) > Number(beforeBalance.value.amount),
      'User should receive assets'
    )
  })

  it('Updates fee (governance)', async () => {
    await program.methods
      .updateFee(20)
      .accounts({
        vault: vaultPDA,
        authority: payer.publicKey,
      })
      .rpc()

    const vault = await program.account.vault.fetch(vaultPDA)
    assert.equal(vault.feeBps, 20)
  })

  it('Fails with invalid fee', async () => {
    try {
      await program.methods
        .updateFee(101) // Over 100 bps
        .accounts({
          vault: vaultPDA,
          authority: payer.publicKey,
        })
        .rpc()

      assert.fail('Should have failed with invalid fee')
    } catch (error) {
      assert.ok(error.toString().includes('InvalidFee'))
    }
  })
})
