// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

// This interface appears to be for a Uniswap V3 style factory.
// Consider renaming the file from ISpookySwapFactory.sol to IUniswapV3Factory.sol or similar.
interface IUniswapV3Factory { // Renamed from ISpookySwapFactory
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);

    // Standard Uniswap V3 Factory also includes:
    // function owner() external view returns (address);
    // function feeAmountTickSpacing(uint24 fee) external view returns (int24 tickSpacing);
    // Consider adding them if needed.
}
