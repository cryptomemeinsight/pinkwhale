import { useState, useEffect } from 'react';
import Lenis from 'lenis';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Copy, Check, Search, Flame, Coins, Infinity, AlertTriangle, ExternalLink, Zap, Repeat } from 'lucide-react';

// Constants
const TOKEN_MINT_ADDRESS = "BgLBeZz9SnHgLVHobQWsgdrjTSnW2mbtqJfMokEvpump"; 
const CREATOR_WALLET_ADDRESS = "3K2bFxQp5s7FgmXHbFvzgunLRzDnUL7vTVbwQAAWX3yr";
const BITQUERY_ENDPOINT = "https://asia.streaming.bitquery.io/graphql";
const ELIGIBLE_PERCENTAGE = 0.5;
const INITIAL_SUPPLY = 1_000_000_000; // 1 Billion

function App() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [manualAddress, setManualAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokensBoughtBack, setTokensBoughtBack] = useState<number>(0); 
  const [totalCreatorFees, setTotalCreatorFees] = useState<number>(0); 
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Fetch Real-Time Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const creatorPubKey = new PublicKey(CREATOR_WALLET_ADDRESS);

        // 1. Fetch Tokens Bought Back (PINKWHALE held by Creator)
        let boughtBack = 0;
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(creatorPubKey, { mint: new PublicKey(TOKEN_MINT_ADDRESS) });
            if (tokenAccounts.value.length > 0) {
                boughtBack = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
            }
        } catch (e) {
            console.warn("Failed to fetch token balance:", e);
        }
        setTokensBoughtBack(boughtBack);

        // 2. Calculate Total SOL Fees (Current Balance + Total Spent - Initial Funding)
        const currentBalance = await connection.getBalance(creatorPubKey);
        const currentBalanceSol = currentBalance / LAMPORTS_PER_SOL;

        const signatures = await connection.getSignaturesForAddress(creatorPubKey, { limit: 100 });
        
        let totalSpent = 0;
        const INITIAL_FUNDING_AMOUNT = 0.2081;

        if (signatures.length > 0) {
            // Process transactions sequentially to avoid rate limits (429/403)
            for (const sig of signatures) {
                try {
                    const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
                    if (tx) {
                        const accountIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === CREATOR_WALLET_ADDRESS);
                        if (accountIndex !== -1) {
                            const pre = tx.meta?.preBalances[accountIndex] || 0;
                            const post = tx.meta?.postBalances[accountIndex] || 0;
                            const diff = (post - pre) / LAMPORTS_PER_SOL;
                            
                            // If diff is negative, we spent SOL
                            if (diff < 0) {
                                totalSpent += Math.abs(diff);
                            }
                        }
                    }
                    // Small delay to be nice to RPC
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (e) {
                    console.warn(`Failed to fetch tx ${sig.signature}:`, e);
                }
            }
        }
        
        // Calculate Fees: (Balance + Spent) - Initial Funding
        const fees = Math.max(0, (currentBalanceSol + totalSpent) - INITIAL_FUNDING_AMOUNT);
        setTotalCreatorFees(fees);

      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [connection]);


  const formatCompactNumber = (num: number) => {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toLocaleString();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(TOKEN_MINT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkEligibility = async (addressOverride?: string) => {
    const targetAddress = addressOverride || (publicKey ? publicKey.toString() : null);
    
    if (!targetAddress) return;

    // Validate address format
    let pubKeyObj: PublicKey;
    try {
        pubKeyObj = new PublicKey(targetAddress);
    } catch (e) {
        alert("Invalid Solana address");
        return;
    }

    setChecking(true);
    setHasChecked(false);

    try {
        console.log("Checking balance for", targetAddress);
        
        const accounts = await connection.getParsedTokenAccountsByOwner(pubKeyObj, {
          mint: new PublicKey(TOKEN_MINT_ADDRESS)
        });

        let foundBalance = 0;
        if (accounts.value.length > 0) {
          accounts.value.forEach(account => {
            foundBalance += account.account.data.parsed.info.tokenAmount.uiAmount || 0;
          });
        }
        
        setBalance(foundBalance);
        setHasChecked(true);

    } catch (error) {
        console.error("Error checking balance:", error);
        setBalance(0); 
        setHasChecked(true);
    } finally {
        setChecking(false);
    }
  };

  const isEligible = balance !== null && (balance / INITIAL_SUPPLY) * 100 >= ELIGIBLE_PERCENTAGE;

  return (
    <div className="min-h-screen flex flex-col items-center">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-pinkwhale-pink/10 blur-[150px] rounded-full animate-pulse-fast" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-pinkwhale-cyan/10 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] bg-purple-900/20 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-8 md:px-12 py-8 flex flex-col items-center">
        
        {/* Navbar / Top Bar */}
        <nav className="w-full flex justify-between items-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="text-2xl font-display font-black tracking-tighter text-white">
                PINK<span className="text-pinkwhale-pink">WHALE</span>
            </div>
            <div className="flex gap-4">
                <a href="https://x.com/PINKWHALECOIN" target="_blank" className="p-2 bg-white/5 rounded-full hover:bg-pinkwhale-pink/20 transition-colors text-gray-400 hover:text-white"><ExternalLink size={20} /></a>
            </div>
        </nav>

        {/* Hero Section */}
        <header className="text-center mb-16 relative w-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-pinkwhale-pink/5 via-transparent to-pinkwhale-cyan/5 blur-3xl -z-10 rounded-full" />
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6 animate-in fade-in zoom-in duration-500">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <span className="text-xs font-mono text-gray-300 tracking-wider">LIVE ON SOLANA MAINNET</span>
          </div>

          <div className="mb-0 animate-in fade-in zoom-in duration-700 delay-100">
              <img src="/main_img.gif" alt="Pink Whale" className="w-72 md:w-[500px] mx-auto object-contain drop-shadow-[0_0_30px_rgba(255,0,170,0.4)]" />
          </div>

          <h1 className="text-7xl md:text-9xl font-display font-black tracking-tighter text-white mb-2 leading-[0.9] neon-text animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            PINK<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-pinkwhale-pink to-pinkwhale-cyan">WHALE</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 font-body font-light tracking-wide max-w-2xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            The automated buyback machine. <span className="text-pinkwhale-pink font-bold">Are You In The Pod?</span>
          </p>
        </header>

        {/* Contract Address Bar */}
        <div className="w-full max-w-3xl mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="glass-panel rounded-2xl p-2 flex flex-col md:flex-row items-center gap-2 md:gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-pinkwhale-pink/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="px-4 py-2 bg-black/40 rounded-xl flex-1 w-full text-center md:text-left">
                    <span className="text-xs text-gray-500 font-mono uppercase mr-2">CA:</span>
                    <code className="font-mono text-pinkwhale-pink text-sm md:text-base break-all">{TOKEN_MINT_ADDRESS}</code>
                </div>
                
                <button 
                    onClick={copyToClipboard}
                    className="w-full md:w-auto px-6 py-3 bg-white/5 hover:bg-pinkwhale-pink hover:text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
            </div>
            <div className="flex justify-center mt-4 gap-2 text-sm font-mono text-gray-500">
                <Flame size={14} className="text-pinkwhale-pink animate-pulse" />
                <span>
                    {loadingStats ? (
                        <span className="animate-pulse">LOADING...</span>
                    ) : (
                        `${totalCreatorFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL COLLECTED SO FAR`
                    )}
                </span>
            </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full mb-24">
            
            {/* Left Col: Pod Checker (Span 7) */}
            <div className="md:col-span-7 animate-in fade-in slide-in-from-left-8 duration-700 delay-400">
                <div className="glass-panel rounded-3xl p-8 md:p-10 h-full border-t-4 border-t-pinkwhale-pink relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Search size={120} />
                    </div>

                    <h2 className="text-3xl font-display mb-2">POD CHECKER</h2>
                    <p className="text-gray-400 mb-8">Verify your wallet eligibility for rewards.</p>

                    <div className="space-y-6 relative z-10">
                        <div className="flex flex-col gap-4">
                             {!hasChecked ? (
                                <>
                                    <input 
                                        type="text" 
                                        placeholder="Paste Wallet Address..." 
                                        value={manualAddress}
                                        onChange={(e) => setManualAddress(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-pinkwhale-pink transition-colors font-mono text-lg"
                                    />
                                    <button 
                                        onClick={() => checkEligibility(manualAddress)}
                                        disabled={checking || (!manualAddress && !connected)}
                                        className="w-full bg-gradient-to-r from-pinkwhale-pink to-pink-600 hover:brightness-110 text-white font-display text-xl py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(255,0,170,0.3)] hover:shadow-[0_0_30px_rgba(255,0,170,0.5)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {checking ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <Search size={24} />}
                                        {checking ? 'SCANNING CHAIN...' : 'CHECK STATUS'}
                                    </button>
                                    
                                    <div className="relative py-2">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#13132b] px-2 text-gray-500">or connect</span></div>
                                    </div>

                                    <div className="flex justify-center">
                                         <WalletMultiButton className="!bg-white/5 hover:!bg-white/10 !transition-colors !rounded-xl !h-12 !w-full !justify-center !font-display" />
                                    </div>
                                </>
                             ) : (
                                <div className="bg-black/40 rounded-2xl p-6 border border-white/10 animate-in fade-in zoom-in duration-300 text-center">
                                    {isEligible ? (
                                        <>
                                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Check size={40} className="text-green-400" />
                                            </div>
                                            <h3 className="text-3xl font-display text-green-400 mb-2">YOU'RE IN THE POD!</h3>
                                            <p className="text-gray-300 font-mono text-lg">{balance?.toLocaleString()} $PINKWHALE</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <AlertTriangle size={40} className="text-red-400" />
                                            </div>
                                            <h3 className="text-3xl font-display text-gray-400 mb-2">NOT ELIGIBLE</h3>
                                            <p className="text-gray-500 font-mono mb-4">{balance?.toLocaleString()} $PINKWHALE</p>
                                            <a href="https://pump.fun/coin/BgLBeZz9SnHgLVHobQWsgdrjTSnW2mbtqJfMokEvpump" target="_blank" className="text-pinkwhale-pink hover:underline text-sm uppercase font-bold">Buy More to Join &rarr;</a>
                                        </>
                                    )}
                                    <button onClick={() => setHasChecked(false)} className="mt-6 text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest">Reset</button>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Col: Stats (Span 5) */}
            <div className="md:col-span-5 flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-500">
                
                {/* Fees Collected Stat */}
                <div className="glass-panel rounded-3xl p-8 flex-1 border-l-4 border-l-pinkwhale-cyan relative group hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute top-4 right-4 text-pinkwhale-cyan opacity-20 group-hover:opacity-100 transition-opacity">
                        <Flame size={32} />
                    </div>
                    <h3 className="text-gray-400 font-mono text-sm uppercase mb-2">Total Fees Collected</h3>
                    {loadingStats ? (
                        <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
                    ) : (
                        <p className="text-4xl font-display text-white">{totalCreatorFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL</p>
                    )}
                    <div className="mt-4 text-xs text-gray-500">
                        Fees collected from Pump.fun
                    </div>
                </div>

                {/* Buyback Stat */}
                <div className="glass-panel rounded-3xl p-8 flex-1 border-l-4 border-l-pinkwhale-pink relative group hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute top-4 right-4 text-pinkwhale-pink opacity-20 group-hover:opacity-100 transition-opacity">
                        <Repeat size={32} />
                    </div>
                    <h3 className="text-gray-400 font-mono text-sm uppercase mb-2">Total Bought Back</h3>
                    {loadingStats ? (
                        <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
                    ) : (
                        <p className="text-4xl font-display text-white">{formatCompactNumber(tokensBoughtBack)} $PINKWHALE</p>
                    )}
                    <div className="mt-4 text-xs text-gray-500">
                        Tokens bought back by the protocol.
                    </div>
                </div>

            </div>
        </div>

        {/* How It Works Section - Clean Grid */}
        <section className="w-full mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-600">
            <h2 className="text-center text-4xl font-display mb-12">SYSTEM MECHANICS</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
                <div className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 bg-pinkwhale-pink/20 rounded-lg flex items-center justify-center mb-6 text-pinkwhale-pink">
                        <Zap size={24} />
                    </div>
                    <h3 className="text-xl font-display mb-3">1. AUTO-BUYBACK</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Every 15 minutes, the protocol uses fees to buy $PINKWHALE from the open market, creating constant buy pressure.
                    </p>
                </div>

                <div className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 bg-pinkwhale-cyan/20 rounded-lg flex items-center justify-center mb-6 text-pinkwhale-cyan">
                        <Flame size={24} />
                    </div>
                    <h3 className="text-xl font-display mb-3">2. ETERNAL BURN</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Bought tokens are not kept. They are sent to the burn address, permanently reducing the total supply.
                    </p>
                </div>

                <div className="glass-panel p-8 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6 text-purple-400">
                        <Coins size={24} />
                    </div>
                    <h3 className="text-xl font-display mb-3">3. HOLDER REWARDS</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Surplus SOL is air-dropped directly to wallets holding ≥0.5% of the supply. No claiming required.
                    </p>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-white/5 pt-12 pb-8 flex flex-col items-center">
            <div className="flex gap-4 mb-8">
                <a href="https://dexscreener.com/solana/879fuui2qf1JqA8TqCWDBRUEsvgnjgb7EHVBvjzLy8Bd" target="_blank" className="px-6 py-2 rounded-full bg-white/5 hover:bg-pinkwhale-pink hover:text-white transition-colors font-display text-sm uppercase">DexScreener</a>
                <a href="https://pump.fun/coin/BgLBeZz9SnHgLVHobQWsgdrjTSnW2mbtqJfMokEvpump" target="_blank" className="px-6 py-2 rounded-full bg-white/5 hover:bg-green-500 hover:text-white transition-colors font-display text-sm uppercase">Pump.fun</a>
                <a href="https://t.me/pinkwhalecoin" target="_blank" className="px-6 py-2 rounded-full bg-white/5 hover:bg-blue-500 hover:text-white transition-colors font-display text-sm uppercase">Telegram</a>
            </div>
            
            <p className="text-gray-600 text-xs text-center max-w-xl leading-relaxed">
                $PINKWHALE has no intrinsic value. It is a community experiment on Solana. 
                Do not risk money you cannot afford to lose.
            </p>
            <p className="text-gray-700 text-[10px] mt-4 font-mono">© 2025 PINK WHALE PROTOCOL</p>
        </footer>

      </div>
    </div>
  )
}

export default App
