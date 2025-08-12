// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Memecoin.sol";
import "./BondingCurve.sol";

contract Launchpad is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct PriceStep {
        uint256 tokenSupplyThreshold;
        uint256 pricePerToken;
    }

    event TokenLaunched(
        address indexed creator,
        address indexed tokenAddress,
        uint256 initialSupply,
        address pairedToken,
        uint256 bondingCurveSupply,
        uint256 creatorSupply
    );

    event BondingCurveInitialized(
        address indexed tokenAddress,
        address indexed bondingCurve,
        uint256 stepCount
    );

    event TokenWithdrawn(address indexed token, uint256 amount, address indexed to);

    address public immutable bondingCurve;

    constructor(address _bondingCurve) Ownable(msg.sender) {
        require(_bondingCurve != address(0), "BondingCurve address cannot be zero");
        bondingCurve = _bondingCurve;
    }

    function launchToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address pairedTokenAddress,
        uint256 bondingCurveSupply,
        PriceStep[] memory priceSteps
    ) external nonReentrant {
        require(bytes(name).length > 0, "Token name cannot be empty");
        require(bytes(symbol).length > 0, "Token symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be greater than 0");
        require(pairedTokenAddress != address(0), "Paired token address cannot be zero");
        require(bondingCurveSupply > 0, "Bonding curve supply must be greater than 0");
        require(bondingCurveSupply <= initialSupply, "Bonding curve supply cannot exceed initial supply");
        require(priceSteps.length > 0, "Must provide at least one price step");

        // Validate price steps
        uint256 lastThreshold = 0;
        for (uint256 i = 0; i < priceSteps.length; i++) {
            require(priceSteps[i].tokenSupplyThreshold > lastThreshold, "Price step thresholds must be ascending");
            require(priceSteps[i].tokenSupplyThreshold <= bondingCurveSupply, "Price step threshold exceeds bonding curve supply");
            require(priceSteps[i].pricePerToken > 0, "Price must be greater than 0");
            lastThreshold = priceSteps[i].tokenSupplyThreshold;
        }

        // Deploy the new memecoin
        Memecoin newMemecoin = new Memecoin(name, symbol, initialSupply);
        address newMemecoinAddress = address(newMemecoin);

        // Prevent pairing the token with itself
        require(pairedTokenAddress != newMemecoinAddress, "Paired token cannot be the same as memecoin");

        // Calculate creator's portion
        uint256 creatorSupply = initialSupply - bondingCurveSupply;

        // Transfer bonding curve supply to bonding curve contract
        IERC20(newMemecoinAddress).safeTransfer(bondingCurve, bondingCurveSupply);

        // Transfer creator's portion to creator
        if (creatorSupply > 0) {
            IERC20(newMemecoinAddress).safeTransfer(msg.sender, creatorSupply);
        }

        emit TokenLaunched(
            msg.sender,
            newMemecoinAddress,
            initialSupply,
            pairedTokenAddress,
            bondingCurveSupply,
            creatorSupply
        );

        // Convert memory array to calldata-compatible format for bonding curve
        BondingCurve.PriceStep[] memory bondingCurveSteps = new BondingCurve.PriceStep[](priceSteps.length);
        for (uint256 i = 0; i < priceSteps.length; i++) {
            bondingCurveSteps[i] = BondingCurve.PriceStep({
                tokenSupplyThreshold: priceSteps[i].tokenSupplyThreshold,
                pricePerToken: priceSteps[i].pricePerToken
            });
        }

        // Initialize bonding curve for the token
        BondingCurve(bondingCurve).initializeToken(
            newMemecoinAddress,
            pairedTokenAddress,
            bondingCurveSupply,
            bondingCurveSteps
        );

        emit BondingCurveInitialized(
            newMemecoinAddress,
            bondingCurve,
            priceSteps.length
        );
    }

    // Helper function to get current token price from bonding curve
    function getCurrentPrice(address tokenAddress) external view returns (uint256) {
        return BondingCurve(bondingCurve).getCurrentPrice(tokenAddress);
    }

    // Helper function to calculate buy price
    function calculateBuyPrice(address tokenAddress, uint256 amount) 
        external 
        view 
        returns (uint256 totalCost, uint256 protocolFee) 
    {
        return BondingCurve(bondingCurve).calculateBuyPrice(tokenAddress, amount);
    }

    // Helper function to calculate sell price
    function calculateSellPrice(address tokenAddress, uint256 amount) 
        external 
        view 
        returns (uint256 totalReceived, uint256 protocolFee) 
    {
        return BondingCurve(bondingCurve).calculateSellPrice(tokenAddress, amount);
    }

    // Helper function to get token information
    function getTokenInfo(address tokenAddress) 
        external 
        view 
        returns (
            address pairedToken,
            uint256 totalSupply,
            uint256 circulatingSupply,
            uint256 reserveBalance,
            uint256 currentPrice
        ) 
    {
        return BondingCurve(bondingCurve).getTokenInfo(tokenAddress);
    }

    function withdrawToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        IERC20 tokenContract = IERC20(tokenAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(balance >= amount, "Insufficient balance");
        uint256 actualAmount = (amount == 0) ? balance : amount;
        tokenContract.safeTransfer(msg.sender, actualAmount);
        emit TokenWithdrawn(tokenAddress, actualAmount, msg.sender);
    }
}