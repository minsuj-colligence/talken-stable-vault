// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPermit2.sol";

/**
 * @title TSV_USDT_Vault_BSC
 * @notice EIP-4626 vault for USDT on BSC with Permit2 for gasless deposits
 * @dev Native USDT doesn't support EIP-2612, so we use Permit2 instead
 */
contract TSV_USDT_Vault_BSC is ERC4626, Ownable2Step, ReentrancyGuard {
    /// @notice Withdrawal fee in basis points (10 = 0.1%)
    uint16 public feeBps;

    /// @notice Maximum allowed fee (100 bps = 1.0%)
    uint16 public constant MAX_FEE_BPS = 100;

    /// @notice Permit2 contract for gasless approvals
    IPermit2 public immutable permit2;

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
    error InvalidPermit2();

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        uint16 initialFeeBps_,
        address permit2_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(initialFeeBps_ <= MAX_FEE_BPS, "Invalid initial fee");
        require(permit2_ != address(0), "Invalid Permit2");

        feeBps = initialFeeBps_;
        permit2 = IPermit2(permit2_);

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
     * @notice Set withdrawal fee
     */
    function setFeeBps(uint16 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert InvalidFee();
        feeBps = newBps;
        emit FeeUpdated(newBps);
    }

    /**
     * @notice Gasless deposit using Permit2
     * @param assets Amount to deposit
     * @param receiver Shares recipient
     * @param deadline Permit deadline
     * @param signature Permit2 signature
     */
    function depositWithPermit2(
        uint256 assets,
        address receiver,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (uint256 shares) {
        // Pull tokens via Permit2
        permit2.permitTransferFrom(
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({token: address(asset()), amount: assets}),
                nonce: nonces[msg.sender]++,
                deadline: deadline
            }),
            IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: assets}),
            msg.sender,
            signature
        );

        // Deposit and mint shares
        shares = _deposit(msg.sender, receiver, assets, previewDeposit(assets));
    }

    /**
     * @notice Gasless withdraw using EIP-712 signature
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
     * @notice Preview redeem with fee
     */
    function previewRedeem(uint256 shares) public view virtual override returns (uint256 assets) {
        uint256 gross = _convertToAssets(shares, Math.Rounding.Floor);
        uint256 fee = (gross * feeBps) / 10_000;
        assets = gross - fee;
    }

    /**
     * @notice Preview withdraw with fee
     */
    function previewWithdraw(uint256 assets) public view virtual override returns (uint256 shares) {
        uint256 gross = (assets * 10_000) / (10_000 - feeBps);
        shares = _convertToShares(gross, Math.Rounding.Ceil);
    }

    /**
     * @notice Internal withdraw with fee logic
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

        _burn(owner, shares);

        uint256 gross = _convertToAssets(shares, Math.Rounding.Floor);
        uint256 fee = (gross * feeBps) / 10_000;
        uint256 netAssets = gross - fee;

        SafeERC20.safeTransfer(IERC20(asset()), receiver, netAssets);

        emit Withdraw(caller, receiver, owner, netAssets, shares);
    }

    function maxWithdraw(address owner) public view virtual override returns (uint256) {
        return previewRedeem(balanceOf(owner));
    }

    function maxRedeem(address owner) public view virtual override returns (uint256) {
        return balanceOf(owner);
    }
}
