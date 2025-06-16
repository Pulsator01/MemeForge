'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getMemecoinAddress } from '@/app/utils/tokenUtils';

const LAUNCHPAD_ADDRESS = "0x979fF0c0879F489E9f16b49dAC87c05709254E72";
const BONDING_CURVE_ADDRESS = "0x914E9e12aEdb7169Cd894f90bc9904361E30a7c9";
const PAIRED_TOKEN_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";

export default function TestTrading() {
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [costInfo, setCostInfo] = useState<{ totalCost: string; protocolFee: string } | null>(null);
  const [pairedTokenBalance, setPairedTokenBalance] = useState<string>('0');
  const [allowance, setAllowance] = useState<string>('0');

  useEffect(() => {
    const address = getMemecoinAddress();
    setTokenAddress(address);
    if (address) {
      loadBalances();
    }
  }, []);

  const loadBalances = async () => {
    try {
      const { ethereum } = window as any;
      if (!ethereum) return;

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // ERC20 ABI for balance and allowance
      const erc20ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];

      const pairedToken = new ethers.Contract(PAIRED_TOKEN_ADDRESS, erc20ABI, provider);
      
      const balance = await pairedToken.balanceOf(userAddress);
      const currentAllowance = await pairedToken.allowance(userAddress, BONDING_CURVE_ADDRESS);
      
      setPairedTokenBalance(ethers.formatEther(balance));
      setAllowance(ethers.formatEther(currentAllowance));

    } catch (err) {
      console.error('Error loading balances:', err);
    }
  };

  const calculateCost = async () => {
    if (!tokenAddress || !buyAmount) return;
    
    try {
      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      
      const bondingCurveABI = [
        "function calculateBuyPrice(address memecoin, uint256 memecoinAmount) view returns (uint256 totalCost, uint256 protocolFee)"
      ];

      const bondingCurve = new ethers.Contract(BONDING_CURVE_ADDRESS, bondingCurveABI, provider);
      const memecoinAmount = ethers.parseEther(buyAmount);
      const [totalCost, protocolFee] = await bondingCurve.calculateBuyPrice(tokenAddress, memecoinAmount);
      
      setCostInfo({
        totalCost: ethers.formatEther(totalCost),
        protocolFee: ethers.formatEther(protocolFee)
      });
    } catch (err: any) {
      console.error('Error calculating cost:', err);
      setError(err.message || "Error calculating cost");
    }
  };

  const approvePairedToken = async () => {
    if (!costInfo) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const erc20ABI = [
        "function approve(address spender, uint256 amount) returns (bool)"
      ];

      const pairedToken = new ethers.Contract(PAIRED_TOKEN_ADDRESS, erc20ABI, signer);
      const totalCost = ethers.parseEther(costInfo.totalCost);
      
      console.log(`💰 Approving ${costInfo.totalCost} paired tokens...`);
      
      const tx = await pairedToken.approve(BONDING_CURVE_ADDRESS, totalCost);
      await tx.wait();
      
      setSuccess(`✅ Approved ${costInfo.totalCost} paired tokens! Now you can buy.`);
      await loadBalances(); // Refresh allowance
      
    } catch (err: any) {
      console.error('❌ Error approving tokens:', err);
      setError(err.message || "Approval failed");
    } finally {
      setIsLoading(false);
    }
  };

  const buyTokens = async () => {
    if (!tokenAddress || !buyAmount || !costInfo) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const bondingCurveABI = [
        "function buyTokens(address memecoin, uint256 memecoinAmount)"
      ];

      const bondingCurve = new ethers.Contract(BONDING_CURVE_ADDRESS, bondingCurveABI, signer);
      const memecoinAmount = ethers.parseEther(buyAmount);
      
      console.log(`🚀 Buying ${buyAmount} tokens...`);
      
      const tx = await bondingCurve.buyTokens(tokenAddress, memecoinAmount);
      console.log('🔄 Transaction sent:', tx.hash);
      
      await tx.wait();
      
      setSuccess(`✅ Successfully bought ${buyAmount} tokens! TX: ${tx.hash}`);
      await loadBalances(); // Refresh balances
      setCostInfo(null); // Clear cost info
      
    } catch (err: any) {
      console.error('❌ Error buying tokens:', err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-calculate cost when amount changes
  useEffect(() => {
    if (buyAmount && tokenAddress) {
      calculateCost();
    }
  }, [buyAmount, tokenAddress]);

  const needsApproval = costInfo && parseFloat(allowance) < parseFloat(costInfo.totalCost);
  const insufficientBalance = costInfo && parseFloat(pairedTokenBalance) < parseFloat(costInfo.totalCost);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Test Token Trading</h1>
        
        {!tokenAddress ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400">❌ No token found. Deploy a token first at <a href="/create" className="underline">/create</a></p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Token Info</h2>
              <div className="text-sm space-y-2">
                <div><strong>Token Address:</strong> <span className="font-mono">{tokenAddress}</span></div>
                <div><strong>Bonding Curve:</strong> <span className="font-mono">{BONDING_CURVE_ADDRESS}</span></div>
                <div><strong>Paired Token:</strong> <span className="font-mono">{PAIRED_TOKEN_ADDRESS}</span></div>
                <div><strong>Network:</strong> Sonic Blaze Testnet</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">💰 Your Balances</h2>
              <div className="text-sm space-y-2">
                <div><strong>Paired Token Balance:</strong> {parseFloat(pairedTokenBalance).toFixed(4)}</div>
                <div><strong>Allowance:</strong> {parseFloat(allowance).toFixed(4)}</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">🛒 Buy Tokens</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Amount of tokens to buy:</label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>

                {costInfo && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">💸 Cost Breakdown:</h3>
                    <div className="text-sm space-y-1">
                      <div>Total Cost: {parseFloat(costInfo.totalCost).toFixed(6)} paired tokens</div>
                      <div>Protocol Fee: {parseFloat(costInfo.protocolFee).toFixed(6)} paired tokens</div>
                    </div>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400">❌ Insufficient paired token balance!</p>
                    <p className="text-sm text-red-300">You need to get some paired tokens first.</p>
                  </div>
                )}

                {needsApproval && !insufficientBalance && (
                  <button
                    onClick={approvePairedToken}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {isLoading ? '⏳ Approving...' : '🔓 Approve Paired Tokens'}
                  </button>
                )}

                {!needsApproval && !insufficientBalance && costInfo && (
                  <button
                    onClick={buyTokens}
                    disabled={isLoading || !buyAmount}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {isLoading ? '⏳ Buying...' : '🚀 Buy Tokens'}
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400">❌ {error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400">{success}</p>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2">⚠️ Important:</h3>
              <ul className="text-sm space-y-1 text-yellow-200">
                <li>• This uses ERC20 paired tokens, not native S tokens</li>
                <li>• You need to have the paired token in your wallet first</li>
                <li>• You must approve tokens before buying</li>
                <li>• Each purchase increases the price for next buyers</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 