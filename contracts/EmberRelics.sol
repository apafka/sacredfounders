// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Ember Sanctuary Relics
/// @notice ERC-1155-shaped 10 item types. Minter (game server / paymaster) seals relics to player wallets.
contract EmberRelics {
    address public minter;
    string public name = "Ember Sanctuary Relics";
    string public symbol = "EMBER";

    mapping(uint256 => mapping(address => uint256)) public balanceOf;

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );

    constructor(address _minter) {
        minter = _minter;
    }

    function mint(address to, uint256 itemType, uint256 amount) external {
        require(msg.sender == minter, "not minter");
        require(itemType >= 1 && itemType <= 10, "item");
        require(amount > 0, "amount");
        balanceOf[itemType][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, itemType, amount);
    }
}
