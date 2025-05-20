import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { connectWallet } from '@/app/utils/web3';
import LaunchpadArtifact from '@/app/abis/Launchpad.json';

// Extract just the ABI from the artifact
const LaunchpadABI = LaunchpadArtifact.abi;

// Contract address (should be loaded from config in production)
const LAUNCHPAD_ADDRESS = "0xe76a660c63F2090798bF1240A21187514E8e91D4";

// Storage key for localStorage
const MEMECOIN_ADDRESS_KEY = 'memecoin_address';

// ERC20 ABI for token approval
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

interface LaunchpadFormData {
  name: string;
  symbol: string;
  initialSupply: string;
  pairedToken: string;
  liquidityMemecoinAmount: string;
  liquidityPairedTokenAmount: string;
  // V3 params for Uniswap/Algebra DEX
  fee?: number; // e.g. 3000 for 0.3%
  tickLower?: number; // e.g. -887272
  tickUpper?: number; // e.g. 887272
  deadline?: number; // unix timestamp
  // New parameters for the updated contract
  sqrtPriceX96Initial?: string; // Initial square root price for the pool
  amount0MinExpected?: string; // Minimum expected amount for token0
  amount1MinExpected?: string; // Minimum expected amount for token1
}

interface LaunchpadResult {
  success: boolean;
  tokenAddress?: string;
  error?: string;
  txHash?: string;
  lpTokenId?: string;
  lpLiquidity?: string;
  lpAmount0?: string;
  lpAmount1?: string;
}

export function useLaunchpad() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LaunchpadResult | null>(null);

  // Helper to save the memecoin address to localStorage
  const saveMemecoinAddress = (address: string) => {
    localStorage.setItem(MEMECOIN_ADDRESS_KEY, address);
  };

  // Helper to get the stored memecoin address
  const getMemecoinAddress = (): string | null => {
    return localStorage.getItem(MEMECOIN_ADDRESS_KEY);
  };

  const launchToken = useCallback(async (formData: LaunchpadFormData): Promise<LaunchpadResult> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Connect wallet and get provider
      const walletConnection = await connectWallet();
      if (!walletConnection) {
        throw new Error("Failed to connect wallet");
      }

      const { ethereum } = window as any;
      if (!ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      
      // Create contract instances
      const launchpadContract = new ethers.Contract(
        LAUNCHPAD_ADDRESS, 
        LaunchpadABI, 
        signer
      );
      const pairedTokenContract = new ethers.Contract(formData.pairedToken, ERC20_ABI, signer);

      // Step 1: Approve token transfer
      const liquidityPairedTokenAmount = ethers.parseUnits(formData.liquidityPairedTokenAmount, 18);

      // Just do the approval without checking allowance first
      try {
        const approveTx = await pairedTokenContract.approve(LAUNCHPAD_ADDRESS, liquidityPairedTokenAmount);
        await approveTx.wait();
      } catch (approveError) {
        console.error("Token approval failed:", approveError);
        throw new Error("Failed to approve token transfer. The token might not be a standard ERC20 token.");
      }

      // Step 2: Launch token
      const initialSupply = ethers.parseUnits(formData.initialSupply, 18); // Assumes 18 decimals
      const liquidityMemecoinAmount = ethers.parseUnits(formData.liquidityMemecoinAmount, 18); // Assumes 18 decimals

      // Default values for new required parameters
      const sqrtPriceX96Initial = formData.sqrtPriceX96Initial || "79228162514264337593543950336"; // A sensible default (1:1 price)
      const amount0MinExpected = formData.amount0MinExpected 
        ? ethers.parseUnits(formData.amount0MinExpected, 18) 
        : ethers.parseUnits("0", 18); // 0 means no minimum (accept any slippage)
      const amount1MinExpected = formData.amount1MinExpected 
        ? ethers.parseUnits(formData.amount1MinExpected, 18) 
        : ethers.parseUnits("0", 18); // 0 means no minimum (accept any slippage)
      const deadlineTimestamp = formData.deadline || Math.floor(Date.now() / 1000) + 600; // Default: 10 minutes from now

      // Call the contract with all required parameters
      const tx = await launchpadContract.launchToken(
        formData.name,
        formData.symbol,
        initialSupply,
        formData.pairedToken,
        liquidityMemecoinAmount,
        liquidityPairedTokenAmount,
        sqrtPriceX96Initial,
        amount0MinExpected,
        amount1MinExpected,
        deadlineTimestamp
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Find TokenLaunched event to get the token address
      const tokenLaunchedEvent = receipt.logs
        .map((log: any) => {
          try {
            return launchpadContract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'TokenLaunched');

      const tokenAddress = tokenLaunchedEvent ? tokenLaunchedEvent.args.tokenAddress : undefined;
      if (tokenAddress) {
        saveMemecoinAddress(tokenAddress);
      }

      // Find LiquidityProvided event to get LP NFT info
      const liquidityEvent = receipt.logs
        .map((log: any) => {
          try {
            return launchpadContract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'LiquidityProvided');

      const result = {
        success: true,
        tokenAddress,
        txHash: receipt.hash,
        lpTokenId: liquidityEvent ? liquidityEvent.args.tokenId.toString() : undefined,
        lpLiquidity: liquidityEvent ? liquidityEvent.args.liquidity.toString() : undefined,
        lpAmount0: liquidityEvent ? liquidityEvent.args.amount0.toString() : undefined,
        lpAmount1: liquidityEvent ? liquidityEvent.args.amount1.toString() : undefined,
      };

      setResult(result);
      setLoading(false);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error occurred";
      setError(errorMessage);
      setLoading(false);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  return {
    launchToken,
    loading,
    error,
    result,
    getMemecoinAddress,  // Export the utility function to get the address
    saveMemecoinAddress  // Export the utility function to save an address manually
  };
} 
