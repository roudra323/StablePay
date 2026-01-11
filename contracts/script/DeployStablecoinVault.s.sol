// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script} from "forge-std/Script.sol";
import {StabelCoinVault} from "../src/StableCoinVault.sol";

contract DeployStablecoinVault is Script {
    function run() external returns (StabelCoinVault) {
        StabelCoinVault vault = deployVault(msg.sender);
        return vault;
    }

    function deployVault(
        address _initialOwner
    ) public returns (StabelCoinVault) {
        vm.startBroadcast();
        StabelCoinVault vault = new StabelCoinVault(_initialOwner);
        vm.stopBroadcast();
        return vault;
    }
}
