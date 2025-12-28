import { Connection, Keypair, VersionedTransaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://mainnet.helius-rpc.com/?api-key=9d093275-24c0-47b4-82f3-5c19c543e539';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TARGET_TOKEN_MINT = 'BgLBeZz9SnHgLVHobQWsgdrjTSnW2mbtqJfMokEvpump'; // $PINKWHALE
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const MIN_BALANCE_THRESHOLD = 0.1; // Minimum SOL to trigger buyback
const RESERVE_SOL = 0.02; // SOL to keep for gas fees
const CHECK_INTERVAL = 60 * 1000 * 15; // Check every 15 minutes

async function main() {
    console.log("🐳 Starting PINKWHALE Buyback Bot...");

    if (!PRIVATE_KEY) {
        console.error("❌ PRIVATE_KEY is missing in .env file!");
        process.exit(1);
    }

    // Initialize Connection and Wallet
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    let wallet: Keypair;
    try {
        wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
        console.log(`🔑 Wallet loaded: ${wallet.publicKey.toString()}`);
    } catch (error) {
        console.error("❌ Invalid PRIVATE_KEY format. Must be Base58 string.");
        process.exit(1);
    }

    // Main Loop
    while (true) {
        try {
            await checkAndBuyback(connection, wallet);
        } catch (error) {
            console.error("⚠️ Error in main loop:", error);
        }

        console.log(`⏳ Waiting ${CHECK_INTERVAL / 1000} seconds for next check...`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
}

async function checkAndBuyback(connection: Connection, wallet: Keypair) {
    // 1. Check Balance
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`💰 Current Balance: ${solBalance.toFixed(4)} SOL`);

    if (solBalance < MIN_BALANCE_THRESHOLD) {
        console.log(`Running low on SOL. Threshold: ${MIN_BALANCE_THRESHOLD} SOL. Skipping buyback.`);
        return;
    }

    // Calculate Amount to Swap (All SOL - Reserve)
    const amountToSwap = solBalance - RESERVE_SOL;
    if (amountToSwap <= 0) {
        console.log("Not enough SOL after reserve.");
        return;
    }

    const amountInLamports = Math.floor(amountToSwap * LAMPORTS_PER_SOL);
    console.log(`🚀 Attempting to buy back with ${amountToSwap.toFixed(4)} SOL...`);

    // 2. Get Quote from Jupiter
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${TARGET_TOKEN_MINT}&amount=${amountInLamports}&slippageBps=50`;
    
    try {
        const quoteResponse = await fetch(quoteUrl);
        const quoteData = await quoteResponse.json();

        if (!quoteData || quoteData.error) {
            console.error("❌ Failed to get quote:", quoteData?.error || "Unknown error");
            return;
        }

        console.log(`📉 Quote received: ${quoteData.outAmount} units of PINKWHALE`);

        // 3. Get Swap Transaction
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteResponse: quoteData,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true,
            })
        });

        const swapData = await swapResponse.json();
        
        if (!swapData || !swapData.swapTransaction) {
            console.error("❌ Failed to get swap transaction");
            return;
        }

        // 4. Sign and Execute
        const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        transaction.sign([wallet]);

        const rawTransaction = transaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2
        });

        console.log(`✅ Transaction sent! TXID: ${txid}`);
        console.log(`View on Solscan: https://solscan.io/tx/${txid}`);

        // Optional: Confirm transaction
        const confirmation = await connection.confirmTransaction(txid, 'confirmed');
        if (confirmation.value.err) {
            console.error("❌ Transaction failed on-chain:", confirmation.value.err);
        } else {
            console.log("🎉 Buyback successful!");
        }

    } catch (error) {
        console.error("❌ Error executing swap:", error);
    }
}

// Run
main().catch(console.error);
