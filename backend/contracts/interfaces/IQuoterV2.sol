// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

interface IQuoterV2 {
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    ) external returns (
        uint256 amountOut,
        uint160[] memory sqrtPriceX96AfterList,
        uint32[] memory initializedTicksCrossedList,
        uint256 gasEstimate
    );

    // It's good practice to include other commonly used QuoterV2 functions if they might be used.
    // For example:
    // function quoteExactInputSingle(
    //     address tokenIn,
    //     address tokenOut,
    //     uint24 fee,
    //     uint256 amountIn,
    //     uint160 sqrtPriceLimitX96
    // ) external returns (
    //     uint256 amountOut,
    //     uint160 sqrtPriceX96After,
    //     uint32 initializedTicksCrossed,
    //     uint256 gasEstimate
    // );
}