import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import type { VaultConfig, VaultInfo } from '../types/index.js'

export class SolanaVaultClient {
  private connection: Connection
  private programId: PublicKey
  private vaultPubkey: PublicKey

  constructor(config: VaultConfig, connection?: Connection) {
    this.connection = connection || new Connection(config.rpcUrl, 'confirmed')
    this.vaultPubkey = new PublicKey(config.address)
    // In production, use actual program ID
    this.programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')
  }

  /**
   * Get vault info
   */
  async getVaultInfo(): Promise<VaultInfo> {
    const accountInfo = await this.connection.getAccountInfo(this.vaultPubkey)
    if (!accountInfo) throw new Error('Vault not found')

    // Deserialize vault state (simplified - use Anchor IDL in production)
    // Assuming layout: [authority(32), assetMint(32), totalAssets(8), totalShares(8), feeBps(2)]
    const data = accountInfo.data

    const totalAssets = data.readBigUInt64LE(96)
    const totalShares = data.readBigUInt64LE(104)
    const feeBps = data.readUInt16LE(112)

    const pricePerShare = totalShares > 0n
      ? Number(totalAssets) / Number(totalShares)
      : 1.0

    return {
      totalAssets,
      totalShares,
      pricePerShare,
      feeBps,
    }
  }

  /**
   * Deposit USDC
   */
  async deposit(
    payer: Keypair,
    userAsset: PublicKey,
    userShares: PublicKey,
    amount: bigint
  ): Promise<string> {
    // Create deposit instruction (simplified)
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: this.vaultPubkey, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: userAsset, isSigner: false, isWritable: true },
        { pubkey: userShares, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.from([
        0, // Instruction discriminator for deposit
        ...new Uint8Array(new BigUint64Array([amount]).buffer),
      ]),
    })

    const transaction = new Transaction().add(instruction)
    const signature = await this.connection.sendTransaction(transaction, [payer])
    await this.connection.confirmTransaction(signature)

    return signature
  }

  /**
   * Redeem shares
   */
  async redeem(
    payer: Keypair,
    userAsset: PublicKey,
    userShares: PublicKey,
    shares: bigint
  ): Promise<string> {
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: this.vaultPubkey, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: userAsset, isSigner: false, isWritable: true },
        { pubkey: userShares, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.from([
        1, // Instruction discriminator for redeem
        ...new Uint8Array(new BigUint64Array([shares]).buffer),
      ]),
    })

    const transaction = new Transaction().add(instruction)
    const signature = await this.connection.sendTransaction(transaction, [payer])
    await this.connection.confirmTransaction(signature)

    return signature
  }

  /**
   * Meta-redeem (gasless)
   */
  async metaRedeem(
    relayer: Keypair,
    owner: PublicKey,
    shares: bigint,
    deadline: number,
    signature: Uint8Array
  ): Promise<string> {
    // Derive user nonce PDA
    const [userNoncePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('nonce'), owner.toBuffer()],
      this.programId
    )

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: this.vaultPubkey, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: relayer.publicKey, isSigner: true, isWritable: true },
        { pubkey: userNoncePDA, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: Buffer.from([
        2, // Instruction discriminator for meta_redeem
        ...new Uint8Array(new BigUint64Array([shares]).buffer),
        ...new Uint8Array(new BigInt64Array([BigInt(deadline)]).buffer),
        ...signature,
      ]),
    })

    const transaction = new Transaction().add(instruction)
    const sig = await this.connection.sendTransaction(transaction, [relayer])
    await this.connection.confirmTransaction(sig)

    return sig
  }
}
