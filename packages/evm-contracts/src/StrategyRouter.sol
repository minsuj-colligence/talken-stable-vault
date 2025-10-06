// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StrategyRouter
 * @notice Routes vault funds to yield strategies (Aave, Curve, Pendle, etc.)
 * @dev Implements per-strategy caps, slippage guards, cooldowns, emergency exit
 */
contract StrategyRouter is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Strategy {
        address adapter; // Strategy adapter contract
        uint256 cap; // Max allocation (in asset wei)
        uint256 allocated; // Current allocation
        uint256 lastRebalance; // Last rebalance timestamp
        uint256 cooldown; // Min seconds between rebalances
        bool active; // Strategy enabled
        bool emergencyExit; // Force withdraw flag
    }

    /// @notice Base asset (USDT0, USDC, USDT)
    IERC20 public immutable asset;

    /// @notice Vault address that owns funds
    address public vault;

    /// @notice Strategy ID -> Strategy info
    mapping(bytes32 => Strategy) public strategies;

    /// @notice List of all strategy IDs
    bytes32[] public strategyIds;

    /// @notice Global slippage tolerance in bps (default 50 = 0.5%)
    uint16 public slippageBps = 50;

    /// @notice Max slippage allowed (500 = 5%)
    uint16 public constant MAX_SLIPPAGE_BPS = 500;

    event StrategyAdded(bytes32 indexed strategyId, address adapter, uint256 cap);
    event StrategyUpdated(bytes32 indexed strategyId, uint256 newCap, bool active);
    event Allocated(bytes32 indexed strategyId, uint256 amount);
    event Withdrawn(bytes32 indexed strategyId, uint256 amount);
    event EmergencyExit(bytes32 indexed strategyId);
    event SlippageUpdated(uint16 newBps);

    error InvalidVault();
    error InvalidAdapter();
    error InvalidCap();
    error StrategyNotActive();
    error StrategyExists();
    error CapExceeded();
    error CooldownNotMet();
    error SlippageTooHigh();
    error Unauthorized();

    modifier onlyVault() {
        if (msg.sender != vault) revert Unauthorized();
        _;
    }

    constructor(IERC20 asset_, address vault_) Ownable(msg.sender) {
        if (address(asset_) == address(0)) revert InvalidAdapter();
        if (vault_ == address(0)) revert InvalidVault();

        asset = asset_;
        vault = vault_;
    }

    /**
     * @notice Add new strategy
     * @param strategyId Unique identifier
     * @param adapter Strategy adapter contract
     * @param cap Max allocation
     * @param cooldown Min seconds between rebalances
     */
    function addStrategy(
        bytes32 strategyId,
        address adapter,
        uint256 cap,
        uint256 cooldown
    ) external onlyOwner {
        if (strategies[strategyId].adapter != address(0)) revert StrategyExists();
        if (adapter == address(0)) revert InvalidAdapter();
        if (cap == 0) revert InvalidCap();

        strategies[strategyId] = Strategy({
            adapter: adapter,
            cap: cap,
            allocated: 0,
            lastRebalance: 0,
            cooldown: cooldown,
            active: true,
            emergencyExit: false
        });

        strategyIds.push(strategyId);
        emit StrategyAdded(strategyId, adapter, cap);
    }

    /**
     * @notice Update strategy parameters
     */
    function updateStrategy(bytes32 strategyId, uint256 newCap, bool active) external onlyOwner {
        Strategy storage s = strategies[strategyId];
        if (s.adapter == address(0)) revert InvalidAdapter();

        s.cap = newCap;
        s.active = active;
        emit StrategyUpdated(strategyId, newCap, active);
    }

    /**
     * @notice Allocate funds to strategy
     * @param strategyId Target strategy
     * @param amount Amount to allocate
     */
    function allocate(bytes32 strategyId, uint256 amount) external onlyVault nonReentrant {
        Strategy storage s = strategies[strategyId];

        if (!s.active) revert StrategyNotActive();
        if (s.emergencyExit) revert StrategyNotActive();
        if (block.timestamp < s.lastRebalance + s.cooldown) revert CooldownNotMet();
        if (s.allocated + amount > s.cap) revert CapExceeded();

        s.allocated += amount;
        s.lastRebalance = block.timestamp;

        // Transfer assets to adapter
        asset.safeTransferFrom(vault, s.adapter, amount);

        // Call adapter's deposit function
        (bool success, ) = s.adapter.call(abi.encodeWithSignature("deposit(uint256)", amount));
        require(success, "Adapter deposit failed");

        emit Allocated(strategyId, amount);
    }

    /**
     * @notice Withdraw funds from strategy
     * @param strategyId Target strategy
     * @param amount Amount to withdraw
     */
    function withdraw(bytes32 strategyId, uint256 amount) external onlyVault nonReentrant {
        Strategy storage s = strategies[strategyId];
        if (s.adapter == address(0)) revert InvalidAdapter();

        // Call adapter's withdraw function
        (bool success, bytes memory returnData) = s.adapter.call(
            abi.encodeWithSignature("withdraw(uint256)", amount)
        );
        require(success, "Adapter withdraw failed");

        uint256 actualAmount = abi.decode(returnData, (uint256));

        // Check slippage
        if (actualAmount < (amount * (10_000 - slippageBps)) / 10_000) revert SlippageTooHigh();

        s.allocated = s.allocated > actualAmount ? s.allocated - actualAmount : 0;
        s.lastRebalance = block.timestamp;

        // Transfer back to vault
        asset.safeTransferFrom(s.adapter, vault, actualAmount);

        emit Withdrawn(strategyId, actualAmount);
    }

    /**
     * @notice Emergency withdraw all funds from strategy
     */
    function emergencyExit(bytes32 strategyId) external onlyOwner {
        Strategy storage s = strategies[strategyId];
        if (s.adapter == address(0)) revert InvalidAdapter();

        s.emergencyExit = true;
        s.active = false;

        // Withdraw all allocated funds
        if (s.allocated > 0) {
            (bool success, ) = s.adapter.call(abi.encodeWithSignature("emergencyWithdraw()"));
            require(success, "Emergency withdraw failed");

            uint256 balance = asset.balanceOf(s.adapter);
            asset.safeTransferFrom(s.adapter, vault, balance);

            s.allocated = 0;
        }

        emit EmergencyExit(strategyId);
    }

    /**
     * @notice Set global slippage tolerance
     */
    function setSlippageBps(uint16 newBps) external onlyOwner {
        if (newBps > MAX_SLIPPAGE_BPS) revert SlippageTooHigh();
        slippageBps = newBps;
        emit SlippageUpdated(newBps);
    }

    /**
     * @notice Get total allocated across all strategies
     */
    function totalAllocated() external view returns (uint256 total) {
        for (uint256 i = 0; i < strategyIds.length; i++) {
            total += strategies[strategyIds[i]].allocated;
        }
    }

    /**
     * @notice Get strategy count
     */
    function strategyCount() external view returns (uint256) {
        return strategyIds.length;
    }
}
