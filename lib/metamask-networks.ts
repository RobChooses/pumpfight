export const CHILIZ_MAINNET = {
  chainId: '0x15B38', // 88888 in hex
  chainName: 'Chiliz Chain',
  nativeCurrency: {
    name: 'Chiliz',
    symbol: 'CHZ',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.ankr.com/chiliz'],
  blockExplorerUrls: ['https://chiliscan.com/'],
};

export const CHILIZ_SPICY = {
  chainId: '0x15B32', // 88882 in hex
  chainName: 'Chiliz Spicy Testnet',
  nativeCurrency: {
    name: 'Chiliz',
    symbol: 'CHZ',
    decimals: 18,
  },
  rpcUrls: ['https://spicy-rpc.chiliz.com'],
  blockExplorerUrls: ['https://testnet.chiliscan.com/'],
};

export const addChilizNetworksToMetaMask = async () => {
  if (!window.ethereum) {
    console.error('MetaMask not detected');
    return;
  }

  try {
    // Add Chiliz Mainnet
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [CHILIZ_MAINNET],
    });

    // Add Chiliz Spicy Testnet
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [CHILIZ_SPICY],
    });

    console.log('✅ Chiliz networks added to MetaMask');
  } catch (error) {
    console.error('❌ Error adding Chiliz networks to MetaMask:', error);
  }
};