import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys BondingCurve first (with fee recipient), then Launchpad with the
// BondingCurve address, and authorizes Launchpad as an initializer so it can
// call initializeToken during token launches without taking ownership.
const LaunchpadModule = buildModule("LaunchpadSystem", (m) => {
  const feeRecipient = m.getAccount(0);

  const bondingCurve = m.contract("BondingCurve", [feeRecipient]);
  const launchpad = m.contract("Launchpad", [bondingCurve]);

  // Allow Launchpad to initialize tokens while preserving deployer ownership
  m.call(bondingCurve, "setInitializer", [launchpad, true]);

  return { bondingCurve, launchpad };
});

export default LaunchpadModule;
