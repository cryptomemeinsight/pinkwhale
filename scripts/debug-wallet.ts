
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const WALLET = "3K2bFxQp5s7FgmXHbFvzgunLRzDnUL7vTVbwQAAWX3yr";
// const RPC = "https://api.mainnet-beta.solana.com"; 
const RPC = "https://mainnet.helius-rpc.com/?api-key=9d093275-24c0-47b4-82f3-5c19c543e539"; // Using the one from .env.example for reliability

async function main() {
    const connection = new Connection(RPC);
    const pubKey = new PublicKey(WALLET);

    console.log(`Analyzing wallet: ${WALLET}`);

    // 1. Check Balance
    const balance = await connection.getBalance(pubKey);
    console.log(`Current Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // 2. Check Recent Transactions
    console.log("Fetching recent signatures...");
    const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 100 });
    
    console.log(`Found ${signatures.length} recent transactions.`);

    let totalIncoming = 0;
    let totalOutgoing = 0;

    for (const sig of signatures) {
        const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx) continue;

        const accountIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === WALLET);
        if (accountIndex === -1) continue;

        const pre = tx.meta?.preBalances[accountIndex] || 0;
        const post = tx.meta?.postBalances[accountIndex] || 0;
        const diff = (post - pre) / LAMPORTS_PER_SOL;

        if (diff > 0) {
            console.log(`+ Received ${diff.toFixed(4)} SOL in ${sig.signature}`);
            totalIncoming += diff;
        } else if (diff < 0) {
            // console.log(`- Sent/Spent ${Math.abs(diff).toFixed(4)} SOL in ${sig.signature}`);
            totalOutgoing += Math.abs(diff);
        }
    }

    console.log(`Total Incoming (last 100 txs): ${totalIncoming.toFixed(4)} SOL`);
    console.log(`Total Outgoing (last 100 txs): ${totalOutgoing.toFixed(4)} SOL`);
    console.log(`Calculated Balance (In - Out): ${(totalIncoming - totalOutgoing).toFixed(4)} SOL`);
}

main().catch(console.error);
