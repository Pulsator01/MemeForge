import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LaunchpadModule = buildModule("LaunchpadModule", (m) => {
  const launchpad = m.contract("Launchpad", []);
  return { launchpad };
});

export default LaunchpadModule;
