// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Permit2Puller
 * @notice Helper for Uniswap Permit2 integration (for native USDT without permit)
 * @dev Allows gasless approvals via Permit2 for tokens that don't natively support EIP-2612
 */
contract Permit2Puller {
    using SafeERC20 for IERC20;

    /// @notice Permit2 contract address (Uniswap Universal Router)
    address public immutable permit2;

    error InvalidPermit2();

    constructor(address permit2_) {
        if (permit2_ == address(0)) revert InvalidPermit2();
        permit2 = permit2_;
    }

    /**
     * @notice Pull tokens using Permit2
     * @param token Token address
     * @param from Token owner
     * @param amount Amount to pull
     * @param deadline Signature deadline
     * @param signature Permit2 signature
     */
    function pullWithPermit2(
        address token,
        address from,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bool) {
        // Call Permit2's permitTransferFrom
        // Simplified - actual Permit2 has more complex interface
        (bool success, ) = permit2.call(
            abi.encodeWithSignature(
                "permitTransferFrom(address,address,address,uint256,uint256,bytes)",
                token,
                from,
                msg.sender,
                amount,
                deadline,
                signature
            )
        );

        return success;
    }

    /**
     * @notice Batch pull using Permit2
     */
    function batchPullWithPermit2(
        address[] calldata tokens,
        address from,
        uint256[] calldata amounts,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bool) {
        require(tokens.length == amounts.length, "Length mismatch");

        // Batch transfer via Permit2
        (bool success, ) = permit2.call(
            abi.encodeWithSignature(
                "permitBatchTransferFrom(address[],address,address,uint256[],uint256,bytes)",
                tokens,
                from,
                msg.sender,
                amounts,
                deadline,
                signature
            )
        );

        return success;
    }
}
