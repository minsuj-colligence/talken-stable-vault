// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IERC3009.sol";

/**
 * @title TSV_USDT0_Vault
 * @notice EIP-4626 compliant vault for USDT0 on Arbitrum with gasless deposits/withdrawals
 * @dev Implements 0.1% withdrawal fee (10 bps), configurable by owner with timelock
 */
contract TSV_USDT0_Vault is ERC4626, Ownable2Step, ReentrancyGuard {
    /// @notice Withdrawal fee in basis points (10 = 0.1%)
    uint16 public feeBps;

    /// @notice Maximum allowed fee (100 bps = 1.0%)
    uint16 public constant MAX_FEE_BPS = 100;

    /// @notice Nonces for EIP-712 meta-redeem signatures
    mapping(address => uint256) public nonces;

    /// @notice EIP-712 domain separator
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice EIP-712 typehash for meta-redeem
    bytes32 public constant META_REDEEM_TYPEHASH =
        keccak256("MetaRedeem(address owner,uint256 shares,address receiver,uint256 nonce,uint256 deadline)");

    event FeeUpdated(uint16 newFeeBps);
    event MetaRedeem(address indexed owner, address indexed receiver, uint256 shares, uint256 assets);

    error InvalidFee();
    error DeadlineExpired();
    error InvalidSignature();

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        uint16 initialFeeBps_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(initialFeeBps_ <= MAX_FEE_BPS, "Invalid initial fee");
        feeBps = initialFeeBps_;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name_)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Set withdrawal fee in basis points
     * @param newBps New fee in bps (max 100 = 1.0%)
     * @dev Protected by Ownable2Step for multisig/timelock safety
     */
    function setFeeBps(uint16 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert InvalidFee();
        feeBps = newBps;
        emit FeeUpdated(newBps);
    }

    /**
     * @notice Gasless deposit using EIP-2612 permit
     * @param assets Amount to deposit
     * @param receiver Shares recipient
     * @param deadline Permit deadline
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function depositWithPermit(
        uint256 assets,
        address receiver,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256 shares) {
        IERC20Permit(asset()).permit(msg.sender, address(this), assets, deadline, v, r, s);
        shares = deposit(assets, receiver);
    }

    /**
     * @notice Gasless deposit using EIP-3009 transferWithAuthorization
     * @param from Token owner
     * @param to This vault
     * @param value Amount to deposit
     * @param validAfter Valid after timestamp
     * @param validBefore Valid before timestamp
     * @param nonce Unique nonce
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     * @param receiver Shares recipient
     */
    function depositWithAuth(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address receiver
    ) external nonReentrant returns (uint256 shares) {
        require(to == address(this), "Invalid to address");
        IERC3009(asset()).transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s);

        // Deposit on behalf of 'from'
        shares = _deposit(from, receiver, value, previewDeposit(value));
    }

    /**
     * @notice Gasless withdraw using EIP-712 signature (meta-redeem)
     * @param owner Share owner
     * @param shares Amount of shares to redeem
     * @param receiver Assets recipient
     * @param deadline Signature deadline
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function redeemWithSig(
        address owner,
        uint256 shares,
        address receiver,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256 assets) {
        if (block.timestamp > deadline) revert DeadlineExpired();

        bytes32 structHash = keccak256(
            abi.encode(META_REDEEM_TYPEHASH, owner, shares, receiver, nonces[owner]++, deadline)
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0) || signer != owner) revert InvalidSignature();

        assets = redeem(shares, receiver, owner);
        emit MetaRedeem(owner, receiver, shares, assets);
    }

    /**
     * @notice Preview withdraw with fee deduction
     * @param shares Amount of shares to redeem
     * @return assets Net assets after fee
     */
    function previewRedeem(uint256 shares) public view virtual override returns (uint256 assets) {
        uint256 gross = _convertToAssets(shares, Math.Rounding.Floor);
        uint256 fee = (gross * feeBps) / 10_000;
        assets = gross - fee;
    }

    /**
     * @notice Preview withdraw assets with fee calculation
     * @param assets Net assets to receive
     * @return shares Shares needed (accounting for fee)
     */
    function previewWithdraw(uint256 assets) public view virtual override returns (uint256 shares) {
        // Reverse calculation: gross = assets / (1 - feeBps/10000)
        uint256 gross = (assets * 10_000) / (10_000 - feeBps);
        shares = _convertToShares(gross, Math.Rounding.Ceil);
    }

    /**
     * @notice Internal redeem override to apply withdrawal fee
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // Burn shares
        _burn(owner, shares);

        // Calculate fee on gross assets
        uint256 gross = _convertToAssets(shares, Math.Rounding.Floor);
        uint256 fee = (gross * feeBps) / 10_000;
        uint256 netAssets = gross - fee;

        // Transfer net assets to receiver, fee stays in vault
        SafeERC20.safeTransfer(IERC20(asset()), receiver, netAssets);

        emit Withdraw(caller, receiver, owner, netAssets, shares);
    }

    /**
     * @notice Max withdraw accounting for fee
     */
    function maxWithdraw(address owner) public view virtual override returns (uint256) {
        uint256 shares = balanceOf(owner);
        return previewRedeem(shares);
    }

    /**
     * @notice Max redeem is balance of owner
     */
    function maxRedeem(address owner) public view virtual override returns (uint256) {
        return balanceOf(owner);
    }
}
