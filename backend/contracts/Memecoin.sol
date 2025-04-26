// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Use a consistent and recent pragma

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Optional: if you want ownership features on the token itself

// Simple ERC20 Memecoin
contract Memecoin is ERC20 {
    // We mint the initial supply to the address provided in the constructor
    // This will be the Launchpad contract, which will then hold the tokens
    // intended for liquidity. The rest could be transferred to the creator
    // by the Launchpad if needed, or managed via other functions.
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
        // address initialOwner // We will mint directly to the caller (Launchpad)
    ) ERC20(name, symbol) {
        // Mint the total supply to the contract deploying this token (the Launchpad)
        // The Launchpad will be responsible for managing this supply initially.
        _mint(msg.sender, initialSupply);
    }

    // Optional: Add decimals if desired (default is 18 for ERC20)
    // function decimals() public view virtual override returns (uint8) {
    //     return 18;
    // }
}
