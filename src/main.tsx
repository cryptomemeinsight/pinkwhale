import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletApp = () => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Mainnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => "https://mainnet.helius-rpc.com/?api-key=9d093275-24c0-47b4-82f3-5c19c543e539", []);

    const wallets = useMemo(
        () => [
            // Wallets that support the standard will be detected automatically
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <App />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletApp />
  </StrictMode>,
)
