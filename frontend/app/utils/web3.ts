type EthereumWindow = typeof window & {
  ethereum?: {
    request: (args: { method: string }) => Promise<string[]>;
  };
};

export const connectWallet = async () => {
  const ethereum = (window as EthereumWindow).ethereum;
  if (ethereum) {
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      return { address: accounts[0] };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  } else {
    console.error('MetaMask is not installed.');
    return null;
  }
};

export const disconnectWallet = () => {
  console.log('Wallet disconnected.');
};
