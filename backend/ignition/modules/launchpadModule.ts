import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LaunchpadModule = buildModule("LaunchpadModuleV2", (m) => {
  const launchpad = m.contract("Launchpad", []);
  return { launchpad };
});

export default LaunchpadModule;
