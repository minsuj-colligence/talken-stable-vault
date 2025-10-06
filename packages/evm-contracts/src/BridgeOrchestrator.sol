// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BridgeOrchestrator
 * @notice Orchestrates USDT (via usdt0.to) and USDC (via CCTP) cross-chain flows
 * @dev Simplified implementation - actual integration would use official bridge contracts
 */
contract BridgeOrchestrator is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum BridgeType {
        USDT0, // usdt0.to for USDT
        CCTP   // Circle's CCTP for USDC
    }

    struct BridgeConfig {
        address bridge; // Bridge contract address
        address token; // Token address
        BridgeType bridgeType;
        bool active;
    }

    /// @notice Supported bridges
    mapping(uint32 => BridgeConfig) public bridges; // chainId => config

    /// @notice Bridge transaction tracking
    mapping(bytes32 => bool) public processedTxs;

    event BridgeConfigured(uint32 indexed chainId, address bridge, address token, BridgeType bridgeType);
    event BridgeInitiated(bytes32 indexed txId, uint32 dstChainId, address token, uint256 amount, address recipient);
    event BridgeCompleted(bytes32 indexed txId);

    error InvalidBridge();
    error BridgeNotActive();
    error AlreadyProcessed();
    error InvalidAmount();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Configure bridge for a chain
     * @param chainId Destination chain ID
     * @param bridge Bridge contract address
     * @param token Token address
     * @param bridgeType Type of bridge (USDT0 or CCTP)
     */
    function configureBridge(
        uint32 chainId,
        address bridge,
        address token,
        BridgeType bridgeType
    ) external onlyOwner {
        if (bridge == address(0) || token == address(0)) revert InvalidBridge();

        bridges[chainId] = BridgeConfig({
            bridge: bridge,
            token: token,
            bridgeType: bridgeType,
            active: true
        });

        emit BridgeConfigured(chainId, bridge, token, bridgeType);
    }

    /**
     * @notice Initiate bridge transfer
     * @param dstChainId Destination chain ID
     * @param amount Amount to bridge
     * @param recipient Recipient on destination chain
     */
    function bridge(
        uint32 dstChainId,
        uint256 amount,
        address recipient
    ) external onlyOwner nonReentrant returns (bytes32 txId) {
        BridgeConfig memory config = bridges[dstChainId];
        if (!config.active) revert BridgeNotActive();
        if (amount == 0) revert InvalidAmount();

        // Generate unique transaction ID
        txId = keccak256(abi.encodePacked(block.chainid, dstChainId, amount, recipient, block.timestamp));

        if (processedTxs[txId]) revert AlreadyProcessed();
        processedTxs[txId] = true;

        // Transfer tokens to this contract
        IERC20(config.token).safeTransferFrom(msg.sender, address(this), amount);

        // Approve bridge contract
        IERC20(config.token).approve(config.bridge, amount);

        // Call appropriate bridge function based on type
        if (config.bridgeType == BridgeType.USDT0) {
            _bridgeViaUSDT0(config.bridge, dstChainId, amount, recipient);
        } else if (config.bridgeType == BridgeType.CCTP) {
            _bridgeViaCCTP(config.bridge, dstChainId, amount, recipient);
        }

        emit BridgeInitiated(txId, dstChainId, config.token, amount, recipient);
    }

    /**
     * @notice Bridge via USDT0 (usdt0.to)
     * @dev Simplified - actual implementation would call usdt0.to bridge
     */
    function _bridgeViaUSDT0(
        address bridge,
        uint32 dstChainId,
        uint256 amount,
        address recipient
    ) internal {
        // Call usdt0.to bridge (simplified)
        (bool success, ) = bridge.call(
            abi.encodeWithSignature(
                "bridgeUSDT(uint32,uint256,address)",
                dstChainId,
                amount,
                recipient
            )
        );
        require(success, "USDT0 bridge failed");
    }

    /**
     * @notice Bridge via CCTP (Circle Cross-Chain Transfer Protocol)
     * @dev Simplified - actual implementation would use Circle's TokenMessenger
     */
    function _bridgeViaCCTP(
        address bridge,
        uint32 dstChainId,
        uint256 amount,
        address recipient
    ) internal {
        // Call CCTP depositForBurn (simplified)
        (bool success, ) = bridge.call(
            abi.encodeWithSignature(
                "depositForBurn(uint256,uint32,bytes32,address)",
                amount,
                dstChainId,
                bytes32(uint256(uint160(recipient))),
                address(this)
            )
        );
        require(success, "CCTP bridge failed");
    }

    /**
     * @notice Receive bridged tokens (called by bridge on destination)
     * @param txId Original transaction ID
     */
    function completeBridge(bytes32 txId) external nonReentrant {
        // Verify caller is authorized bridge
        // In production, this would verify signatures or origin

        if (processedTxs[txId]) revert AlreadyProcessed();
        processedTxs[txId] = true;

        emit BridgeCompleted(txId);
    }

    /**
     * @notice Enable/disable bridge
     */
    function setBridgeActive(uint32 chainId, bool active) external onlyOwner {
        bridges[chainId].active = active;
    }

    /**
     * @notice Emergency withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
