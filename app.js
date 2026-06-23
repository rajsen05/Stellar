// DOM Elements
const disconnectedState = document.getElementById('disconnectedState');
const connectedState = document.getElementById('connectedState');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const copyBtn = document.getElementById('copyBtn');
const walletAddressText = document.getElementById('walletAddress');
const walletBalanceText = document.getElementById('walletBalance');
const networkNameText = document.getElementById('networkName');
const statusMessage = document.getElementById('statusMessage');
const messageText = statusMessage ? statusMessage.querySelector('.message-text') : null;

// App Global State
let currentAccount = null;

// Network Mapper for EVM chains
const getNetworkName = (chainId) => {
  const networks = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    17000: 'Holesky Testnet',
    5: 'Goerli Testnet',
    11155420: 'Optimism Sepolia',
    10: 'Optimism Mainnet',
    42161: 'Arbitrum One',
    421614: 'Arbitrum Sepolia',
    137: 'Polygon Mainnet',
    80002: 'Polygon Amoy Testnet',
    56: 'BNB Smart Chain',
    97: 'BSC Testnet',
    31337: 'Localhost (Hardhat)'
  };
  return networks[chainId] || `Chain ID ${chainId}`;
};

// Check if MetaMask is installed
const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== 'undefined';
};

// Format wallet address (0x1234...5678)
const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Display status alert message
const showStatus = (message, type = 'info') => {
  if (!statusMessage || !messageText) return;
  messageText.textContent = message;
  statusMessage.className = `status-box ${type}`;
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

// Hide status alert message
const hideStatus = () => {
  if (!statusMessage) return;
  statusMessage.className = 'status-box hidden';
};

// Fetch wallet balance from provider
const fetchBalance = async (address) => {
  try {
    const balanceWeiHex = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    // Parse Hex Wei balance to Eth float
    const balanceWei = BigInt(balanceWeiHex);
    const balanceEth = Number(balanceWei) / 1e18;
    
    // Display with 4 decimal precision
    walletBalanceText.textContent = `${balanceEth.toFixed(4)} ETH`;
  } catch (error) {
    console.error('Error fetching balance:', error);
    walletBalanceText.textContent = '--- ETH';
    showStatus('Failed to load wallet balance from MetaMask.', 'error');
  }
};

// Fetch active network details
const fetchNetwork = async () => {
  try {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    networkNameText.textContent = getNetworkName(chainId);
  } catch (error) {
    console.error('Error fetching network:', error);
    networkNameText.textContent = 'Unknown Network';
  }
};

// Update UI Layout based on Connection State
const updateUIState = (isConnected) => {
  if (isConnected) {
    disconnectedState.classList.add('hidden');
    disconnectedState.classList.remove('active');
    connectedState.classList.remove('hidden');
    connectedState.classList.add('active');
  } else {
    connectedState.classList.add('hidden');
    connectedState.classList.remove('active');
    disconnectedState.classList.remove('hidden');
    disconnectedState.classList.add('active');
    
    // Reset display values
    walletAddressText.textContent = '0x00...0000';
    walletBalanceText.textContent = '0.0000 ETH';
    networkNameText.textContent = '---';
  }
};

// Load details and update connected interface
const updateUIConnected = async (account) => {
  currentAccount = account;
  walletAddressText.textContent = formatAddress(currentAccount);
  
  await fetchBalance(currentAccount);
  await fetchNetwork();
  updateUIState(true);
};

// Primary Wallet Connection Action
const connectWallet = async () => {
  hideStatus();
  
  if (!isMetaMaskInstalled()) {
    showStatus('MetaMask is not detected. Please install the browser extension.', 'error');
    // Direct user to MetaMask download
    setTimeout(() => {
      window.open('https://metamask.io/download/', '_blank');
    }, 1500);
    return;
  }
  
  try {
    connectBtn.disabled = true;
    connectBtn.querySelector('span').textContent = 'Connecting...';
    
    // Trigger MetaMask request accounts popup
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    
    if (accounts.length > 0) {
      localStorage.setItem('isWalletConnected', 'true');
      await updateUIConnected(accounts[0]);
      showStatus('Wallet connected successfully.', 'info');
      setTimeout(hideStatus, 3000);
    }
  } catch (error) {
    console.error('Wallet connection error:', error);
    if (error.code === 4001) {
      showStatus('Connection request rejected by user.', 'error');
    } else {
      showStatus('An error occurred during wallet connection.', 'error');
    }
  } finally {
    connectBtn.disabled = false;
    connectBtn.querySelector('span').textContent = 'Connect Wallet';
  }
};

// Disconnect wallet locally (reset session state)
const disconnectWallet = () => {
  currentAccount = null;
  localStorage.removeItem('isWalletConnected');
  updateUIState(false);
  showStatus('Disconnected wallet session.', 'info');
  setTimeout(hideStatus, 3000);
};

// Copy Address helper function
const copyToClipboard = async () => {
  if (!currentAccount) return;
  
  try {
    await navigator.clipboard.writeText(currentAccount);
    
    // Visual success feedback
    const copyIcon = copyBtn.querySelector('i');
    copyIcon.setAttribute('data-lucide', 'check');
    copyBtn.style.color = 'var(--success-green)';
    copyBtn.style.borderColor = 'var(--success-green)';
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    setTimeout(() => {
      copyIcon.setAttribute('data-lucide', 'copy');
      copyBtn.style.color = '';
      copyBtn.style.borderColor = '';
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 2000);
  } catch (err) {
    console.error('Address copying failed:', err);
    showStatus('Failed to copy address.', 'error');
  }
};

// Check for existing connection on app initialize
const init = async () => {
  if (!isMetaMaskInstalled()) {
    showStatus('MetaMask browser extension is not detected. Please install MetaMask to interact.', 'info');
    return;
  }
  
  // Register MetaMask Event Listeners
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);
  
  const isPreviouslyConnected = localStorage.getItem('isWalletConnected') === 'true';
  if (isPreviouslyConnected) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await updateUIConnected(accounts[0]);
      } else {
        localStorage.removeItem('isWalletConnected');
      }
    } catch (error) {
      console.error('Error during auto-connect initialization:', error);
    }
  }
};

// Event Handler for Account switches
const handleAccountsChanged = async (accounts) => {
  if (accounts.length === 0) {
    // User locked wallet or disconnected from MetaMask details
    disconnectWallet();
  } else {
    await updateUIConnected(accounts[0]);
    showStatus('Wallet account switched.', 'info');
    setTimeout(hideStatus, 3000);
  }
};

// Event Handler for Chain switches
const handleChainChanged = async (chainIdHex) => {
  if (currentAccount) {
    // Dynamically update network name & balance without hard reloading
    await fetchNetwork();
    await fetchBalance(currentAccount);
    showStatus('Network connection changed.', 'info');
    setTimeout(hideStatus, 3000);
  }
};

// Event Listeners
connectBtn.addEventListener('click', connectWallet);
disconnectBtn.addEventListener('click', disconnectWallet);
copyBtn.addEventListener('click', copyToClipboard);

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', init);
