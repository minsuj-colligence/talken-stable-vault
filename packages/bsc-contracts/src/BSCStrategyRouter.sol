// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BSCStrategyRouter
 * @notice Strategy router for BSC vault (PancakeSwap, Venus, etc.)
 * @dev Similar to EVM StrategyRouter but adapted for BSC protocols
 */
contract BSCStrategyRouter is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Strategy {
        address adapter;
        uint256 cap;
        uint256 allocated;
        uint256 lastRebalance;
        uint256 cooldown;
        bool active;
        bool emergencyExit;
    }

    IERC20 public immutable asset;
    address public vault;

    mapping(bytes32 => Strategy) public strategies;
    bytes32[] public strategyIds;

    uint16 public slippageBps = 50;
    uint16 public constant MAX_SLIPPAGE_BPS = 500;

    event StrategyAdded(bytes32 indexed strategyId, address adapter, uint256 cap);
    event StrategyUpdated(bytes32 indexed strategyId, uint256 newCap, bool active);
    event Allocated(bytes32 indexed strategyId, uint256 amount);
    event Withdrawn(bytes32 indexed strategyId, uint256 amount);
    event EmergencyExit(bytes32 indexed strategyId);

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

    function updateStrategy(bytes32 strategyId, uint256 newCap, bool active) external onlyOwner {
        Strategy storage s = strategies[strategyId];
        if (s.adapter == address(0)) revert InvalidAdapter();

        s.cap = newCap;
        s.active = active;
        emit StrategyUpdated(strategyId, newCap, active);
    }

    function allocate(bytes32 strategyId, uint256 amount) external onlyVault nonReentrant {
        Strategy storage s = strategies[strategyId];

        if (!s.active) revert StrategyNotActive();
        if (s.emergencyExit) revert StrategyNotActive();
        if (block.timestamp < s.lastRebalance + s.cooldown) revert CooldownNotMet();
        if (s.allocated + amount > s.cap) revert CapExceeded();

        s.allocated += amount;
        s.lastRebalance = block.timestamp;

        asset.safeTransferFrom(vault, s.adapter, amount);

        (bool success, ) = s.adapter.call(abi.encodeWithSignature("deposit(uint256)", amount));
        require(success, "Adapter deposit failed");

        emit Allocated(strategyId, amount);
    }

    function withdraw(bytes32 strategyId, uint256 amount) external onlyVault nonReentrant {
        Strategy storage s = strategies[strategyId];
        if (s.adapter == address(0)) revert InvalidAdapter();

        (bool success, bytes memory returnData) = s.adapter.call(
            abi.encodeWithSignature("withdraw(uint256)", amount)
        );
        require(success, "Adapter withdraw failed");

        uint256 actualAmount = abi.decode(returnData, (uint256));

        if (actualAmount < (amount * (10_000 - slippageBps)) / 10_000) revert SlippageTooHigh();

        s.allocated = s.allocated > actualAmount ? s.allocated - actualAmount : 0;
        s.lastRebalance = block.timestamp;

        asset.safeTransferFrom(s.adapter, vault, actualAmount);

        emit Withdrawn(strategyId, actualAmount);
    }

    function emergencyExit(bytes32 strategyId) external onlyOwner {
        Strategy storage s = strategies[strategyId];
        if (s.adapter == address(0)) revert InvalidAdapter();

        s.emergencyExit = true;
        s.active = false;

        if (s.allocated > 0) {
            (bool success, ) = s.adapter.call(abi.encodeWithSignature("emergencyWithdraw()"));
            require(success, "Emergency withdraw failed");

            uint256 balance = asset.balanceOf(s.adapter);
            asset.safeTransferFrom(s.adapter, vault, balance);

            s.allocated = 0;
        }

        emit EmergencyExit(strategyId);
    }

    function totalAllocated() external view returns (uint256 total) {
        for (uint256 i = 0; i < strategyIds.length; i++) {
            total += strategies[strategyIds[i]].allocated;
        }
    }
}
