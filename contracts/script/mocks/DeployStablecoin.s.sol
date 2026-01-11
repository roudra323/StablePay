// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script} from "forge-std/Script.sol";
import {Stablecoin} from "../../src/Mocks/Stablecoin.sol";

contract DeployStablecoin is Script {
    function run() external returns (address) {
        address stablecoin = deployCustomERC20("Stablecoin", "STBL", 18);
        return stablecoin;
    }

    function deployCustomERC20(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) public returns (address) {
        vm.startBroadcast();
        Stablecoin stablecoin = new Stablecoin(name, symbol, decimals);
        vm.stopBroadcast();
        return address(stablecoin);
    }
}
