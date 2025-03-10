/**
 * Utility functions for working with token addresses
 */

const MEMECOIN_ADDRESS_KEY = 'memecoin_address';

/**
 * Get the stored memecoin address from localStorage
 * @returns The memecoin address or null if not found
 */
export const getMemecoinAddress = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(MEMECOIN_ADDRESS_KEY);
};

/**
 * Save the memecoin address to localStorage
 * @param address The memecoin contract address to save
 */
export const saveMemecoinAddress = (address: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MEMECOIN_ADDRESS_KEY, address);
  console.log('💾 Memecoin address saved:', address);
};

/**
 * Clear the stored memecoin address
 */
export const clearMemecoinAddress = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MEMECOIN_ADDRESS_KEY);
}; 