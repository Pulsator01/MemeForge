const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Test Token...");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Deploy TestToken contract
    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy();
    await testToken.waitForDeployment();
    
    const testTokenAddress = await testToken.getAddress();
    console.log("TestToken deployed to:", testTokenAddress);

    // Get initial balance
    const balance = await testToken.balanceOf(deployer.address);
    console.log("Initial balance:", ethers.formatEther(balance), "TPT");

    console.log("\n=== Deployment Summary ===");
    console.log("TestToken:", testTokenAddress);
    console.log("Initial Supply:", ethers.formatEther(balance), "TPT");
    console.log("\nYou can use this address as the paired token for your memecoin deployment");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 