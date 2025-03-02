// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./Memecoin.sol";
import "./interfaces/ISpookySwapFactory.sol";
import "./interfaces/IPositionManager.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IQuoter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Launchpad is Ownable {
    address constant factoryAddress = 0x3D91B700252e0E3eE7805d12e048a988Ab69C8ad;
    address constant positionManagerAddress = 0xf807Aca27B1550Fe778fD4E7013BB57480b17fAc;
    address constant swapRouterAddress = 0x0C2BC01d435CfEb2DC6Ad7cEC0E473e2DBaBdd87;
    address constant quoterAddress = 0x593856bbfd6Aaf0b714277c0BF06307900d1Aa68;
    uint24 constant fee = 3000;

    ISpookySwapFactory public factory = ISpookySwapFactory(factoryAddress);
    IPositionManager public positionManager = IPositionManager(positionManagerAddress);
    ISwapRouter public swapRouter = ISwapRouter(swapRouterAddress);
    IQuoter public quoter = IQuoter(quoterAddress);

    event TokenLaunched(address indexed creator, address tokenAddress, address poolAddress);

    constructor() Ownable(msg.sender) {}

    function launchToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address pairedToken
    ) external returns (address) {
        Memecoin token = new Memecoin(name, symbol, initialSupply);
        token.transferOwnership(msg.sender);
        address pool = factory.getPool(address(token), pairedToken, fee);
        if (pool == address(0)) {
            pool = factory.createPool(address(token), pairedToken, fee);
        }
        positionManager.mint(
            address(token),
            pairedToken,
            fee,
            -60000,
            60000,
            1000 ether,
            1000 ether,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );
        emit TokenLaunched(msg.sender, address(token), pool);
        return address(token);
    }
}

