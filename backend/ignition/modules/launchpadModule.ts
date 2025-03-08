import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LaunchpadModule = buildModule("LaunchpadModuleV6", (m) => {
  const launchpad = m.contract("Launchpad", []);
  return { launchpad };
});

export default LaunchpadModule;
