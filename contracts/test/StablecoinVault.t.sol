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

    event Deposited(
        address indexed tokenAddress,
        address indexed user,
        uint256 amount,
        bytes32 indexed refId
    );

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

    function testDepositEmitsEventWithCorrectAmount() public {
        bytes32 referenceId = bytes32("event_test_ref");
        uint256 depositAmount = 500;
        depositHelper(baseStablecoin, depositAmount, USER);

        vm.expectEmit(true, true, true, true);
        emit Deposited(baseStablecoin, USER, depositAmount, referenceId);

        vm.prank(USER);
        vault.deposit(baseStablecoin, depositAmount, referenceId);
    }

    function testDepositEmitsEventWithCorrectTokenAddress() public {
        bytes32 referenceId = bytes32("token_event_ref");
        uint256 depositAmount = 250;
        depositHelper(baseStablecoin, depositAmount, USER);

        vm.expectEmit(true, false, false, false);
        emit Deposited(baseStablecoin, address(0), 0, bytes32(0));

        vm.prank(USER);
        vault.deposit(baseStablecoin, depositAmount, referenceId);
    }

    function testDepositEmitsEventWithCorrectUser() public {
        bytes32 referenceId = bytes32("user_event_ref");
        uint256 depositAmount = 300;
        depositHelper(baseStablecoin, depositAmount, USER);

        vm.expectEmit(false, true, false, false);
        emit Deposited(address(0), USER, 0, bytes32(0));

        vm.prank(USER);
        vault.deposit(baseStablecoin, depositAmount, referenceId);
    }

    function testDepositEmitsEventWithCorrectReferenceId() public {
        bytes32 referenceId = bytes32("ref_id_event_test");
        uint256 depositAmount = 100;
        depositHelper(baseStablecoin, depositAmount, USER);

        vm.expectEmit(false, false, true, false);
        emit Deposited(address(0), address(0), 0, referenceId);

        vm.prank(USER);
        vault.deposit(baseStablecoin, depositAmount, referenceId);
    }

    function testDepositEmitsEventWithVariousAmounts(uint256 _amount) public {
        vm.assume(_amount > 0 && _amount < type(uint128).max);
        bytes32 referenceId = keccak256(abi.encodePacked(_amount));
        depositHelper(baseStablecoin, _amount, USER);

        vm.expectEmit(true, true, true, true);
        emit Deposited(baseStablecoin, USER, _amount, referenceId);

        vm.prank(USER);
        vault.deposit(baseStablecoin, _amount, referenceId);
    }
}
