const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Bonding Curve System...");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy BondingCurve contract
    const BondingCurve = await ethers.getContractFactory("BondingCurve");
    const feeRecipient = deployer.address; // You can change this to a different address
    const bondingCurve = await BondingCurve.deploy(feeRecipient);
    await bondingCurve.waitForDeployment();
    
    console.log("BondingCurve deployed to:", await bondingCurve.getAddress());

    // Deploy Launchpad contract
    const Launchpad = await ethers.getContractFactory("Launchpad");
    const launchpad = await Launchpad.deploy(await bondingCurve.getAddress());
    await launchpad.waitForDeployment();
    
    console.log("Launchpad deployed to:", await launchpad.getAddress());

    // Set Launchpad as owner of BondingCurve so it can initialize tokens
    await bondingCurve.transferOwnership(await launchpad.getAddress());
    console.log("Transferred BondingCurve ownership to Launchpad");

    console.log("\n=== Deployment Summary ===");
    console.log("BondingCurve:", await bondingCurve.getAddress());
    console.log("Launchpad:", await launchpad.getAddress());
    console.log("Fee Recipient:", feeRecipient);

    // Example: How to create a token with step-wise pricing
    console.log("\n=== Example Usage ===");
    
    // Example price steps for a memecoin
    // Step 1: 0 - 100,000 tokens at 0.001 ETH each
    // Step 2: 100,001 - 500,000 tokens at 0.002 ETH each  
    // Step 3: 500,001 - 1,000,000 tokens at 0.005 ETH each
    const examplePriceSteps = [
        {
            tokenSupplyThreshold: ethers.parseEther("100000"),    // 100K tokens
            pricePerToken: ethers.parseEther("0.001")             // 0.001 ETH per token
        },
        {
            tokenSupplyThreshold: ethers.parseEther("500000"),    // 500K tokens
            pricePerToken: ethers.parseEther("0.002")             // 0.002 ETH per token
        },
        {
            tokenSupplyThreshold: ethers.parseEther("1000000"),   // 1M tokens
            pricePerToken: ethers.parseEther("0.005")             // 0.005 ETH per token
        }
    ];

    console.log("Example price steps:");
    examplePriceSteps.forEach((step, i) => {
        console.log(`  Step ${i + 1}: Up to ${ethers.formatEther(step.tokenSupplyThreshold)} tokens at ${ethers.formatEther(step.pricePerToken)} ETH each`);
    });

    console.log("\nTo launch a token with these price steps, call:");
    console.log(`launchpad.launchToken(
        "MyMemecoin",
        "MMC", 
        ${ethers.parseEther("10000000")}, // 10M total supply
        "0x...", // paired token address (e.g., WETH)
        ${ethers.parseEther("1000000")}, // 1M tokens for bonding curve
        priceSteps
    )`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 