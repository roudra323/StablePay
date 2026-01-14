// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {DeployStablecoinVault} from "../script/DeployStablecoinVault.s.sol";
import {DeployStablecoin} from "../script/mocks/DeployStablecoin.s.sol";
import {StabelCoinVault} from "../src/StableCoinVault.sol";
import {Stablecoin} from "../src/Mocks/Stablecoin.sol";

contract StablecoinVaultTest is Test {
    StabelCoinVault vault;
    address baseStablecoin;
    address public immutable VAULT_OWNER = makeAddr("vault_owner");
    address public immutable USER = makeAddr("user");

    error OwnableUnauthorizedAccount(address account);

    function setUp() public {
        vault = new DeployStablecoinVault().deployVault(VAULT_OWNER);
        baseStablecoin = new DeployStablecoin().run();
    }

    function testAddressesAreNotEmpty() public view {
        assert(address(vault) != address(0));
        assert(address(baseStablecoin) != address(0));
    }

    function testAddSingleStablecoin() public {
        vm.prank(VAULT_OWNER);
        vault.allowStablecoin(baseStablecoin);
        bool isAllowed = vault.allowedStablecoins(baseStablecoin);
        assert(isAllowed == true);
    }

    function testAddMultipleStablecoins(uint8 _i) public {
        if (_i <= 18) {
            vm.prank(VAULT_OWNER);
            vault.allowStablecoin(address(uint160(_i + 1)));
            bool isAllowed = vault.allowedStablecoins(address(uint160(_i + 1)));
            assert(isAllowed == true);
        }
    }

    function testRevertWhenAddressIsNotValid() public {
        vm.expectRevert("InvalidAddress()");
        vm.prank(VAULT_OWNER);
        vault.allowStablecoin(address(0));
    }

    function testRevertWhenOthersCall() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUnauthorizedAccount.selector,
                address(this)
            )
        );
        vault.allowStablecoin(address(uint160(1)));
    }

    function depositHelper(
        address _token,
        uint256 _amount,
        address _user
    ) internal {
        vm.prank(VAULT_OWNER);
        vault.allowStablecoin(_token);
        vm.prank(_user);
        Stablecoin(_token).approve(address(vault), _amount);
        Stablecoin(_token).mint(_user, _amount);
    }

    function testRevertWhenAmountIsZero() public {
        vm.expectRevert("InvalidAmount()");
        vault.deposit(baseStablecoin, 0, bytes32(0));
    }

    function testRevertWhenTokenIsNotAllowed() public {
        vm.expectRevert("TokenNotAllowed()");
        vault.deposit(address(uint160(1)), 1, bytes32(0));
    }

    function testDeposit() public {
        bytes32 referenceId = bytes32("test_reference_id");
        depositHelper(baseStablecoin, 100, USER);
        vm.prank(USER);
        vault.deposit(baseStablecoin, 100, referenceId);
    }

    function testRevertWhenReferenceIdIsAlreadyUsed() public {
        bytes32 referenceId = bytes32("test_reference_id");
        depositHelper(baseStablecoin, 100, USER);
        vm.prank(USER);
        vault.deposit(baseStablecoin, 50, referenceId);

        // second deposit with the same reference id should revert
        vm.expectRevert("DuplicateReferenceId()");
        vm.prank(USER);
        vault.deposit(baseStablecoin, 50, referenceId);
    }
}
