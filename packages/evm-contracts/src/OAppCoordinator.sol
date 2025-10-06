// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OAppCoordinator
 * @notice LayerZero OApp for cross-chain coordination
 * @dev 2-phase messaging: PREPARE -> COMMIT/ABORT with idempotent msgId
 */
contract OAppCoordinator is Ownable2Step, ReentrancyGuard {
    enum MessageState {
        None,
        Prepared,
        Committed,
        Aborted
    }

    enum MessageType {
        PREPARE,
        COMMIT,
        ABORT
    }

    struct Message {
        MessageType msgType;
        uint32 srcEid; // Source endpoint ID
        bytes32 sender; // Source address (bytes32 for compatibility)
        uint64 nonce;
        bytes payload;
        MessageState state;
        uint256 timestamp;
    }

    /// @notice LayerZero endpoint
    address public immutable lzEndpoint;

    /// @notice Peer allowlist: chainId => allowed address
    mapping(uint32 => bytes32) public peers;

    /// @notice Message tracking: msgId => Message
    mapping(bytes32 => Message) public messages;

    /// @notice Nonce per source chain
    mapping(uint32 => uint64) public nonces;

    /// @notice Execution timeout (default 1 hour)
    uint256 public executionTimeout = 1 hours;

    event PeerSet(uint32 indexed eid, bytes32 peer);
    event MessagePrepared(bytes32 indexed msgId, uint32 srcEid, bytes32 sender, uint64 nonce);
    event MessageCommitted(bytes32 indexed msgId);
    event MessageAborted(bytes32 indexed msgId);
    event MessageSent(uint32 indexed dstEid, bytes32 indexed msgId, MessageType msgType);

    error InvalidEndpoint();
    error InvalidPeer();
    error InvalidMessageState();
    error MessageExpired();
    error UnauthorizedPeer();
    error InvalidNonce();

    constructor(address lzEndpoint_) Ownable(msg.sender) {
        if (lzEndpoint_ == address(0)) revert InvalidEndpoint();
        lzEndpoint = lzEndpoint_;
    }

    /**
     * @notice Set peer for a chain
     * @param eid Endpoint ID (LayerZero chain ID)
     * @param peer Peer address as bytes32
     */
    function setPeer(uint32 eid, bytes32 peer) external onlyOwner {
        if (peer == bytes32(0)) revert InvalidPeer();
        peers[eid] = peer;
        emit PeerSet(eid, peer);
    }

    /**
     * @notice Send cross-chain message via LayerZero
     * @param dstEid Destination endpoint ID
     * @param msgType Message type (PREPARE/COMMIT/ABORT)
     * @param payload Message payload
     * @param options LayerZero options
     * @param refundAddress Address for gas refund
     */
    function send(
        uint32 dstEid,
        MessageType msgType,
        bytes calldata payload,
        bytes calldata options,
        address refundAddress
    ) external payable onlyOwner nonReentrant returns (bytes32 msgId) {
        if (peers[dstEid] == bytes32(0)) revert InvalidPeer();

        uint64 nonce = ++nonces[dstEid];
        msgId = keccak256(abi.encodePacked(block.chainid, dstEid, nonce));

        bytes memory message = abi.encode(msgType, msgId, nonce, payload);

        // Call LayerZero endpoint (simplified - actual implementation would use ILayerZeroEndpoint)
        (bool success, ) = lzEndpoint.call{value: msg.value}(
            abi.encodeWithSignature(
                "send(uint32,bytes32,bytes,address,bytes)",
                dstEid,
                peers[dstEid],
                message,
                refundAddress,
                options
            )
        );
        require(success, "LZ send failed");

        emit MessageSent(dstEid, msgId, msgType);
    }

    /**
     * @notice Receive message from LayerZero (called by endpoint)
     * @param srcEid Source endpoint ID
     * @param sender Source address
     * @param nonce Message nonce
     * @param message Encoded message
     */
    function lzReceive(
        uint32 srcEid,
        bytes32 sender,
        uint64 nonce,
        bytes calldata message
    ) external nonReentrant {
        // Only LayerZero endpoint can call
        require(msg.sender == lzEndpoint, "Unauthorized");

        // Verify peer
        if (peers[srcEid] != sender) revert UnauthorizedPeer();

        // Decode message
        (MessageType msgType, bytes32 msgId, uint64 msgNonce, bytes memory payload) = abi.decode(
            message,
            (MessageType, bytes32, uint64, bytes)
        );

        // Verify nonce
        if (msgNonce <= nonces[srcEid]) revert InvalidNonce();
        nonces[srcEid] = msgNonce;

        // Process based on type
        if (msgType == MessageType.PREPARE) {
            _handlePrepare(msgId, srcEid, sender, msgNonce, payload);
        } else if (msgType == MessageType.COMMIT) {
            _handleCommit(msgId);
        } else if (msgType == MessageType.ABORT) {
            _handleAbort(msgId);
        }
    }

    /**
     * @notice Handle PREPARE message
     */
    function _handlePrepare(
        bytes32 msgId,
        uint32 srcEid,
        bytes32 sender,
        uint64 nonce,
        bytes memory payload
    ) internal {
        Message storage msg_ = messages[msgId];

        // Idempotent: if already prepared, skip
        if (msg_.state == MessageState.Prepared) return;
        if (msg_.state != MessageState.None) revert InvalidMessageState();

        msg_.msgType = MessageType.PREPARE;
        msg_.srcEid = srcEid;
        msg_.sender = sender;
        msg_.nonce = nonce;
        msg_.payload = payload;
        msg_.state = MessageState.Prepared;
        msg_.timestamp = block.timestamp;

        emit MessagePrepared(msgId, srcEid, sender, nonce);
    }

    /**
     * @notice Handle COMMIT message
     */
    function _handleCommit(bytes32 msgId) internal {
        Message storage msg_ = messages[msgId];

        if (msg_.state != MessageState.Prepared) revert InvalidMessageState();
        if (block.timestamp > msg_.timestamp + executionTimeout) revert MessageExpired();

        msg_.state = MessageState.Committed;

        // Execute payload (simplified - actual implementation would decode and execute)
        // (bool success, ) = address(this).call(msg_.payload);
        // require(success, "Execution failed");

        emit MessageCommitted(msgId);
    }

    /**
     * @notice Handle ABORT message
     */
    function _handleAbort(bytes32 msgId) internal {
        Message storage msg_ = messages[msgId];

        if (msg_.state != MessageState.Prepared) revert InvalidMessageState();

        msg_.state = MessageState.Aborted;

        emit MessageAborted(msgId);
    }

    /**
     * @notice Set execution timeout
     */
    function setExecutionTimeout(uint256 newTimeout) external onlyOwner {
        executionTimeout = newTimeout;
    }

    /**
     * @notice Get message state
     */
    function getMessageState(bytes32 msgId) external view returns (MessageState) {
        return messages[msgId].state;
    }
}
