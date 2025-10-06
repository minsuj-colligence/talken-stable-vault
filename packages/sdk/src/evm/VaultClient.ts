import { ethers, type Signer, type Provider } from 'ethers'
import type {
  VaultConfig,
  DepositParams,
  RedeemParams,
  PermitParams,
  MetaRedeemParams,
  VaultInfo,
} from '../types/index.js'

const VAULT_ABI = [
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)',
  'function depositWithPermit(uint256 assets, address receiver, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external returns (uint256 shares)',
  'function redeemWithSig(address owner, uint256 shares, address receiver, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external returns (uint256 assets)',
  'function totalAssets() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function feeBps() external view returns (uint16)',
  'function previewDeposit(uint256 assets) external view returns (uint256 shares)',
  'function previewRedeem(uint256 shares) external view returns (uint256 assets)',
  'function balanceOf(address account) external view returns (uint256)',
  'function asset() external view returns (address)',
]

export class EVMVaultClient {
  private contract: ethers.Contract
  private signer: Signer | null = null

  constructor(
    config: VaultConfig,
    signerOrProvider: Signer | Provider
  ) {
    this.contract = new ethers.Contract(config.address, VAULT_ABI, signerOrProvider)

    if ('sendTransaction' in signerOrProvider) {
      this.signer = signerOrProvider as Signer
    }
  }

  /**
   * Get vault info
   */
  async getVaultInfo(): Promise<VaultInfo> {
    const [totalAssets, totalShares, feeBps] = await Promise.all([
      this.contract.totalAssets(),
      this.contract.totalSupply(),
      this.contract.feeBps(),
    ])

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
   * Standard deposit
   */
  async deposit(params: DepositParams): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for deposit')

    const receiver = params.receiver || await this.signer.getAddress()
    const amount = typeof params.amount === 'string'
      ? ethers.parseUnits(params.amount, 6)
      : params.amount

    return await this.contract.deposit(amount, receiver)
  }

  /**
   * Gasless deposit with EIP-2612 permit
   */
  async depositWithPermit(
    params: DepositParams,
    permit: PermitParams
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required')

    const receiver = params.receiver || await this.signer.getAddress()
    const amount = typeof params.amount === 'string'
      ? ethers.parseUnits(params.amount, 6)
      : params.amount

    return await this.contract.depositWithPermit(
      amount,
      receiver,
      permit.deadline,
      permit.v,
      permit.r,
      permit.s
    )
  }

  /**
   * Standard redeem
   */
  async redeem(params: RedeemParams): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for redeem')

    const owner = await this.signer.getAddress()
    const receiver = params.receiver || owner
    const shares = typeof params.shares === 'string'
      ? ethers.parseUnits(params.shares, 18)
      : params.shares

    return await this.contract.redeem(shares, receiver, owner)
  }

  /**
   * Gasless redeem with signature
   */
  async redeemWithSig(params: MetaRedeemParams): Promise<ethers.ContractTransactionResponse> {
    const shares = typeof params.shares === 'string'
      ? ethers.parseUnits(params.shares, 18)
      : params.shares

    return await this.contract.redeemWithSig(
      params.owner,
      shares,
      params.receiver,
      params.deadline,
      params.signature.v,
      params.signature.r,
      params.signature.s
    )
  }

  /**
   * Preview deposit
   */
  async previewDeposit(amount: string | bigint): Promise<bigint> {
    const amt = typeof amount === 'string'
      ? ethers.parseUnits(amount, 6)
      : amount

    return await this.contract.previewDeposit(amt)
  }

  /**
   * Preview redeem
   */
  async previewRedeem(shares: string | bigint): Promise<bigint> {
    const shr = typeof shares === 'string'
      ? ethers.parseUnits(shares, 18)
      : shares

    return await this.contract.previewRedeem(shr)
  }

  /**
   * Get user balance (shares)
   */
  async balanceOf(address: string): Promise<bigint> {
    return await this.contract.balanceOf(address)
  }

  /**
   * Get asset token address
   */
  async getAsset(): Promise<string> {
    return await this.contract.asset()
  }

  /**
   * Create EIP-712 signature for meta-redeem
   */
  async createMetaRedeemSignature(
    owner: string,
    shares: bigint,
    receiver: string,
    nonce: bigint,
    deadline: number
  ): Promise<{ v: number; r: string; s: string }> {
    if (!this.signer) throw new Error('Signer required')

    const domain = {
      name: 'TSV USDT0 Vault',
      version: '1',
      chainId: await this.signer.provider!.getNetwork().then(n => Number(n.chainId)),
      verifyingContract: await this.contract.getAddress(),
    }

    const types = {
      MetaRedeem: [
        { name: 'owner', type: 'address' },
        { name: 'shares', type: 'uint256' },
        { name: 'receiver', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }

    const value = {
      owner,
      shares,
      receiver,
      nonce,
      deadline,
    }

    const signature = await this.signer.signTypedData(domain, types, value)
    const sig = ethers.Signature.from(signature)

    return {
      v: sig.v,
      r: sig.r,
      s: sig.s,
    }
  }
}
