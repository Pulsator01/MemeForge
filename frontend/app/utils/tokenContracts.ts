import { ethers } from 'ethers';
import { getMemecoinAddress } from './tokenUtils';

// Basic ERC20 ABI
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

/**
 * Creates a memecoin contract instance using the stored address
 * @param provider The ethers provider or signer to use for the contract
 * @returns The contract instance or null if no address is stored
 */
export const getMemecoinContract = async (provider: ethers.Signer | ethers.Provider) => {
  const tokenAddress = getMemecoinAddress();
  if (!tokenAddress) {
    console.error('No memecoin address found in storage. Deploy a token first.');
    return null;
  }

  try {
    // Create contract instance
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Test that the contract is valid with a simple call
    await contract.name();
    
    console.log(`📝 Memecoin contract created at address: ${tokenAddress}`);
    return contract;
  } catch (error) {
    console.error('Error creating token contract:', error);
    return null;
  }
};

/**
 * Gets the user's token balance
 * @param signer The connected wallet signer
 * @returns The formatted balance and symbol, or null on error
 */
export const getUserTokenBalance = async (signer: ethers.Signer) => {
  try {
    const contract = await getMemecoinContract(signer);
    if (!contract) return null;
    
    const userAddress = await signer.getAddress();
    const balance = await contract.balanceOf(userAddress);
    const decimals = await contract.decimals();
    const symbol = await contract.symbol();
    
    const formattedBalance = ethers.formatUnits(balance, decimals);
    
    return {
      balance: formattedBalance,
      symbol,
      raw: balance
    };
  } catch (error) {
    console.error('Error getting user token balance:', error);
    return null;
  }
}; 