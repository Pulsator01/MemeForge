import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LaunchpadModule = buildModule("LaunchpadModuleV6", (m) => {
  const positionManagerAddress = "0x12E66C8F215DdD5d48d150c8f46aD0c6fB0F4406"; // NonfungiblePositionManager NEW
  const launchpad = m.contract("Launchpad", [positionManagerAddress]);
  return { launchpad };
});

export default LaunchpadModule;
