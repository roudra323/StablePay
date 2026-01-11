// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeployStablecoinVault} from "../script/DeployStablecoinVault.s.sol";
import {DeployStablecoin} from "../script/mocks/DeployStablecoin.s.sol";
import {StabelCoinVault} from "../src/StableCoinVault.sol";

contract StablecoinVaultTest is Test {
    StabelCoinVault vault;
    address baseStablecoin;
    address public immutable VAULT_OWNER = makeAddr("vault_owner");

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
}
