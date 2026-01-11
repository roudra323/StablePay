// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.20;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Stablecoin is ERC20 {
    uint8 public immutable STABLECOIN_DECIMALS;

    constructor(
        string memory name,
        string memory symbol,
        uint8 stablecoinDecimals
    ) ERC20(name, symbol) {
        STABLECOIN_DECIMALS = stablecoinDecimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount * 10 ** decimals());
    }

    function decimals() public view override returns (uint8) {
        return STABLECOIN_DECIMALS;
    }
}
