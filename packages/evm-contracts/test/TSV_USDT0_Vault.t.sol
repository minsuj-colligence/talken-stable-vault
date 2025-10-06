// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TSV_USDT0_Vault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TSV_USDT0_VaultTest is Test {
    TSV_USDT0_Vault public vault;
    MockUSDT public usdt;

    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        usdt = new MockUSDT();
        vault = new TSV_USDT0_Vault(IERC20(address(usdt)), "TSV USDT0", "tsvUSDT0", 10);

        // Mint tokens to users
        usdt.mint(alice, 10000 * 10 ** 6);
        usdt.mint(bob, 10000 * 10 ** 6);
    }

    function testDeposit() public {
        vm.startPrank(alice);

        uint256 depositAmount = 1000 * 10 ** 6;
        usdt.approve(address(vault), depositAmount);

        uint256 shares = vault.deposit(depositAmount, alice);

        assertGt(shares, 0, "Shares should be minted");
        assertEq(vault.totalAssets(), depositAmount, "Total assets should match");
        assertEq(vault.balanceOf(alice), shares, "Alice should have shares");

        vm.stopPrank();
    }

    function testRedeem() public {
        vm.startPrank(alice);

        // Deposit first
        uint256 depositAmount = 1000 * 10 ** 6;
        usdt.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, alice);

        // Redeem
        uint256 assets = vault.redeem(shares, alice, alice);

        // Should get back less than deposited due to 0.1% fee
        uint256 expectedAssets = depositAmount - (depositAmount * 10 / 10000);
        assertEq(assets, expectedAssets, "Should receive assets minus fee");

        vm.stopPrank();
    }

    function testFeeBps() public {
        assertEq(vault.feeBps(), 10, "Fee should be 10 bps");

        vault.setFeeBps(20);
        assertEq(vault.feeBps(), 20, "Fee should be updated");

        vm.expectRevert();
        vault.setFeeBps(101); // Should revert (max 100 bps)
    }

    function testPreviewRedeem() public {
        vm.startPrank(alice);

        uint256 depositAmount = 1000 * 10 ** 6;
        usdt.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, alice);

        uint256 previewAssets = vault.previewRedeem(shares);
        uint256 expectedAssets = depositAmount - (depositAmount * 10 / 10000);

        assertEq(previewAssets, expectedAssets, "Preview should match expected");

        vm.stopPrank();
    }

    function testFuzzDeposit(uint256 amount) public {
        amount = bound(amount, 1, 1000000 * 10 ** 6);

        vm.startPrank(alice);

        usdt.approve(address(vault), amount);
        uint256 shares = vault.deposit(amount, alice);

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.totalAssets(), amount, "Total assets should match");

        vm.stopPrank();
    }
}
