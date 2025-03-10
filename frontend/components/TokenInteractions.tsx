import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectWallet } from '@/app/utils/web3';
import { getMemecoinAddress } from '@/app/utils/tokenUtils';

// Basic ERC20 ABI
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function allowance(address,address) view returns (uint256)"
];

export default function TokenInteractions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    totalSupply: string;
    userBalance: string;
  } | null>(null);

  useEffect(() => {
    // Get the stored token address on component mount
    const address = getMemecoinAddress();
    setTokenAddress(address);
    
    if (address) {
      loadTokenInfo(address);
    }
  }, []);

  const loadTokenInfo = async (address: string) => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Connect wallet
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
      const userAddress = await signer.getAddress();
      
      // Create token contract instance using the stored address
      const tokenContract = new ethers.Contract(
        address,
        ERC20_ABI,
        signer
      );
      
      // Get token information
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();
      const totalSupply = await tokenContract.totalSupply();
      const userBalance = await tokenContract.balanceOf(userAddress);
      
      // Format values
      const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals);
      const formattedUserBalance = ethers.formatUnits(userBalance, decimals);
      
      setTokenInfo({
        name,
        symbol,
        totalSupply: formattedTotalSupply,
        userBalance: formattedUserBalance
      });
      
      console.log(`📊 Loaded ${symbol} token info from address ${address}`);
    } catch (err: any) {
      console.error('Error loading token info:', err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glassmorphic rounded-xl p-6 md:p-8">
      <h2 className="text-2xl font-bold font-orbitron text-gradient mb-6">Your Token Details</h2>
      
      {!tokenAddress ? (
        <div className="text-gray-400">
          No token address found. Please deploy a token first.
        </div>
      ) : error ? (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : tokenInfo ? (
        <div className="space-y-4">
          <div className="mb-4">
            <p className="text-gray-400">Token Address:</p>
            <code className="block mt-1 p-2 bg-black/30 rounded border border-blue-500/30 text-blue-300 font-mono break-all">
              {tokenAddress}
            </code>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-gray-400">Name</p>
              <p className="text-xl font-semibold">{tokenInfo.name}</p>
            </div>
            
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-gray-400">Symbol</p>
              <p className="text-xl font-semibold">{tokenInfo.symbol}</p>
            </div>
            
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-gray-400">Total Supply</p>
              <p className="text-xl font-semibold">{Number(tokenInfo.totalSupply).toLocaleString()} {tokenInfo.symbol}</p>
            </div>
            
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-gray-400">Your Balance</p>
              <p className="text-xl font-semibold">{Number(tokenInfo.userBalance).toLocaleString()} {tokenInfo.symbol}</p>
            </div>
          </div>
          
          <button 
            onClick={() => loadTokenInfo(tokenAddress)}
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Refresh Token Info
          </button>
        </div>
      ) : (
        <div className="text-gray-400">
          Failed to load token information. Please try again.
        </div>
      )}
    </div>
  );
} 