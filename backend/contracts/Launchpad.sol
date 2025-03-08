// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Example Memecoin contract (simplified for demonstration)
contract Memecoin {
    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor(string memory _name, string memory _symbol, uint256 _totalSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }
}

contract Launchpad is Ownable {
    using SafeERC20 for IERC20;

    // Reentrancy flag for manual protection
    bool private isExecuting;

    // Modifier for manual reentrancy protection
    modifier nonReentrantManual() {
        require(!isExecuting, "Launchpad: reentrant call");
        isExecuting = true;
        _;
        isExecuting = false;
    }

    // Event emitted when a new token is launched
    event TokenLaunched(address indexed creator, address tokenAddress);

    // Constructor initializing Ownable with the deployer's address
    constructor() Ownable(msg.sender) {}

    // Function to launch a new memecoin
    function launchToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address pairedToken,
        uint256 liquidityMemecoinAmount,
        uint256 liquidityPairedTokenAmount
    ) external nonReentrantManual {
        // Checks: Validate inputs
        require(bytes(name).length > 0, "Token name cannot be empty");
        require(bytes(symbol).length > 0, "Token symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be greater than 0");
        require(pairedToken != address(0), "Paired token address cannot be zero");
        require(liquidityMemecoinAmount > 0, "Liquidity memecoin amount must be greater than 0");
        require(liquidityPairedTokenAmount > 0, "Liquidity paired token amount must be greater than 0");
        require(initialSupply >= liquidityMemecoinAmount, "Initial supply must cover liquidity");

        IERC20 pairedTokenContract = IERC20(pairedToken);
        require(
            pairedTokenContract.balanceOf(msg.sender) >= liquidityPairedTokenAmount,
            "Insufficient paired token balance"
        );

        // Effects: Update state (deploy token and emit event)
        Memecoin token = new Memecoin(name, symbol, initialSupply);
        emit TokenLaunched(msg.sender, address(token));

        // Interactions: External calls (token transfers)
        pairedTokenContract.safeTransferFrom(msg.sender, address(this), liquidityPairedTokenAmount);

        // Simplified interaction: Transfer tokens back to the user
        // In a real implementation, replace this with DEX liquidity provision
        pairedTokenContract.safeTransfer(msg.sender, liquidityPairedTokenAmount);
    }

    // Function to withdraw stuck tokens (restricted to owner)
    function withdrawToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        IERC20 tokenContract = IERC20(tokenAddress);
        require(tokenContract.balanceOf(address(this)) >= amount, "Insufficient balance");
        tokenContract.safeTransfer(msg.sender, amount);
    }
}