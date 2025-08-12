// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BondingCurve is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct PriceStep {
        uint256 tokenSupplyThreshold;  // Total supply threshold for this step
        uint256 pricePerToken;         // Price in paired token per memecoin
    }

    struct TokenInfo {
        address memecoin;
        address pairedToken;
        uint256 totalSupply;
        uint256 circulatingSupply;    // Tokens sold through bonding curve
        uint256 reserveBalance;       // Paired token reserves
        PriceStep[] priceSteps;
        uint8 memecoinDecimals;       // Decimals of the memecoin used for math scaling
        bool initialized;
    }

    mapping(address => TokenInfo) public tokenInfos;
    mapping(address => bool) public authorizedInitializers;
    
    // Protocol fee in basis points (100 = 1%)
    uint256 public protocolFeeBps = 200;  // 2%
    address public feeRecipient;

    event InitializerUpdated(address indexed initializer, bool allowed);

    event TokenBuy(
        address indexed buyer,
        address indexed memecoin,
        uint256 memecoinAmount,
        uint256 pairedTokenAmount,
        uint256 newPrice
    );

    event TokenSell(
        address indexed seller,
        address indexed memecoin,
        uint256 memecoinAmount,
        uint256 pairedTokenAmount,
        uint256 newPrice
    );

    event PriceStepAdded(
        address indexed memecoin,
        uint256 threshold,
        uint256 price
    );

    event TokenInitialized(
        address indexed memecoin,
        address indexed pairedToken,
        uint256 totalSupply
    );

    event ProtocolFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed to);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    modifier onlyOwnerOrInitializer() {
        require(owner() == msg.sender || authorizedInitializers[msg.sender], "Not authorized");
        _;
    }

    function initializeToken(
        address memecoin,
        address pairedToken,
        uint256 totalSupply,
        PriceStep[] calldata initialPriceSteps
    ) external onlyOwnerOrInitializer {
        require(memecoin != address(0) && pairedToken != address(0), "Invalid token addresses");
        require(memecoin != pairedToken, "Memecoin and paired token must differ");
        require(totalSupply > 0, "Total supply must be positive");
        require(initialPriceSteps.length > 0, "Must have at least one price step");
        require(!tokenInfos[memecoin].initialized, "Token already initialized");

        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        tokenInfo.memecoin = memecoin;
        tokenInfo.pairedToken = pairedToken;
        tokenInfo.totalSupply = totalSupply;
        tokenInfo.circulatingSupply = 0;
        tokenInfo.reserveBalance = 0;
        tokenInfo.memecoinDecimals = IERC20Metadata(memecoin).decimals();
        tokenInfo.initialized = true;

        // Validate and add price steps
        uint256 lastThreshold = 0;
        for (uint256 i = 0; i < initialPriceSteps.length; i++) {
            PriceStep memory step = initialPriceSteps[i];
            require(step.tokenSupplyThreshold > lastThreshold, "Thresholds must be ascending");
            require(step.tokenSupplyThreshold <= totalSupply, "Threshold exceeds total supply");
            require(step.pricePerToken > 0, "Price must be positive");

            tokenInfo.priceSteps.push(step);
            lastThreshold = step.tokenSupplyThreshold;

            emit PriceStepAdded(memecoin, step.tokenSupplyThreshold, step.pricePerToken);
        }

        emit TokenInitialized(memecoin, pairedToken, totalSupply);
    }

    function getCurrentPrice(address memecoin) public view returns (uint256) {
        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        require(tokenInfo.initialized, "Token not initialized");

        uint256 currentSupply = tokenInfo.circulatingSupply;
        
        // Find the appropriate price step
        for (uint256 i = 0; i < tokenInfo.priceSteps.length; i++) {
            if (currentSupply < tokenInfo.priceSteps[i].tokenSupplyThreshold) {
                return tokenInfo.priceSteps[i].pricePerToken;
            }
        }

        // If current supply exceeds all thresholds, use the last price
        if (tokenInfo.priceSteps.length > 0) {
            return tokenInfo.priceSteps[tokenInfo.priceSteps.length - 1].pricePerToken;
        }

        revert("No price steps configured");
    }

    function calculateBuyPrice(address memecoin, uint256 memecoinAmount) 
        public 
        view 
        returns (uint256 totalCost, uint256 protocolFee) 
    {
        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        require(tokenInfo.initialized, "Token not initialized");
        require(memecoinAmount > 0, "Amount must be positive");

        uint256 currentSupply = tokenInfo.circulatingSupply;
        uint256 remainingAmount = memecoinAmount;
        uint256 cost = 0;
        uint256 scale = 10 ** uint256(tokenInfo.memecoinDecimals);

        // Calculate cost across potentially multiple price steps
        for (uint256 i = 0; i < tokenInfo.priceSteps.length && remainingAmount > 0; i++) {
            PriceStep memory step = tokenInfo.priceSteps[i];
            
            if (currentSupply >= step.tokenSupplyThreshold) {
                continue; // Already past this threshold
            }

            uint256 availableInStep = step.tokenSupplyThreshold - currentSupply;
            uint256 amountInStep = remainingAmount > availableInStep ? availableInStep : remainingAmount;

            cost += amountInStep * step.pricePerToken / scale;
            currentSupply += amountInStep;
            remainingAmount -= amountInStep;
        }

        require(remainingAmount == 0, "Insufficient tokens available");

        protocolFee = cost * protocolFeeBps / 10000;
        totalCost = cost + protocolFee;
    }

    function calculateSellPrice(address memecoin, uint256 memecoinAmount) 
        public 
        view 
        returns (uint256 totalReceived, uint256 protocolFee) 
    {
        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        require(tokenInfo.initialized, "Token not initialized");
        require(memecoinAmount > 0, "Amount must be positive");
        require(memecoinAmount <= tokenInfo.circulatingSupply, "Insufficient circulating supply");

        uint256 currentSupply = tokenInfo.circulatingSupply;
        uint256 remainingAmount = memecoinAmount;
        uint256 revenue = 0;
        uint256 scale = 10 ** uint256(tokenInfo.memecoinDecimals);

        // Calculate revenue across potentially multiple price steps (in reverse)
        for (int256 i = int256(tokenInfo.priceSteps.length) - 1; i >= 0 && remainingAmount > 0; i--) {
            PriceStep memory step = tokenInfo.priceSteps[uint256(i)];
            
            if (currentSupply <= (i > 0 ? tokenInfo.priceSteps[uint256(i-1)].tokenSupplyThreshold : 0)) {
                continue; // Not in this price range
            }

            uint256 lowerBound = i > 0 ? tokenInfo.priceSteps[uint256(i-1)].tokenSupplyThreshold : 0;
            uint256 availableInStep = currentSupply - lowerBound;
            uint256 amountInStep = remainingAmount > availableInStep ? availableInStep : remainingAmount;

            revenue += amountInStep * step.pricePerToken / scale;
            currentSupply -= amountInStep;
            remainingAmount -= amountInStep;
        }

        protocolFee = revenue * protocolFeeBps / 10000;
        totalReceived = revenue - protocolFee;
    }

    function buyTokens(address memecoin, uint256 memecoinAmount) external nonReentrant {
        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        require(tokenInfo.initialized, "Token not initialized");
        require(memecoinAmount > 0, "Amount must be positive");

        (uint256 totalCost, uint256 protocolFee) = calculateBuyPrice(memecoin, memecoinAmount);

        IERC20 pairedToken = IERC20(tokenInfo.pairedToken);
        require(
            pairedToken.balanceOf(msg.sender) >= totalCost,
            "Insufficient paired token balance"
        );

        // Transfer paired tokens from buyer
        pairedToken.safeTransferFrom(msg.sender, address(this), totalCost);

        // Transfer protocol fee
        if (protocolFee > 0) {
            pairedToken.safeTransfer(feeRecipient, protocolFee);
        }

        // Update reserves
        tokenInfo.reserveBalance += (totalCost - protocolFee);
        tokenInfo.circulatingSupply += memecoinAmount;

        // Transfer memecoins to buyer
        IERC20(memecoin).safeTransfer(msg.sender, memecoinAmount);

        emit TokenBuy(
            msg.sender,
            memecoin,
            memecoinAmount,
            totalCost,
            getCurrentPrice(memecoin)
        );
    }

    function sellTokens(address memecoin, uint256 memecoinAmount) external nonReentrant {
        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        require(tokenInfo.initialized, "Token not initialized");
        require(memecoinAmount > 0, "Amount must be positive");

        IERC20 memecoinContract = IERC20(memecoin);
        require(
            memecoinContract.balanceOf(msg.sender) >= memecoinAmount,
            "Insufficient memecoin balance"
        );

        (uint256 totalReceived, uint256 protocolFee) = calculateSellPrice(memecoin, memecoinAmount);
        require(tokenInfo.reserveBalance >= totalReceived + protocolFee, "Insufficient reserves");

        // Transfer memecoins from seller
        memecoinContract.safeTransferFrom(msg.sender, address(this), memecoinAmount);

        // Update reserves and supply
        tokenInfo.reserveBalance -= (totalReceived + protocolFee);
        tokenInfo.circulatingSupply -= memecoinAmount;

        // Transfer paired tokens to seller
        IERC20 pairedToken = IERC20(tokenInfo.pairedToken);
        pairedToken.safeTransfer(msg.sender, totalReceived);

        // Transfer protocol fee
        if (protocolFee > 0) {
            pairedToken.safeTransfer(feeRecipient, protocolFee);
        }

        emit TokenSell(
            msg.sender,
            memecoin,
            memecoinAmount,
            totalReceived,
            getCurrentPrice(memecoin)
        );
    }

    function getTokenInfo(address memecoin) 
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
        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        require(tokenInfo.initialized, "Token not initialized");

        return (
            tokenInfo.pairedToken,
            tokenInfo.totalSupply,
            tokenInfo.circulatingSupply,
            tokenInfo.reserveBalance,
            getCurrentPrice(memecoin)
        );
    }

    function getPriceSteps(address memecoin) external view returns (PriceStep[] memory) {
        TokenInfo storage tokenInfo = tokenInfos[memecoin];
        require(tokenInfo.initialized, "Token not initialized");
        return tokenInfo.priceSteps;
    }

    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%"); // Max 10%
        uint256 old = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(old, newFeeBps);
    }

    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid fee recipient");
        address old = feeRecipient;
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(old, newFeeRecipient);
    }

    function setInitializer(address initializer, bool allowed) external onlyOwner {
        require(initializer != address(0), "Invalid initializer");
        authorizedInitializers[initializer] = allowed;
        emit InitializerUpdated(initializer, allowed);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount, msg.sender);
    }
} 