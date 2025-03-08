// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./Memecoin.sol";
import "./interfaces/IPositionManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Launchpad is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant positionManagerAddress = 0xf807Aca27B1550Fe778fD4E7013BB57480b17fAc;
    uint24 constant fee = 3000; // 0.3% fee tier for SpookySwap V3 pool

    IPositionManager public positionManager = IPositionManager(positionManagerAddress);

    event TokenLaunched(address indexed creator, address tokenAddress, address poolAddress);

    constructor() Ownable(msg.sender) {}

    function launchToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address pairedToken,
        uint256 liquidityMemecoinAmount,
        uint256 liquidityPairedTokenAmount,
        uint160 initialSqrtPriceX96
    ) external nonReentrant returns (address) {
        require(bytes(name).length > 0, "Token name cannot be empty");
        require(bytes(symbol).length > 0, "Token symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be greater than 0");
        require(pairedToken != address(0), "Paired token address cannot be zero");
        require(liquidityMemecoinAmount > 0, "Liquidity memecoin amount must be greater than 0");
        require(liquidityPairedTokenAmount > 0, "Liquidity paired token amount must be greater than 0");
        require(initialSupply >= liquidityMemecoinAmount, "Initial supply must cover liquidity");
        require(initialSqrtPriceX96 > 0, "Initial price must be greater than zero");

        IERC20 pairedTokenContract = IERC20(pairedToken);
        require(
            pairedTokenContract.balanceOf(msg.sender) >= liquidityPairedTokenAmount,
            "Insufficient paired token balance"
        );

        Memecoin token = new Memecoin(name, symbol, initialSupply);
        require(address(token) != pairedToken, "Cannot pair with itself");
        token.transferOwnership(msg.sender);

        pairedTokenContract.safeTransferFrom(msg.sender, address(this), liquidityPairedTokenAmount);

        SafeERC20.forceApprove(IERC20(address(token)), address(positionManager), liquidityMemecoinAmount);
        SafeERC20.forceApprove(pairedTokenContract, address(positionManager), liquidityPairedTokenAmount);

        (address token0, address token1) = address(token) < pairedToken
            ? (address(token), pairedToken)
            : (pairedToken, address(token));

        address pool = positionManager.createAndInitializePoolIfNecessary(
            token0,
            token1,
            fee,
            initialSqrtPriceX96
        );

        positionManager.mint(
            IPositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: -60000,
                tickUpper: 60000,
                amount0Desired: token0 == address(token) ? liquidityMemecoinAmount : liquidityPairedTokenAmount,
                amount1Desired: token1 == address(token) ? liquidityMemecoinAmount : liquidityPairedTokenAmount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: msg.sender,
                deadline: block.timestamp + 300
            })
        );

        uint256 remainingMemecoin = token.balanceOf(address(this));
        if (remainingMemecoin > 0) {
            SafeERC20.safeTransfer(IERC20(address(token)), msg.sender, remainingMemecoin);
        }
        uint256 remainingPaired = pairedTokenContract.balanceOf(address(this));
        if (remainingPaired > 0) {
            pairedTokenContract.safeTransfer(msg.sender, remainingPaired);
        }

        emit TokenLaunched(msg.sender, address(token), pool);
        return address(token);
    }

    function withdrawToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        IERC20 tokenContract = IERC20(tokenAddress);
        require(tokenContract.balanceOf(address(this)) >= amount, "Insufficient balance");
        tokenContract.safeTransfer(msg.sender, amount);
    }
}