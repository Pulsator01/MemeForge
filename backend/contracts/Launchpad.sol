// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Memecoin.sol";
import "./interfaces/IPositionManager.sol";

contract Launchpad is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event TokenLaunched(
        address indexed creator,
        address indexed tokenAddress,
        uint256 initialSupply,
        address pairedToken,
        uint256 liquidityMemecoinAmount,
        uint256 liquidityPairedTokenAmount,
        uint160 sqrtPriceX96Initial
    );

    event LiquidityProvided(
        address indexed token0,
        address indexed token1,
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    address public immutable positionManager;

    // Uniswap V3/Algebra constants
    int24 private constant MIN_TICK = -887272;
    int24 private constant MAX_TICK = 887272;
    uint24 private constant DEFAULT_FEE = 3000; // 0.3%

    constructor(address _positionManager) Ownable(msg.sender) {
        require(_positionManager != address(0), "PositionManager address cannot be zero");
        positionManager = _positionManager;
    }

    function launchToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address pairedTokenAddress,
        uint256 liquidityMemecoinAmount,
        uint256 liquidityPairedTokenAmount,
        uint160 sqrtPriceX96Initial,
        uint256 amount0MinExpected,
        uint256 amount1MinExpected,
        uint256 deadlineTimestamp
    ) external nonReentrant {
        require(bytes(name).length > 0, "Token name cannot be empty");
        require(bytes(symbol).length > 0, "Token symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be greater than 0");
        require(pairedTokenAddress != address(0), "Paired token address cannot be zero");
        require(liquidityMemecoinAmount > 0, "Liquidity memecoin amount must be greater than 0");
        require(liquidityPairedTokenAmount > 0, "Liquidity paired token amount must be greater than 0");
        require(initialSupply >= liquidityMemecoinAmount, "Initial supply must cover liquidity amount");

        IERC20 pairedToken = IERC20(pairedTokenAddress);
        require(
            pairedToken.balanceOf(msg.sender) >= liquidityPairedTokenAmount,
            "Insufficient paired token balance for liquidity"
        );
        require(
            pairedToken.allowance(msg.sender, address(this)) >= liquidityPairedTokenAmount,
            "Launchpad requires paired token allowance for liquidity"
        );

        // Deploy the new memecoin
        Memecoin newMemecoin = new Memecoin(name, symbol, initialSupply);
        address newMemecoinAddress = address(newMemecoin);

        // Transfer paired tokens from user to this contract
        pairedToken.safeTransferFrom(msg.sender, address(this), liquidityPairedTokenAmount);

        // Transfer memecoin liquidity portion to this contract (already owned by Launchpad)
        // Transfer the rest to the creator
        uint256 creatorMemecoinAmount = initialSupply - liquidityMemecoinAmount;
        if (creatorMemecoinAmount > 0) {
            IERC20(newMemecoinAddress).safeTransfer(msg.sender, creatorMemecoinAmount);
        }

        emit TokenLaunched(
            msg.sender,
            newMemecoinAddress,
            initialSupply,
            pairedTokenAddress,
            liquidityMemecoinAmount,
            liquidityPairedTokenAmount,
            sqrtPriceX96Initial
        );

        // Approve position manager to spend tokens
        IERC20(newMemecoinAddress).approve(positionManager, liquidityMemecoinAmount);
        pairedToken.approve(positionManager, liquidityPairedTokenAmount);

        // Create pool if necessary and mint position (full range)
        IPositionManager pm = IPositionManager(positionManager);

        // Determine token0 and token1 for pool creation and minting
        address token0 = newMemecoinAddress < pairedTokenAddress ? newMemecoinAddress : pairedTokenAddress;
        address token1 = newMemecoinAddress < pairedTokenAddress ? pairedTokenAddress : newMemecoinAddress;
        uint256 amount0ForPool = newMemecoinAddress < pairedTokenAddress ? liquidityMemecoinAmount : liquidityPairedTokenAmount;
        uint256 amount1ForPool = newMemecoinAddress < pairedTokenAddress ? liquidityPairedTokenAmount : liquidityMemecoinAmount;

        // The initial square root price is now provided by the caller.
        // createAndInitializePoolIfNecessary will create the pool if it doesn't exist.
        // The caller is responsible for providing a valid sqrtPriceX96Initial, especially for new pools.
        require(sqrtPriceX96Initial != 0, "Initial price cannot be zero"); // Basic check

        pm.createAndInitializePoolIfNecessary(token0, token1, DEFAULT_FEE, sqrtPriceX96Initial);

        IPositionManager.MintParams memory params = IPositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: DEFAULT_FEE,
            tickLower: MIN_TICK,
            tickUpper: MAX_TICK,
            amount0Desired: amount0ForPool,
            amount1Desired: amount1ForPool,
            amount0Min: amount0MinExpected,
            amount1Min: amount1MinExpected,
            recipient: msg.sender,
            deadline: deadlineTimestamp
        });

        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) = pm.mint(params);

        emit LiquidityProvided(
            params.token0,
            params.token1,
            tokenId,
            liquidity,
            amount0,
            amount1
        );
    }

    function addLiquidityToDEX(
        address /*dexRouterAddress*/,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address /*to*/
    ) external onlyOwner {
        require(tokenA != address(0) && tokenB != address(0), "Invalid token addresses");
        require(amountA > 0 && amountB > 0, "Amounts must be positive");

        IERC20 tokenContractA = IERC20(tokenA);
        IERC20 tokenContractB = IERC20(tokenB);

        require(tokenContractA.balanceOf(address(this)) >= amountA, "Insufficient memecoin balance for LP");
        require(tokenContractB.balanceOf(address(this)) >= amountB, "Insufficient paired token balance for LP");

        revert("DEX interaction not implemented");
    }

    function withdrawToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        IERC20 tokenContract = IERC20(tokenAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(balance >= amount, "Insufficient balance");
        uint256 actualAmount = (amount == 0) ? balance : amount;
        tokenContract.safeTransfer(msg.sender, actualAmount);
    }
}