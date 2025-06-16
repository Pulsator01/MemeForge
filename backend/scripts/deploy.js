const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Bonding Curve System...");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Step 1: Deploy BondingCurve contract
    const BondingCurve = await ethers.getContractFactory("BondingCurve");
    const feeRecipient = deployer.address; // Change this to your desired fee recipient
    const bondingCurve = await BondingCurve.deploy(feeRecipient);
    await bondingCurve.waitForDeployment();
    
    const bondingCurveAddress = await bondingCurve.getAddress();
    console.log("BondingCurve deployed to:", bondingCurveAddress);

    // Step 2: Deploy Launchpad contract
    const Launchpad = await ethers.getContractFactory("Launchpad");
    const launchpad = await Launchpad.deploy(bondingCurveAddress);
    await launchpad.waitForDeployment();
    
    const launchpadAddress = await launchpad.getAddress();
    console.log("Launchpad deployed to:", launchpadAddress);

    // Step 3: Transfer BondingCurve ownership to Launchpad
    await bondingCurve.transferOwnership(launchpadAddress);
    console.log("Transferred BondingCurve ownership to Launchpad");

    console.log("\n=== Deployment Summary ===");
    console.log("BondingCurve:", bondingCurveAddress);
    console.log("Launchpad:", launchpadAddress);
    console.log("Fee Recipient:", feeRecipient);
    
    console.log("\n=== Frontend Update Required ===");
    console.log("Update LAUNCHPAD_ADDRESS in frontend/hooks/useLaunchpad.ts to:");
    console.log(`"${launchpadAddress}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 