type EthereumWindow = typeof window & {
  ethereum?: {
    request: (args: { method: string }) => Promise<string[]>;
    selectedAddress?: string;
  };
};

export const connectWallet = async () => {
  const ethereum = (window as EthereumWindow).ethereum;
  if (ethereum) {
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        return { address: accounts[0] };
      } else {
        throw new Error('No accounts found');
      }
    } catch (error: any) {
      // Only log error if it's not user rejection
      if (error.code !== 4001) {
        console.error('Failed to connect wallet:', error);
      }
      throw error;
    }
  } else {
    console.error('MetaMask is not installed.');
    return null;
  }
};

export const getConnectedWallet = async () => {
  const ethereum = (window as EthereumWindow).ethereum;
  if (ethereum) {
    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        return { address: accounts[0] };
      }
    } catch (error) {
      console.error('Failed to get connected wallet:', error);
    }
  }
  return null;
};

export const disconnectWallet = () => {
  console.log('Wallet disconnected.');
};
