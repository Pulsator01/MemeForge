import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

const SONIC_PRIVATE_KEY = process.env.SONIC_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sonic: {
      url: "https://rpc.blaze.soniclabs.com",
      accounts: [SONIC_PRIVATE_KEY],
    },
  },
};

export default config;
