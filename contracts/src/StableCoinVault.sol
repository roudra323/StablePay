// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract StabelCoinVault is Ownable {
    mapping(address => bool) public allowedStablecoins;
    mapping(bytes32 => bool) public usedReferenceIds;

    event Deposited(
        address indexed tokenAddress,
        address indexed user,
        uint256 amount,
        bytes32 indexed refId
    );

    event AllowedStablecoin(
        address indexed tokenAddress,
        uint256 timestamp,
        address owner
    );

    error InvalidAmount();
    error TokenNotAllowed();
    error TransferError();
    error InvalidAddress();
    error DuplicateReferenceId();

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function allowStablecoin(address _stableAddr) external onlyOwner {
        if (_stableAddr == address(0)) {
            revert InvalidAddress();
        }
        allowedStablecoins[_stableAddr] = true;
        emit AllowedStablecoin(_stableAddr, block.timestamp, msg.sender);
    }

    function deposit(
        address _tokenAddr,
        uint256 _value,
        bytes32 _referenceId
    ) external {
        if (_value == 0) {
            revert InvalidAmount();
        }
        if (!allowedStablecoins[_tokenAddr]) {
            revert TokenNotAllowed();
        }
        if (usedReferenceIds[_referenceId]) {
            revert DuplicateReferenceId();
        }

        usedReferenceIds[_referenceId] = true;

        bool ok = IERC20(_tokenAddr).transferFrom(
            msg.sender,
            address(this),
            _value
        );

        if (!ok) {
            revert TransferError();
        }

        emit Deposited(_tokenAddr, msg.sender, _value, _referenceId);
    }
}
