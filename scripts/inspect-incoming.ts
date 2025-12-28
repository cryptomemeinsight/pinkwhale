import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_ENDPOINT = 'https://mainnet.helius-rpc.com/?api-key=9d093275-24c0-47b4-82f3-5c19c543e539';
const WALLET_ADDRESS = '3K2bFxQp5s7FgmXHbFvzgunLRzDnUL7vTVbwQAAWX3yr';

async function main() {
    const connection = new Connection(RPC_ENDPOINT);
    const pubKey = new PublicKey(WALLET_ADDRESS);

    console.log(`Checking incoming txs for: ${WALLET_ADDRESS}`);

    try {
        // Fetch last 50 transactions
        const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 50 });
        console.log(`Found ${signatures.length} recent transactions.`);
        
        const txs = await connection.getParsedTransactions(signatures.map(s => s.signature), { maxSupportedTransactionVersion: 0 });

        let totalIncoming = 0;

        txs.forEach((tx, i) => {
            if (!tx) return;

            const accountIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === WALLET_ADDRESS);
            if (accountIndex !== -1) {
                const pre = tx.meta?.preBalances[accountIndex] || 0;
                const post = tx.meta?.postBalances[accountIndex] || 0;

                // If Post > Pre, it's incoming SOL
                if (post > pre) {
                    const received = (post - pre) / LAMPORTS_PER_SOL;
                    totalIncoming += received;
                    console.log(`[${i}] Received: ${received.toFixed(4)} SOL | Sig: ${signatures[i].signature.slice(0,10)}...`);
                }
            }
        });

        console.log(`\nTotal Incoming (last 50 txs): ${totalIncoming.toFixed(4)} SOL`);

    } catch (e) {
        console.error("Error fetching txs:", e);
    }
}

main().catch(console.error);