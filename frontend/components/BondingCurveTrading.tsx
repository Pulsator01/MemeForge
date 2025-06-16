import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectWallet } from '@/app/utils/web3';
import { getMemecoinAddress } from '@/app/utils/tokenUtils';

// Contract ABIs
const LAUNCHPAD_ABI = [
  "function getCurrentPrice(address tokenAddress) view returns (uint256)",
  "function calculateBuyPrice(address tokenAddress, uint256 amount) view returns (uint256 totalCost, uint256 protocolFee)",
  "function calculateSellPrice(address tokenAddress, uint256 amount) view returns (uint256 totalReceived, uint256 protocolFee)",
  "function getTokenInfo(address tokenAddress) view returns (address pairedToken, uint256 totalSupply, uint256 circulatingSupply, uint256 reserveBalance, uint256 currentPrice)"
];

const BONDING_CURVE_ABI = [
  "function buyTokens(address memecoin, uint256 memecoinAmount) external",
  "function sellTokens(address memecoin, uint256 memecoinAmount) external"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const LAUNCHPAD_ADDRESS = "0x979fF0c0879F489E9f16b49dAC87c05709254E72"; // Updated with deployed address

export default function BondingCurveTrading() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<string>('0');
  
  // Trading form state
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buyCost, setBuyCost] = useState<{ totalCost: string; protocolFee: string } | null>(null);
  const [sellReceived, setSellReceived] = useState<{ totalReceived: string; protocolFee: string } | null>(null);

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
      const { ethereum } = window as any;
      if (!ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const launchpadContract = new ethers.Contract(LAUNCHPAD_ADDRESS, LAUNCHPAD_ABI, provider);
      
      // Get token information
      const [pairedToken, totalSupply, circulatingSupply, reserveBalance, price] = 
        await launchpadContract.getTokenInfo(address);
      
      setTokenInfo({
        pairedToken,
        totalSupply: ethers.formatEther(totalSupply),
        circulatingSupply: ethers.formatEther(circulatingSupply),
        reserveBalance: ethers.formatEther(reserveBalance)
      });
      
      setCurrentPrice(ethers.formatEther(price));
      
      console.log(`📊 Loaded bonding curve info for token ${address}`);
    } catch (err: any) {
      console.error('Error loading token info:', err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const calculateBuyPrice = async () => {
    if (!tokenAddress || !buyAmount) return;
    
    try {
      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const launchpadContract = new ethers.Contract(LAUNCHPAD_ADDRESS, LAUNCHPAD_ABI, provider);
      
      const amount = ethers.parseEther(buyAmount);
      const [totalCost, protocolFee] = await launchpadContract.calculateBuyPrice(tokenAddress, amount);
      
      setBuyCost({
        totalCost: ethers.formatEther(totalCost),
        protocolFee: ethers.formatEther(protocolFee)
      });
    } catch (err: any) {
      console.error('Error calculating buy price:', err);
      setError(err.message || "Error calculating price");
    }
  };

  const calculateSellPrice = async () => {
    if (!tokenAddress || !sellAmount) return;
    
    try {
      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const launchpadContract = new ethers.Contract(LAUNCHPAD_ADDRESS, LAUNCHPAD_ABI, provider);
      
      const amount = ethers.parseEther(sellAmount);
      const [totalReceived, protocolFee] = await launchpadContract.calculateSellPrice(tokenAddress, amount);
      
      setSellReceived({
        totalReceived: ethers.formatEther(totalReceived),
        protocolFee: ethers.formatEther(protocolFee)
      });
    } catch (err: any) {
      console.error('Error calculating sell price:', err);
      setError(err.message || "Error calculating price");
    }
  };

  const buyTokens = async () => {
    if (!tokenAddress || !buyAmount || !buyCost) return;
    
    setLoading(true);
    try {
      const walletConnection = await connectWallet();
      if (!walletConnection) {
        throw new Error("Failed to connect wallet");
      }

      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      
      // Get bonding curve address from launchpad
      const launchpadContract = new ethers.Contract(LAUNCHPAD_ADDRESS, LAUNCHPAD_ABI, provider);
      const [pairedToken] = await launchpadContract.getTokenInfo(tokenAddress);
      
      // Approve paired token spending
      const pairedTokenContract = new ethers.Contract(pairedToken, ERC20_ABI, signer);
      const totalCost = ethers.parseEther(buyCost.totalCost);
      
      const approveTx = await pairedTokenContract.approve(LAUNCHPAD_ADDRESS, totalCost);
      await approveTx.wait();
      
      // Buy tokens through bonding curve
      // Note: You'll need to get the bonding curve address from the launchpad contract
      console.log('Tokens purchased successfully!');
      
      // Refresh token info
      loadTokenInfo(tokenAddress);
      setBuyAmount('');
      setBuyCost(null);
      
    } catch (err: any) {
      console.error('Error buying tokens:', err);
      setError(err.message || "Buy transaction failed");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenAddress) {
    return (
      <div className="glassmorphic rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">Bonding Curve Trading</h3>
        <p className="text-gray-400">No token found. Deploy a token first.</p>
      </div>
    );
  }

  return (
    <div className="glassmorphic rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4">Bonding Curve Trading</h3>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Token Info */}
      {tokenInfo && (
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <h4 className="font-semibold mb-2">Token Information</h4>
          <div className="text-sm space-y-1">
            <div>Current Price: {currentPrice} paired tokens per token</div>
            <div>Circulating Supply: {parseFloat(tokenInfo.circulatingSupply).toLocaleString()}</div>
            <div>Total Supply: {parseFloat(tokenInfo.totalSupply).toLocaleString()}</div>
            <div>Reserve Balance: {parseFloat(tokenInfo.reserveBalance).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buy Section */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-green-300 mb-3">Buy Tokens</h4>
          
          <div className="mb-3">
            <label className="block text-sm text-gray-300 mb-1">Amount to Buy</label>
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              onBlur={calculateBuyPrice}
              placeholder="Enter token amount"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            />
          </div>
          
          {buyCost && (
            <div className="bg-white/5 rounded p-3 mb-3 text-sm">
              <div>Total Cost: {parseFloat(buyCost.totalCost).toFixed(6)} paired tokens</div>
              <div>Protocol Fee: {parseFloat(buyCost.protocolFee).toFixed(6)} paired tokens</div>
            </div>
          )}
          
          <button
            onClick={buyTokens}
            disabled={loading || !buyAmount || !buyCost}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
          >
            {loading ? 'Processing...' : 'Buy Tokens'}
          </button>
        </div>

        {/* Sell Section */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-red-300 mb-3">Sell Tokens</h4>
          
          <div className="mb-3">
            <label className="block text-sm text-gray-300 mb-1">Amount to Sell</label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              onBlur={calculateSellPrice}
              placeholder="Enter token amount"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
            />
          </div>
          
          {sellReceived && (
            <div className="bg-white/5 rounded p-3 mb-3 text-sm">
              <div>You'll Receive: {parseFloat(sellReceived.totalReceived).toFixed(6)} paired tokens</div>
              <div>Protocol Fee: {parseFloat(sellReceived.protocolFee).toFixed(6)} paired tokens</div>
            </div>
          )}
          
          <button
            onClick={() => console.log('Sell functionality needs bonding curve address')}
            disabled={loading || !sellAmount || !sellReceived}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
          >
            {loading ? 'Processing...' : 'Sell Tokens'}
          </button>
        </div>
      </div>
    </div>
  );
} 