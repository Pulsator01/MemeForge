// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBondingCurve {
    struct PriceStep {
        uint256 tokenSupplyThreshold;
        uint256 pricePerToken;
    }

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

    event TokenInitialized(
        address indexed memecoin,
        address indexed pairedToken,
        uint256 totalSupply
    );

    function initializeToken(
        address memecoin,
        address pairedToken,
        uint256 totalSupply,
        PriceStep[] calldata initialPriceSteps
    ) external;

    function getCurrentPrice(address memecoin) external view returns (uint256);

    function calculateBuyPrice(address memecoin, uint256 memecoinAmount) 
        external 
        view 
        returns (uint256 totalCost, uint256 protocolFee);

    function calculateSellPrice(address memecoin, uint256 memecoinAmount) 
        external 
        view 
        returns (uint256 totalReceived, uint256 protocolFee);

    function buyTokens(address memecoin, uint256 memecoinAmount) external;

    function sellTokens(address memecoin, uint256 memecoinAmount) external;

    function getTokenInfo(address memecoin) 
        external 
        view 
        returns (
            address pairedToken,
            uint256 totalSupply,
            uint256 circulatingSupply,
            uint256 reserveBalance,
            uint256 currentPrice
        );

    function getPriceSteps(address memecoin) external view returns (PriceStep[] memory);
} 