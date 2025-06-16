// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() ERC20("Test Paired Token", "TPT") {
        // Mint 1 million tokens to deployer for testing
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    // Allow anyone to mint more for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 