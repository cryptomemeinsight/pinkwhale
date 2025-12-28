
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Configuration
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=9d093275-24c0-47b4-82f3-5c19c543e539";
const WALLET_ADDRESS = "3K2bFxQp5s7FgmXHbFvzgunLRzDnUL7vTVbwQAAWX3yr";
const TOKEN_MINT = "BgLBeZz9SnHgLVHobQWsgdrjTSnW2mbtqJfMokEvpump";

async function main() {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const pubKey = new PublicKey(WALLET_ADDRESS);

  console.log(`Checking wallet: ${WALLET_ADDRESS}`);

  try {
    // 1. Get SOL Balance
    const balance = await connection.getBalance(pubKey);
    console.log(`SOL Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    // 2. Get Token Balance
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
      mint: new PublicKey(TOKEN_MINT),
    });

    if (tokenAccounts.value.length > 0) {
      const tokenAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      console.log(`$PINKWHALE Balance: ${tokenAmount.toLocaleString()}`);
    } else {
      console.log(`$PINKWHALE Balance: 0`);
    }

  } catch (error) {
    console.error("Error fetching wallet data:", error);
  }
}

main();
