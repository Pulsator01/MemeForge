import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

const SONIC_PRIVATE_KEY = process.env.SONIC_PRIVATE_KEY || "YOUR_SONIC_TEST_ACCOUNT_PRIVATE_KEY";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sonic: {
      url: "https://rpc.soniclabs.com",
      accounts: [SONIC_PRIVATE_KEY],
    },
  },
};

export default config;
