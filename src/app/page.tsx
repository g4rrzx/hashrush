"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import sdk, { type Context } from "@farcaster/frame-sdk";
import { Zap, ShoppingBag, Trophy, Power, Ticket, Coins, Cpu, Share2, Gift, Wallet, Target, User, Clock, ArrowDownToLine, Settings, Moon, Sun, Bell, BellOff, Sparkles, Package, DollarSign, RotateCw, UserPlus, Copy } from "lucide-react";
import { ethers } from "ethers";
import { Attribution } from "ox/erc8021";

const OWNER_ADDRESS = "0xe0E8222404BFb2Bf10B3A38A758b0Cff0336cd5B"; // Checksummed Verified
const CONTRACT_ADDRESS = "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63";
const REWARD_AMOUNT = 20; // 20 DEGEN
const CLAIM_FEE_ETH = "0x2BA7DEF3000"; // 0.000003 ETH = 3,000,000,000,000 wei
const REWARD_SYMBOL = "DEGEN";
const MIN_HP_REDEEM = 5000;
const BUILDER_CODE = "bc_8io601u8"; // REPLACE WITH YOUR CODE
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] });

const CONTRACT_ABI = [
  "function claimPoints(uint256 amount) external",
  "function buyHardware(string itemId) external payable",
  "function redeemRewards(uint256 hpAmount) external",
  "function canRedeem(address user) external view returns (bool, string memory)",
  "function getRemainingCooldown(address user) external view returns (uint256)",
  "function getPoolBalance() external view returns (uint256)",
  "function getUserStats(address user) external view returns (uint256, uint256, uint256, uint256)",
  "function rewardAmount() external view returns (uint256)",
  "function rewardToken() external view returns (address)"
];

type Tab = 'mine' | 'store' | 'rank' | 'profile';

const SPIN_REWARDS = [
  { label: "+50 HP", value: 50, type: 'points', icon: '✨', color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { label: "+1 Ticket", value: 1, type: 'ticket', icon: '🎫', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { label: "+100 HP", value: 100, type: 'points', icon: '⚡', color: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { label: "+10 MH/s", value: 10, type: 'boost', icon: '🚀', color: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  { label: "+200 HP", value: 200, type: 'points', icon: '💎', color: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { label: "+2 Tickets", value: 2, type: 'ticket', icon: '🎟️', color: 'linear-gradient(135deg, #ec4899, #db2777)' },
  { label: "+500 HP", value: 500, type: 'points', icon: '👑', color: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
  { label: "+50 MH/s", value: 50, type: 'boost', icon: '🔥', color: 'linear-gradient(135deg, #ef4444, #dc2626)' },
];

const BADGES = [
  { id: 'first1k', icon: '🏅', label: 'First 1K HP', check: (p: number) => p >= 1000 },
  { id: 'streak7', icon: '🔥', label: '7-Day Streak', check: (_: number, s: number) => s >= 7 },
  { id: 'top50', icon: '🏆', label: 'Top 50', check: () => false },
  { id: 'whale', icon: '🐋', label: '10K Club', check: (p: number) => p >= 10000 },
  { id: 'tapper', icon: '👆', label: 'Tap Master', check: () => false },
];

const HARDWARE_ITEMS = [
  { id: 'starter', name: 'Starter GPU', boost: 10, price: '0.0005', icon: '💻', hpCap: 2000 },
  { id: 'turbo', name: 'Turbo Rig', boost: 50, price: '0.001', icon: '⚡', hpCap: 3500 },
  { id: 'farm', name: 'Mining Farm', boost: 200, price: '0.003', icon: '🏭', hpCap: 6000 },
  { id: 'quantum', name: 'Quantum Core', boost: 500, price: '0.005', icon: '🔮', hpCap: 10000 },
];

const getTier = (hp: number) => {
  if (hp >= 50000) return { name: 'Diamond', icon: '💎', class: 'tier-diamond' };
  if (hp >= 10000) return { name: 'Gold', icon: '🥇', class: 'tier-gold' };
  if (hp >= 1000) return { name: 'Silver', icon: '🥈', class: 'tier-silver' };
  return { name: 'Bronze', icon: '🥉', class: 'tier-bronze' };
};

const playKaching = () => {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhXWx9jJy2romZqZF0dH2TpqqhiHB2hZenrqKPgn55f4qWoJmLfXh8hZGak5CDe3p8g42VkIV8dnJ1fYiSkIqAd3J0e4WQko6GfnZzeH+Ij5CLhX54dHZ9hoyOi4V+eXZ3fIOJjImFf3t4d3uBhoqIhYF8eXd5fYSHh4WBfXp4eX2BhYaFgn57eXl7f4ODg4F+e3l5e36BgoKBf3x6eXp8f4GBgH98e3l5e36AgIB/fXt6enx+f4CAfn17enp7fX5/f358e3p6e31+fn5+fHt6ent8fX5+fXx7enp7fH1+fnx8e3p6e3x9fX18fHt6ent8fX19fHx7enp7fHx9fXx8e3p6e3x8fHx8e3t6ent8fHx8fHt7enp7fHx8fHx7e3p6e3t8fHx8e3t6enp7e3x8fHt7e3p6e3t7fHx8e3t7enp7e3t8e3t7e3p6e3t7e3t7e3t7enp7e3t7e3t7e3t6ent7e3t7e3t7e3p6e3t7e3t7');
    audio.volume = 0.3;
    audio.play().catch(() => { });
  } catch { }
};

const getJackpotTime = () => {
  const now = new Date();
  const nextMonthly = new Date(now);
  // Set to 1st of next month
  nextMonthly.setUTCMonth(now.getUTCMonth() + 1);
  nextMonthly.setUTCDate(1);
  nextMonthly.setUTCHours(20, 0, 0, 0);
  return nextMonthly.getTime() - now.getTime();
};

const getStreakResetTime = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
};

type Transaction = { type: 'claim' | 'buy' | 'spin' | 'game' | 'redeem'; amount: string; time: number };
type OwnedHardware = { id: string; count: number; totalBoost: number };

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddFavorite, setShowAddFavorite] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [points, setPoints] = useState(0);
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [mining, setMining] = useState(true);
  const [context, setContext] = useState<Context.MiniAppContext>();
  const [inventory, setInventory] = useState({ tickets: 0, tokens: 0, rigs: 1, spins: 0 });
  const [ownedHardware, setOwnedHardware] = useState<OwnedHardware[]>([{ id: 'starter', count: 1, totalBoost: 10 }]);
  const [hashRate, setHashRate] = useState(10);

  // Dynamic HP cap: highest cap among all rigs the user owns. Default 1000 if no rig.
  const maxHp = ownedHardware.length > 0
    ? Math.max(...ownedHardware.map(h => HARDWARE_ITEMS.find(hw => hw.id === h.id)?.hpCap ?? 1000))
    : 1000;
  const [tab, setTab] = useState<Tab>('mine');
  const [showWelcome, setShowWelcome] = useState(false);
  const [offlineGain, setOfflineGain] = useState(0);
  const [streak, setStreak] = useState(1);
  const [streakResetTime, setStreakResetTime] = useState(getStreakResetTime());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [lastMilestone, setLastMilestone] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<{ fid: string, name: string, score: number, tier: string, pfpUrl?: string }[]>([]);

  // --- Real-time Leaderboard Sync ---
  const syncScore = useCallback(async () => {
    if (!context?.user?.fid) return;

    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: context.user.fid,
          username: context.user.username,
          score: Math.floor(totalEarned + balance),
          tier: getTier(totalEarned + balance).name,
          pfpUrl: context.user.pfpUrl || null
        })
      });
      console.log('Score synced:', totalEarned + balance);
    } catch (e) {
      console.error('Score sync failed', e);
    }
  }, [context, totalEarned, balance]);

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaderboardData(data);
        console.log('Leaderboard loaded:', data.length, 'players');
      }
    } catch (e) {
      console.error('Leaderboard fetch failed', e);
    }
  };

  // Sync score ONCE on initial app load only
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);

  useEffect(() => {
    if (isLoading || !context?.user?.fid || hasSyncedOnce) return;

    // Sync ONLY ONCE on first load
    syncScore();
    fetchLeaderboard();
    setHasSyncedOnce(true);
  }, [isLoading, context, hasSyncedOnce]);

  // Fetch leaderboard when opening rank tab, also sync to update pfpUrl
  useEffect(() => {
    if (tab === 'rank') {
      syncScore(); // Sync to update pfpUrl in database
      fetchLeaderboard();
    }
  }, [tab, syncScore]);

  // Sync score only when user claims/earns significant points (not periodically)
  // This will be called manually after claim actions
  const [jackpotTime, setJackpotTime] = useState(getJackpotTime());
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<typeof SPIN_REWARDS[0] | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationToken, setNotificationToken] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<{ icon: string; text: string } | null>(null);
  const [showHardware, setShowHardware] = useState(false);

  // Redeem Celebration Modal State
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemStep, setRedeemStep] = useState<'confirm' | 'sending' | 'success' | 'error'>('confirm');
  const [redeemResult, setRedeemResult] = useState<{ degenSent?: number; txHash?: string; error?: string } | null>(null);

  // Claim Points Celebration Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimStep, setClaimStep] = useState<'confirm' | 'paying' | 'verifying' | 'success' | 'error'>('confirm');
  const [claimResult, setClaimResult] = useState<{ claimed?: number; newBalance?: number; txHash?: string; error?: string } | null>(null);

  // Rig Purchase Modal State
  const [showBuyModal, setShowBuyModal] = useState<'preview' | 'buying' | 'success' | null>(null);
  const [buyPreviewItem, setBuyPreviewItem] = useState<typeof HARDWARE_ITEMS[0] | null>(null);
  const [buySuccessData, setBuySuccessData] = useState<{ item: typeof HARDWARE_ITEMS[0]; oldHashRate: number; newHashRate: number } | null>(null);

  // Wallet connection
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCorrectChain, setIsCorrectChain] = useState(false);
  const BASE_CHAIN_ID = "0x2105"; // Base Mainnet = 8453 = 0x2105

  const [showTapGame, setShowTapGame] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimeLeft, setTapTimeLeft] = useState(10);
  const [tapGameActive, setTapGameActive] = useState(false);
  const [lastTapGameDate, setLastTapGameDate] = useState<string | null>(null);
  const [canPlayTapGame, setCanPlayTapGame] = useState(false); // Default false, set true after load check
  const [contractPoolBalance, setContractPoolBalance] = useState<string>('0');
  const [userCooldown, setUserCooldown] = useState<number>(0);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralList, setReferralList] = useState<string[]>([]);

  const pointsRef = useRef(points);
  const prevBadgesRef = useRef<string[]>([]);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const showToast = (icon: string, text: string) => {
    setToast({ icon, text });
    setTimeout(() => setToast(null), 3000);
  };

  const haptic = useCallback((type: 'light' | 'medium' | 'heavy') => {
    try { sdk.haptics.impactOccurred(type); } catch { }
  }, []);

  // Connect wallet — also enrolls user in Neon DB
  const connectWallet = async () => {
    haptic('medium');
    try {
      const accounts = await sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      }) as string[];

      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setWalletAddress(addr);
        setWalletConnected(true);

        // Check chain
        const chainId = await sdk.wallet.ethProvider.request({
          method: 'eth_chainId'
        }) as string;

        if (chainId === BASE_CHAIN_ID) {
          setIsCorrectChain(true);
          showToast('✅', 'Wallet connected!');
        } else {
          setIsCorrectChain(false);
          await switchToBase();
        }

        // Enroll/update user in Neon DB with wallet address
        if (context?.user?.fid) {
          try {
            await fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid: String(context.user.fid),
                walletAddress: addr,
                username: context.user.username,
                pfpUrl: context.user.pfpUrl,
              })
            });
          } catch (e) { console.error('User enroll failed', e); }
        }
      }
    } catch (error) {
      console.error('Connect error:', error);
      showToast('❌', 'Connection failed');
    }
  };

  // Switch to Base Mainnet
  const switchToBase = async () => {
    try {
      await sdk.wallet.ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }]
      });
      setIsCorrectChain(true);
      showToast('🔵', 'Switched to Base!');
    } catch (switchError: unknown) {
      // Chain not added, try to add it
      if ((switchError as { code?: number })?.code === 4902) {
        try {
          await sdk.wallet.ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
          setIsCorrectChain(true);
        } catch (addError) {
          console.error('Add chain error:', addError);
          showToast('❌', 'Please add Base network');
        }
      }
    }
  };

  // Check wallet on load & Auto-Connect
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const accounts = await sdk.wallet.ethProvider.request({
          method: 'eth_accounts'
        }) as string[];

        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);

          const chainId = await sdk.wallet.ethProvider.request({
            method: 'eth_chainId'
          }) as string;
          setIsCorrectChain(chainId === BASE_CHAIN_ID);
        } else {
          // Auto-connect attempt if context is ready
          if (context) {
            connectWallet();
          }
        }
      } catch { }
    };

    if (!isLoading && context) checkWallet();
  }, [isLoading, context, BASE_CHAIN_ID]);

  // Load redeem cooldown from server (not from contract anymore)
  // Cooldown is now based on DB last_redeem_at, loaded in the user data init below

  // Local cooldown countdown (tick every second for real-time display)
  useEffect(() => {
    if (userCooldown <= 0) return;

    const timer = setInterval(() => {
      setUserCooldown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [userCooldown > 0]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually saved a preference
      const savedPref = localStorage.getItem('hr_v12');
      if (!savedPref) {
        setDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Handle Referral on Load — SERVER-AUTHORITATIVE
  useEffect(() => {
    if (isLoading || !context?.user?.fid) return;

    const urlParams = new URLSearchParams(window.location.search);
    const sdkContext = context as any;
    const contextSearch = sdkContext?.location?.search || '';
    const contextParams = contextSearch ? new URLSearchParams(contextSearch) : null;
    const ref = urlParams.get('ref') || contextParams?.get('ref');

    if (ref && ref !== String(context.user.fid)) {
      // Call server — server checks duplicates in DB, NOT localStorage
      fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviterFid: ref,
          inviteeFid: String(context.user.fid),
          inviteeUsername: context.user.username
        })
      })
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            // Server confirmed this is a NEW referral — update local state from DB
            setBalance(b => b + 500);
            setTotalEarned(t => t + 500);
            showToast('🎁', 'Referral Bonus: +500 HP!');
            haptic('heavy');
            triggerConfetti();
            console.log('[referral] New referral registered:', ref);
          } else {
            // Already referred or invalid — do NOT give bonus
            console.log('[referral] Skipped:', json.message || json.error);
          }
        })
        .catch(console.error);
    }
  }, [isLoading, context]);

  // Fetch referral stats (read-only, no local bonus — server already handles it in DB)
  useEffect(() => {
    const fetchReferralStats = async () => {
      if (!context?.user?.fid) return;
      try {
        const res = await fetch(`/api/referral?fid=${context.user.fid}`);
        const data = await res.json();
        if (data.count !== undefined) setReferralCount(data.count);
        if (data.referrals) setReferralList(data.referrals);
      } catch (e) {
        console.error('Referral stats failed', e);
      }
    };

    if (!isLoading && context?.user?.fid) {
      fetchReferralStats();
    }
  }, [tab, context, isLoading]);

  const getReferralLink = () => {
    const fid = context?.user?.fid || '0';
    // Use domain-based URL for client-agnostic compatibility
    const referralUrl = `https://hashrush.vercel.app?ref=${fid}`;
    return referralUrl;
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    showToast('📋', 'Link copied!');
    haptic('medium');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setJackpotTime(getJackpotTime());
      setStreakResetTime(getStreakResetTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, mins };
  };

  const formatStreakReset = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  // Check badges
  useEffect(() => {
    const newBadges = BADGES.filter(b => b.check(totalEarned, streak)).map(b => b.id);
    const allBadges = [...new Set([...unlockedBadges, ...newBadges])];

    // Check for newly unlocked badges
    const justUnlocked = allBadges.filter(b => !prevBadgesRef.current.includes(b));
    if (justUnlocked.length > 0 && prevBadgesRef.current.length > 0) {
      const badge = BADGES.find(b => b.id === justUnlocked[0]);
      if (badge) {
        showToast(badge.icon, `${badge.label} Unlocked!`);
        triggerConfetti();
        haptic('heavy');
      }
    }

    prevBadgesRef.current = allBadges;
    setUnlockedBadges(allBadges);
  }, [totalEarned, streak, haptic]);

  useEffect(() => {
    const milestone = Math.floor(points / 100) * 100;
    if (milestone > lastMilestone && soundEnabled && milestone > 0) {
      playKaching();
      setLastMilestone(milestone);
    }
  }, [points, lastMilestone, soundEnabled]);

  // --- SERVER SYNC LOGIC ---

  const saveToServer = useCallback(async (data: any) => {
    if (!context?.user?.fid) return;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: context.user.fid,
          data: {
            ...data,
            username: context.user.username,
            pfpUrl: context.user.pfpUrl,
            tier: getTier(data.totalEarned).name
          }
        })
      });
      // console.log('Progress saved to server');
    } catch (e) {
      console.error('Save to server failed', e);
    }
  }, [context]);

  // Signal ready IMMEDIATELY on mount (must not wait for context)
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // Load context separately
  useEffect(() => {
    const init = async () => {
      const ctx = await sdk.context;
      setContext(ctx);
    };
    if (sdk && !context) init();
  }, [context]);

  // Load data from Neon DB (server-authoritative)
  useEffect(() => {
    if (!context?.user?.fid || !isLoading) return;

    const loadData = async () => {
      const fid = String(context.user.fid);

      // 1. Upsert user in Neon DB (create if new, or fetch existing)
      try {
        const res = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid,
            username: context.user.username,
            pfpUrl: context.user.pfpUrl,
          })
        });
        const json = await res.json();

        if (json.success && json.user) {
          const serverUser = json.user;
          console.log('[secure] Loaded from Neon DB:', serverUser);

          // Calculate offline mining gain based on SERVER hashrate
          const lastMineAt = serverUser.lastMineAt ? new Date(serverUser.lastMineAt).getTime() : Date.now();
          const elapsed = Math.min((Date.now() - lastMineAt) / 1000, 86400 * 3); // Max 3 days
          const gain = (serverUser.hashRate / 1000) * elapsed;

          // Apply state from server — server is source of truth
          // Cap at the highest hpCap from user's rigs (or 1000 if none)
          const loadMaxHp = serverUser.ownedHardware && serverUser.ownedHardware.length > 0
            ? Math.max(...serverUser.ownedHardware.map((h: any) => HARDWARE_ITEMS.find(hw => hw.id === h.id)?.hpCap ?? 1000))
            : 1000;
          const totalPoints = Math.min(serverUser.points + gain, loadMaxHp);
          setPoints(totalPoints);
          pointsRef.current = totalPoints;
          setBalance(serverUser.balance);
          setTotalEarned(serverUser.totalEarned);
          setHashRate(serverUser.hashRate); // from server (based on rigs in DB)
          setStreak(serverUser.streak);
          setLastMilestone(Math.floor(totalPoints / 100) * 100);

          // Load redeem cooldown from DB (24h since last_redeem_at)
          if (serverUser.lastRedeemAt) {
            const lastRedeem = new Date(serverUser.lastRedeemAt).getTime();
            const cooldownEnd = lastRedeem + 24 * 3600 * 1000; // 24h after last redeem
            const remaining = Math.max(0, Math.floor((cooldownEnd - Date.now()) / 1000));
            setUserCooldown(remaining);
            console.log('[cooldown] Loaded from DB:', remaining, 'seconds remaining');
          }

          // Owned hardware from server rigs
          if (serverUser.ownedHardware && serverUser.ownedHardware.length > 0) {
            setOwnedHardware(serverUser.ownedHardware);
            const totalRigs = serverUser.ownedHardware.reduce((s: number, r: any) => s + r.count, 0);
            setInventory(i => ({ ...i, rigs: Math.max(1, totalRigs) }));
          }

          if (gain > 0) setOfflineGain(gain);

          // Load local-only prefs (dark mode, sound — not security critical)
          try {
            const local = localStorage.getItem('hr_prefs_v1');
            if (local) {
              const prefs = JSON.parse(local);
              setDarkMode(prefs.darkMode ?? false);
              setSoundEnabled(prefs.soundEnabled !== false);
              setNotificationsEnabled(prefs.notificationsEnabled ?? false);
              if (prefs.transactions) setTransactions(prefs.transactions);
              if (prefs.badges) { setUnlockedBadges(prefs.badges); prevBadgesRef.current = prefs.badges; }
            }
          } catch { }

        } else {
          // New user — show onboarding
          setShowOnboarding(true);
          console.log('[secure] No existing user, showing onboarding');
        }
      } catch (e) {
        console.error('[secure] Failed to load from Neon DB:', e);
        // Fallback to localStorage if server unreachable
        const local = localStorage.getItem('hr_v12');
        if (local) {
          try {
            const data = JSON.parse(local);
            setPoints(data.points || 0);
            pointsRef.current = data.points || 0;
            setBalance(data.balance || 0);
            setTotalEarned(data.totalEarned || 0);
            setHashRate(data.hashRate || 10);
            setStreak(data.streak || 1);
            setOwnedHardware(data.ownedHardware || [{ id: 'starter', count: 1, totalBoost: 10 }]);
            setInventory(data.inventory || { tickets: 0, tokens: 0, rigs: 1, spins: 0 });
            setDarkMode(data.darkMode || false);
            setSoundEnabled(data.soundEnabled !== false);
          } catch { }
        } else {
          setShowOnboarding(true);
        }
      }

      setIsLoading(false);

      // Auto add favorites
      if (!localStorage.getItem('hr_added_favorite')) {
        setTimeout(async () => {
          try { await sdk.actions.addFrame(); localStorage.setItem('hr_added_favorite', 'true'); }
          catch { localStorage.setItem('hr_added_favorite', 'true'); }
        }, 1500);
      }
    };

    loadData();
  }, [context, isLoading, sdk]);

  // Auto-Save Loop — Save prefs locally, sync mining progress to server
  useEffect(() => {
    if (isLoading || !context?.user?.fid) return;

    // Save only non-critical prefs to localStorage
    const savePrefs = () => {
      localStorage.setItem('hr_prefs_v1', JSON.stringify({
        darkMode, soundEnabled, notificationsEnabled,
        transactions: transactions.slice(-20),
        badges: unlockedBadges,
        lastTapGameDate,
      }));
    };

    // Sync mining progress to server every 30s
    // Server validates hashRate from rigs in DB (anti-cheat)
    const syncToServer = async () => {
      if (!context?.user?.fid) return;
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: String(context.user.fid),
            data: {
              points: pointsRef.current,
              balance,
              totalEarned,
              hashRate, // server will cap this to what DB says
              streak,
              username: context.user.username,
              pfpUrl: context.user.pfpUrl,
            }
          })
        });
        const json = await res.json();
        // If server says different hashrate, correct client
        if (json.serverHashRate && json.serverHashRate !== hashRate) {
          console.log(`[secure] Correcting hashRate: ${hashRate} → ${json.serverHashRate}`);
          setHashRate(json.serverHashRate);
        }
      } catch (e) { console.error('[sync] Failed:', e); }
    };

    const interval = setInterval(() => {
      savePrefs();
      syncToServer();
    }, 30000); // every 30s

    const handleVisibility = () => {
      if (document.hidden) { savePrefs(); syncToServer(); }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLoading, context, balance, totalEarned, hashRate, streak, unlockedBadges, lastTapGameDate, transactions, darkMode, soundEnabled, notificationsEnabled]);

  useEffect(() => {
    if (!mining || isLoading) return;
    const streakMultiplier = streak >= 7 ? 1.5 : 1;
    const interval = setInterval(() => {
      const inc = (hashRate / 1000) * (0.9 + Math.random() * 0.2) * streakMultiplier;
      setPoints(p => {
        if (p >= maxHp) return maxHp;
        const newVal = Math.min(p + inc, maxHp);
        pointsRef.current = newVal;
        return newVal;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [mining, hashRate, streak, isLoading]);

  useEffect(() => {
    if (!tapGameActive || tapTimeLeft <= 0) return;
    const timer = setTimeout(() => setTapTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [tapGameActive, tapTimeLeft]);

  useEffect(() => {
    if (tapGameActive && tapTimeLeft === 0) {
      setTapGameActive(false);
      const reward = Math.floor(tapCount * 0.5);
      setBalance(b => b + reward);
      setTotalEarned(t => t + reward);
      if (soundEnabled) playKaching();
      setLastTapGameDate(new Date().toDateString());
      setCanPlayTapGame(false);
      setTransactions(prev => [...prev, { type: 'game', amount: `+${reward} HP`, time: Date.now() }]);
      if (tapCount >= 50 && !unlockedBadges.includes('tapper')) setUnlockedBadges(prev => [...prev, 'tapper']);
      haptic('heavy');
      triggerConfetti();
      if (tapCount >= 50 && !unlockedBadges.includes('tapper')) setUnlockedBadges(prev => [...prev, 'tapper']);
      haptic('heavy');
      triggerConfetti();
      setTimeout(() => setShowTapGame(false), 2000); // Close after 2s result
    }
  }, [tapTimeLeft, tapGameActive, tapCount, soundEnabled, unlockedBadges, haptic]);

  const enableNotifications = async () => {
    haptic('medium');
    try {
      const result = await sdk.actions.addFrame();
      if (result) {
        setNotificationsEnabled(true);
        showToast('🔔', 'Notifications enabled!');
      }
    } catch {
      if (process.env.NODE_ENV === 'development') setNotificationsEnabled(true);
    }
  };

  // Add to Farcaster Favorites
  const handleAddToFavorites = async () => {
    haptic('medium');
    try {
      const result = await sdk.actions.addFrame();
      if (result) {
        localStorage.setItem('hr_added_favorite', 'true');
        setShowAddFavorite(false);
        showToast('⭐', 'Added to Favorites!');
        triggerConfetti();
      }
    } catch (error) {
      console.error('Add to favorites error:', error);
      // Still mark as shown so we don't keep prompting
      localStorage.setItem('hr_added_favorite', 'true');
      setShowAddFavorite(false);
    }
  };

  const dismissAddFavorite = () => {
    localStorage.setItem('hr_added_favorite', 'true');
    setShowAddFavorite(false);
  };

  const handleClaimPoints = async () => {
    if (points < 1 || isTransacting) return;

    if (!walletConnected) {
      await connectWallet();
      return;
    }

    if (!isCorrectChain) {
      await switchToBase();
      if (!isCorrectChain) {
        showToast('⚠️', 'Switch to Base Mainnet');
        return;
      }
    }

    // Open confirm modal
    setClaimResult(null);
    setClaimStep('confirm');
    setShowClaimModal(true);
  };

  // Execute claim after user confirms in modal
  const executeClaim = async () => {
    setClaimStep('paying');
    setIsTransacting(true);
    haptic('medium');

    try {
      const claimed = Math.floor(points);

      const txParams = {
        to: CONTRACT_ADDRESS as `0x${string}`,
        from: walletAddress as `0x${string}`,
        value: CLAIM_FEE_ETH as `0x${string}`,
        chainId: "0x2105" as `0x${string}`
      };

      const txHash = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });

      if (txHash) {
        setClaimStep('verifying');

        const res = await fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: String(context?.user?.fid),
            walletAddress,
            txHash,
            amount: claimed
          })
        });
        const json = await res.json();

        if (json.success) {
          setBalance(json.newBalance);
          setTotalEarned(json.newTotalEarned);
          setPoints(json.newPoints);
          pointsRef.current = json.newPoints;
          setClaimResult({ claimed: json.claimed, newBalance: json.newBalance, txHash: txHash as string });
          setClaimStep('success');
          if (soundEnabled) playKaching();
          haptic('heavy');
          triggerConfetti();
          setTransactions(prev => [...prev, { type: 'claim', amount: `+${json.claimed} HP`, time: Date.now() }]);
        } else {
          setClaimResult({ error: json.error || 'Claim verification failed' });
          setClaimStep('error');
        }
      } else {
        setClaimResult({ error: 'Transaction was cancelled' });
        setClaimStep('error');
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimResult({ error: error?.message?.includes('rejected') ? 'Transaction rejected' : 'Transaction failed' });
      setClaimStep('error');
    } finally {
      setIsTransacting(false);
    }
  };

  const handleBuy = async (item: typeof HARDWARE_ITEMS[0]) => {
    if (!walletConnected) {
      await connectWallet();
      return;
    }

    if (!isCorrectChain) {
      await switchToBase();
      if (!isCorrectChain) {
        showToast('⚠️', 'Switch to Base Mainnet');
        return;
      }
    }

    // Show preview modal instead of directly buying
    setBuyPreviewItem(item);
    setShowBuyModal('preview');
    haptic('light');
  };

  const handleBuyConfirm = async () => {
    if (!buyPreviewItem) return;
    const item = buyPreviewItem;
    setShowBuyModal('buying');
    setIsTransacting(true);
    haptic('medium');

    try {
      const cost = ethers.parseEther(item.price);

      // Encode buyHardware function call
      const iface = new ethers.Interface(CONTRACT_ABI);
      const data = iface.encodeFunctionData("buyHardware", [item.id]);

      const txParams = {
        to: CONTRACT_ADDRESS as `0x${string}`,
        from: walletAddress as `0x${string}`,
        value: ("0x" + cost.toString(16)) as `0x${string}`,
        data: (data + DATA_SUFFIX.slice(2)) as `0x${string}`,
        chainId: "0x2105" as `0x${string}`
      };

      console.log("Buy Hardware TX:", txParams);

      const txHash = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });

      if (txHash) {
        // [SECURE] Validate buy rig with Server
        const res = await fetch('/api/rigs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: String(context?.user?.fid),
            walletAddress,
            rigType: item.id,
            txHash
          })
        });
        const json = await res.json();

        if (json.success) {
          completeHardwarePurchase(item, json.newHashRate);
        } else {
          showToast('❌', json.error || 'Verification Failed');
        }
      }
    } catch (error) {
      console.error('Buy error:', error);
      showToast('❌', 'Purchase failed');
      setShowBuyModal(null);
    } finally {
      setIsTransacting(false);
    }
  };

  const completeHardwarePurchase = (item: typeof HARDWARE_ITEMS[0], newHashRate: number) => {
    const oldHashRate = hashRate;
    setHashRate(newHashRate);
    setInventory(i => ({ ...i, rigs: i.rigs + 1 }));
    setOwnedHardware(prev => {
      const existing = prev.find(h => h.id === item.id);
      if (existing) {
        return prev.map(h => h.id === item.id ? { ...h, count: h.count + 1, totalBoost: h.totalBoost + item.boost } : h);
      }
      return [...prev, { id: item.id, count: 1, totalBoost: item.boost }];
    });
    setTransactions(prev => [...prev, { type: 'buy', amount: `+${item.boost} MH/s`, time: Date.now() }]);
    setBuySuccessData({ item, oldHashRate, newHashRate });
    setShowBuyModal('success');
    triggerConfetti();
    haptic('heavy');
  };

  const handleRedeem = (type: 'ticket' | 'token', cost: number) => {
    if (balance < cost) return;
    haptic('light');
    if (soundEnabled) playKaching();
    setBalance(b => b - cost);
    if (type === 'ticket') setInventory(i => ({ ...i, tickets: i.tickets + 1 }));
    else setInventory(i => ({ ...i, tokens: i.tokens + 1 }));
  };

  // Redeem DEGEN — Show celebration modal!
  const handleRedeemRewards = async () => {
    console.log("handleRedeem called", { balance, MIN_HP_REDEEM, isTransacting, walletConnected });

    if (balance < MIN_HP_REDEEM || isTransacting) {
      showToast('❌', `Need ${MIN_HP_REDEEM.toLocaleString()} HP minimum`);
      return;
    }

    if (!walletConnected) {
      await connectWallet();
      return;
    }

    if (userCooldown > 0) {
      const hrs = Math.ceil(userCooldown / 3600);
      showToast('⏳', `Cooldown active: Wait ${hrs}h`);
      return;
    }

    // Show the modal in confirm state
    setRedeemResult(null);
    setRedeemStep('confirm');
    setShowRedeemModal(true);
  };

  // Actually execute the redeem after user confirms in modal
  const executeRedeem = async () => {
    setRedeemStep('sending');
    setIsTransacting(true);
    haptic('medium');

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: String(context?.user?.fid),
          walletAddress
        })
      });
      const json = await res.json();

      if (json.success) {
        setBalance(json.newBalance);
        setRedeemResult({ degenSent: json.degenSent, txHash: json.txHash });
        setRedeemStep('success');
        if (soundEnabled) playKaching();
        haptic('heavy');
        triggerConfetti();
        setTransactions(prev => [...prev, { type: 'redeem', amount: `+${json.degenSent} ${REWARD_SYMBOL}`, time: Date.now() }]);
        setUserCooldown(86400);
      } else {
        setRedeemResult({ error: json.error || 'Redeem failed' });
        setRedeemStep('error');
        if (json.serverBalance !== undefined) setBalance(json.serverBalance);
        if (json.hoursLeft) setUserCooldown(json.hoursLeft * 3600);
      }
    } catch (error) {
      console.error('Redeem error:', error);
      setRedeemResult({ error: 'Network error. Try again.' });
      setRedeemStep('error');
    } finally {
      setIsTransacting(false);
    }
  };

  const handleSpin = async () => {
    if (spinning || isTransacting) return;

    if (!walletConnected) {
      await connectWallet();
      return;
    }

    if (!isCorrectChain) {
      await switchToBase();
      if (!isCorrectChain) {
        showToast('⚠️', 'Switch to Base Mainnet');
        return;
      }
    }

    setIsTransacting(true);
    haptic('medium');
    setShowSpinModal(true);

    try {
      const fee = ethers.parseEther("0.00001");
      const tx = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [{
          to: OWNER_ADDRESS as `0x${string}`,
          value: ("0x" + fee.toString(16)) as `0x${string}`
        }]
      });

      if (tx) {
        performSpin();
      }
    } catch (error) {
      console.error('Spin error:', error);
      showToast('❌', 'Spin Failed');
      setShowSpinModal(false);
    } finally {
      setIsTransacting(false);
    }
  };

  const performSpin = () => {
    setSpinning(true);
    setSpinResult(null);
    setTimeout(() => {
      const reward = SPIN_REWARDS[Math.floor(Math.random() * SPIN_REWARDS.length)];
      if (reward.type === 'points') { setBalance(b => b + reward.value); setTotalEarned(t => t + reward.value); }
      else if (reward.type === 'ticket') setInventory(i => ({ ...i, tickets: i.tickets + reward.value }));
      else if (reward.type === 'boost') setHashRate(h => h + reward.value);
      setSpinResult(reward);
      setTransactions(prev => [...prev, { type: 'spin', amount: reward.label, time: Date.now() }]);
      setInventory(i => ({ ...i, spins: i.spins + 1 }));
      if (soundEnabled) playKaching();
      haptic('heavy');
      triggerConfetti();
      setSpinning(false);
    }, 4000);
  };

  const countdown = formatCountdown(jackpotTime);
  const userTier = getTier(totalEarned);

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        overflow: 'hidden'
      }}>
        {/* Animated particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? 4 : 2,
            height: i % 3 === 0 ? 4 : 2,
            borderRadius: '50%',
            background: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b'][i % 4],
            opacity: 0.4,
            left: `${(i * 5 + 3) % 100}%`,
            top: `${(i * 7 + 10) % 100}%`,
            animation: `float ${3 + (i % 3)}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.2}s`
          }} />
        ))}

        {/* Glowing circle behind logo */}
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 2s ease-in-out infinite', marginBottom: 24
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(139,92,246,0.4), 0 0 80px rgba(59,130,246,0.2)',
            animation: 'bounceIn 0.8s ease-out'
          }}>
            <span style={{ fontSize: '48px' }}>⛏️</span>
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '2rem', fontWeight: 900, color: 'white', marginBottom: 8,
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #c084fc)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'slideUp 0.6s ease-out 0.2s both'
        }}>HashRush</h1>

        <p style={{
          color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500, marginBottom: 32,
          animation: 'slideUp 0.6s ease-out 0.4s both'
        }}>Mine • Earn • Prosper</p>

        {/* Loading bar */}
        <div style={{
          width: 200, height: 4, borderRadius: 100,
          background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
          animation: 'slideUp 0.6s ease-out 0.6s both'
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 100,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite'
          }} />
        </div>

        <p style={{
          color: '#64748b', fontSize: '0.75rem', marginTop: 16,
          animation: 'slideUp 0.6s ease-out 0.8s both'
        }}>Connecting to Farcaster...</p>
      </div>
    );
  }

  return (
    <>
      <div className="app-bg" />

      {/* Global Loading Overlay */}
      {/* Global Loading Overlay Removed */}

      {/* Confetti */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="confetti" style={{
              left: `${Math.random() * 100}%`,
              background: ['#f59e0b', '#3b82f6', '#22c55e', '#ec4899', '#8b5cf6'][i % 5],
              animationDelay: `${Math.random() * 0.5}s`,
              borderRadius: i % 2 ? '50%' : '0'
            }} />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast">
          <span style={{ fontSize: '1.5rem' }}>{toast.icon}</span>
          <span style={{ fontWeight: 600 }}>{toast.text}</span>
        </div>
      )}

      {/* 🎉 Redeem Celebration Modal */}
      {showRedeemModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }} onClick={() => { if (redeemStep !== 'sending') setShowRedeemModal(false); }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: 28, padding: '32px 24px',
            maxWidth: 380, width: '100%', textAlign: 'center', color: 'white', position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.4s ease-out'
          }}>
            {/* Close button */}
            {redeemStep !== 'sending' && (
              <button onClick={() => setShowRedeemModal(false)} style={{
                position: 'absolute', top: 12, right: 16, background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer'
              }}>×</button>
            )}

            {/* Step: Confirm */}
            {redeemStep === 'confirm' && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px'
                }}>🎩</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 8 }}>Claim {REWARD_AMOUNT} {REWARD_SYMBOL}</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>
                  Exchange {MIN_HP_REDEEM.toLocaleString()} HP for {REWARD_AMOUNT} DEGEN tokens
                </p>
                <div style={{
                  background: 'rgba(139,92,246,0.15)', borderRadius: 16, padding: 16, marginBottom: 20,
                  border: '1px solid rgba(139,92,246,0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>You Pay</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>🔥 {MIN_HP_REDEEM.toLocaleString()} HP</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>You Receive</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#a78bfa' }}>🎩 {REWARD_AMOUNT} DEGEN</span>
                  </div>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 20 }}>
                  🔒 Sent directly to your wallet • No gas fee required
                </p>
                <button onClick={executeRedeem} style={{
                  width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', fontWeight: 800,
                  fontSize: '1.1rem', cursor: 'pointer', color: 'white',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  boxShadow: '0 8px 20px -4px rgba(139,92,246,0.5)',
                  transition: 'transform 0.2s'
                }}>✨ Confirm Claim</button>
              </>
            )}

            {/* Step: Sending */}
            {redeemStep === 'sending' && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                  <div style={{ fontSize: '36px', animation: 'spin 2s linear infinite' }}>⏳</div>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>Sending DEGEN...</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>
                  Transferring {REWARD_AMOUNT} DEGEN to your wallet
                </p>
                <div style={{
                  background: 'rgba(59,130,246,0.15)', borderRadius: 12, padding: '12px 16px',
                  border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.8rem', color: '#60a5fa'
                }}>⛏️ Processing on Base network...</div>
              </>
            )}

            {/* Step: Success! 🎉 */}
            {redeemStep === 'success' && redeemResult && (
              <>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '48px', animation: 'bounceIn 0.6s ease-out'
                }}>🎉</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 4, background: 'linear-gradient(135deg, #22c55e, #86efac)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  +{redeemResult.degenSent} DEGEN!
                </h2>
                <p style={{ color: '#86efac', fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>
                  Successfully sent to your wallet! 🚀
                </p>
                <div style={{
                  background: 'rgba(34,197,94,0.1)', borderRadius: 16, padding: 16, marginBottom: 20,
                  border: '1px solid rgba(34,197,94,0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: '2rem' }}>🎩</span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900 }}>{redeemResult.degenSent} DEGEN</span>
                  </div>
                  {redeemResult.txHash && (
                    <a href={`https://basescan.org/tx/${redeemResult.txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#60a5fa', fontSize: '0.75rem', textDecoration: 'underline', wordBreak: 'break-all' }}>
                      View on BaseScan ↗
                    </a>
                  )}
                </div>
                <button onClick={() => setShowRedeemModal(false)} style={{
                  width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', fontWeight: 800,
                  fontSize: '1.1rem', cursor: 'pointer', color: 'white',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 8px 20px -4px rgba(34,197,94,0.4)'
                }}>🎊 Awesome!</button>
              </>
            )}

            {/* Step: Error */}
            {redeemStep === 'error' && redeemResult && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px'
                }}>❌</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>Redeem Failed</h2>
                <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: 20 }}>{redeemResult.error}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setRedeemStep('confirm'); }} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent', color: 'white', fontWeight: 700, cursor: 'pointer'
                  }}>Try Again</button>
                  <button onClick={() => setShowRedeemModal(false)} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                    background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, cursor: 'pointer'
                  }}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {/* ⛏️ Claim Points Celebration Modal */}
      {showClaimModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }} onClick={() => { if (claimStep !== 'paying' && claimStep !== 'verifying') setShowClaimModal(false); }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: 28, padding: '32px 24px',
            maxWidth: 380, width: '100%', textAlign: 'center', color: 'white', position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.4s ease-out'
          }}>
            {/* Close button */}
            {(claimStep === 'confirm' || claimStep === 'success' || claimStep === 'error') && (
              <button onClick={() => setShowClaimModal(false)} style={{
                position: 'absolute', top: 12, right: 16, background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer'
              }}>×</button>
            )}

            {/* Step: Confirm */}
            {claimStep === 'confirm' && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px'
                }}>⛏️</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 8 }}>Claim Points</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>
                  Secure your mined HP to your balance
                </p>
                <div style={{
                  background: 'rgba(59,130,246,0.15)', borderRadius: 16, padding: 16, marginBottom: 20,
                  border: '1px solid rgba(59,130,246,0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Points to Claim</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>⛏️ {Math.floor(points).toLocaleString()} HP</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Network Fee</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>⟠ 0.000003 ETH</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Current Balance</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#22c55e' }}>💰 {balance.toLocaleString()} HP</span>
                  </div>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 20 }}>
                  🔐 Points will be verified on Base blockchain
                </p>
                <button onClick={executeClaim} style={{
                  width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', fontWeight: 800,
                  fontSize: '1.1rem', cursor: 'pointer', color: 'white',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  boxShadow: '0 8px 20px -4px rgba(59,130,246,0.5)',
                  transition: 'transform 0.2s'
                }}>⚡ Confirm & Pay</button>
              </>
            )}

            {/* Step: Paying (wallet popup) */}
            {claimStep === 'paying' && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                  <span style={{ fontSize: '36px' }}>💳</span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>Approve in Wallet</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>
                  Confirm the 0.000003 ETH fee in your wallet
                </p>
                <div style={{
                  background: 'rgba(245,158,11,0.15)', borderRadius: 12, padding: '12px 16px',
                  border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8rem', color: '#fbbf24'
                }}>👆 Check your wallet popup...</div>
              </>
            )}

            {/* Step: Verifying (server check) */}
            {claimStep === 'verifying' && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                  <div style={{ fontSize: '36px', animation: 'spin 2s linear infinite' }}>⏳</div>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>Verifying on Chain...</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>
                  Confirming transaction on Base network
                </p>
                <div style={{
                  background: 'rgba(59,130,246,0.15)', borderRadius: 12, padding: '12px 16px',
                  border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.8rem', color: '#60a5fa'
                }}>🔗 Validating blockchain receipt...</div>
              </>
            )}

            {/* Step: Success! 🎉 */}
            {claimStep === 'success' && claimResult && (
              <>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '48px', animation: 'bounceIn 0.6s ease-out'
                }}>🎉</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 4, background: 'linear-gradient(135deg, #22c55e, #86efac)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  +{claimResult.claimed?.toLocaleString()} HP!
                </h2>
                <p style={{ color: '#86efac', fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>
                  Points claimed successfully! 🚀
                </p>
                <div style={{
                  background: 'rgba(34,197,94,0.1)', borderRadius: 16, padding: 16, marginBottom: 20,
                  border: '1px solid rgba(34,197,94,0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Claimed</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#22c55e' }}>+{claimResult.claimed?.toLocaleString()} HP</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>New Balance</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>💰 {claimResult.newBalance?.toLocaleString()} HP</span>
                  </div>
                  {claimResult.txHash && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, textAlign: 'center' }}>
                      <a href={`https://basescan.org/tx/${claimResult.txHash}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#60a5fa', fontSize: '0.75rem', textDecoration: 'underline' }}>
                        View on BaseScan ↗
                      </a>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowClaimModal(false)} style={{
                  width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', fontWeight: 800,
                  fontSize: '1.1rem', cursor: 'pointer', color: 'white',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 8px 20px -4px rgba(34,197,94,0.4)'
                }}>🎊 Awesome!</button>
              </>
            )}

            {/* Step: Error */}
            {claimStep === 'error' && claimResult && (
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px'
                }}>❌</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>Claim Failed</h2>
                <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: 20 }}>{claimResult.error}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setClaimStep('confirm')} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent', color: 'white', fontWeight: 700, cursor: 'pointer'
                  }}>Try Again</button>
                  <button onClick={() => setShowClaimModal(false)} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                    background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, cursor: 'pointer'
                  }}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals removed - Hardware shown in Profile tab */}

      {/* Settings modal moved to after main - see line 1470+ */}

      {/* Welcome popup removed - offline gains applied silently */}

      {/* ─── Rig Purchase Modal ─── */}
      {showBuyModal && buyPreviewItem && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => showBuyModal === 'preview' && setShowBuyModal(null)}>
          <div style={{
            width: '100%', maxWidth: 480,
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '28px 28px 0 0', padding: '28px 24px 36px',
            color: 'white', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>

            {/* PREVIEW STATE */}
            {showBuyModal === 'preview' && (
              <>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 18, fontSize: '2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(99,102,241,0.4)'
                  }}>{buyPreviewItem.icon}</div>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: 2 }}>{buyPreviewItem.name}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Mining Hardware Upgrade</p>
                  </div>
                </div>

                {/* Stats Comparison */}
                <div style={{
                  background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16,
                  border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Mining Power Impact
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f87171' }}>{hashRate}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Current MH/s</div>
                    </div>
                    <div style={{ fontSize: '1.5rem' }}>→</div>
                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(34,197,94,0.15)', borderRadius: 12, padding: 12, border: '1px solid rgba(34,197,94,0.3)' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4ade80' }}>{hashRate + buyPreviewItem.boost}</div>
                      <div style={{ fontSize: '0.65rem', color: '#86efac' }}>After MH/s 🚀</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: 'white', borderRadius: 20, padding: '4px 12px',
                      fontSize: '0.8rem', fontWeight: 800
                    }}>+{buyPreviewItem.boost} MH/s boost ⚡</span>
                  </div>
                </div>

                {/* HP Per Hour & Time to Fill */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
                      {((hashRate + buyPreviewItem.boost) / 1000 * 3600).toFixed(1)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>HP / Hour (new)</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#a78bfa' }}>
                      {((Math.max(maxHp, buyPreviewItem.hpCap || 1000)) / ((hashRate + buyPreviewItem.boost) / 1000 * 3600)).toFixed(1)}h
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Time to fill {Math.max(maxHp, buyPreviewItem.hpCap || 1000).toLocaleString()} HP</div>
                  </div>
                </div>

                {/* Storage Unlock Info */}
                {buyPreviewItem.hpCap && buyPreviewItem.hpCap > maxHp && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: '10px 14px',
                    border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <div style={{ fontSize: '1.2rem' }}>📦</div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fcd34d' }}>Unlocks Larger Storage!</div>
                      <div style={{ fontSize: '0.65rem', color: '#fde68a' }}>Max un-claimed HP increases to {buyPreviewItem.hpCap.toLocaleString()} HP</div>
                    </div>
                  </div>
                )}

                {/* Price + Buy CTA */}
                <button onClick={handleBuyConfirm} style={{
                  width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: 'white', fontWeight: 900, fontSize: '1.1rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 8px 24px rgba(99,102,241,0.4)', transition: 'transform 0.1s',
                }}>
                  ⚡ Buy for {buyPreviewItem.price} ETH
                </button>
                <button onClick={() => setShowBuyModal(null)} style={{
                  width: '100%', marginTop: 10, padding: '12px 0', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
                }}>Cancel</button>
              </>
            )}

            {/* BUYING/WAITING STATE */}
            {showBuyModal === 'buying' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 1.5s ease-in-out infinite', fontSize: '2.5rem'
                }}>⛏️</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>Confirm in Wallet</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Approve the transaction for {buyPreviewItem.price} ETH in your wallet
                </p>
                <div style={{
                  marginTop: 20, background: 'rgba(59,130,246,0.15)', borderRadius: 12,
                  padding: '12px 16px', border: '1px solid rgba(59,130,246,0.3)',
                  fontSize: '0.8rem', color: '#60a5fa'
                }}>👆 Check your wallet popup...</div>
              </div>
            )}

            {/* SUCCESS STATE */}
            {showBuyModal === 'success' && buySuccessData && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '3rem', animation: 'bounceIn 0.6s ease-out'
                }}>🎉</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 4, background: 'linear-gradient(135deg, #22c55e, #86efac)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Rig Installed!
                </h2>
                <p style={{ color: '#86efac', fontSize: '0.95rem', fontWeight: 600, marginBottom: 20 }}>
                  {buySuccessData.item.name} is now mining for you! ⚡
                </p>
                <div style={{
                  background: 'rgba(34,197,94,0.1)', borderRadius: 16, padding: 16, marginBottom: 20,
                  border: '1px solid rgba(34,197,94,0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Rig Added</span>
                    <span style={{ fontWeight: 700, color: '#4ade80' }}>{buySuccessData.item.icon} {buySuccessData.item.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Boost</span>
                    <span style={{ fontWeight: 700, color: '#fbbf24' }}>+{buySuccessData.item.boost} MH/s</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>New Hashrate</span>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#22c55e' }}>{buySuccessData.newHashRate} MH/s 🚀</span>
                  </div>
                </div>
                <button onClick={() => setShowBuyModal(null)} style={{
                  width: '100%', padding: '14px 0', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer',
                  boxShadow: '0 8px 20px -4px rgba(34,197,94,0.4)'
                }}>🔥 Keep Mining!</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tap Game Removed */}


      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-tooltip" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <h3>{['Welcome to HashRush! 🎉', 'Claim Your Points 💰', 'Daily Tap Game 🎮', 'Stay Notified 🔔'][onboardingStep]}</h3>
            <p style={{ marginBottom: 16 }}>{['Watch your HP grow automatically!', 'Move earned HP to your balance.', 'Play daily for bonus HP!', 'Get jackpot & streak alerts!'][onboardingStep]}</p>
            <button className="onboarding-btn onboarding-btn-primary" onClick={() => onboardingStep < 3 ? setOnboardingStep(s => s + 1) : setShowOnboarding(false)}>{onboardingStep < 3 ? 'Next' : 'Start!'}</button>
          </div>
        </div>
      )}

      <main className="container">
        <div className="header">
          <div className="header-brand">
            <div className="header-logo"><Zap size={20} className="text-white" /></div>
            <div className="header-info"><h1>HashRush</h1><span>Season 1</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!walletConnected ? (
              <button onClick={connectWallet} style={{
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Wallet size={14} /> Connect
              </button>
            ) : (
              <button onClick={!isCorrectChain ? switchToBase : undefined} style={{
                padding: '4px 12px 4px 6px',
                background: isCorrectChain ? '#f1f5f9' : '#fef3c7',
                color: isCorrectChain ? '#0f172a' : '#92400e',
                border: `1px solid ${isCorrectChain ? '#e2e8f0' : '#fcd34d'}`,
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isCorrectChain ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {context?.user?.pfpUrl ? (
                  <img src={context.user.pfpUrl} alt="Profile" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={14} className="text-white" />
                  </div>
                )}
                <span>@{context?.user?.username || 'user'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Wallet not connected warning */}
        {!walletConnected && (
          <button onClick={connectWallet} style={{
            width: '100%',
            padding: 16,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10
          }}>
            <Wallet size={20} /> Connect Wallet to Start
          </button>
        )}

        {/* Wrong chain warning */}
        {walletConnected && !isCorrectChain && (
          <button onClick={switchToBase} style={{
            width: '100%',
            padding: 14,
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fcd34d',
            borderRadius: 16,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10
          }}>
            ⚠️ Switch to Base Network
          </button>
        )}

        {tab === 'mine' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {streak >= 2 && (
              <div className="streak-banner">
                <span className="streak-icon">🔥</span>
                <div className="streak-info">
                  <h4>{streak >= 7 ? '50% Bonus!' : `${streak}d Streak`}</h4>
                  <div className="streak-countdown">⏱️ Reset in {formatStreakReset(streakResetTime)}</div>
                </div>
                <span className="streak-days">{streak}d</span>
              </div>
            )}

            {!notificationsEnabled && (
              <button onClick={enableNotifications} className="notif-cta">
                <div className="notif-cta-icon"><Bell size={20} className="text-white" /><span className="notif-cta-pulse" /></div>
                <div className="notif-cta-text"><strong>Enable Notifications</strong><span>Get jackpot & streak alerts</span></div>
                <div className="notif-cta-arrow">→</div>
              </button>
            )}

            <div className="hash-display">
              <div className="hash-label">Unclaimed Hash Power</div>
              <div className="hash-value" style={{ color: points >= maxHp ? '#f59e0b' : undefined }}>{points >= maxHp ? maxHp.toLocaleString() : points.toFixed(3)}</div>
              <div className="hash-unit">
                <span style={{ color: points >= maxHp ? '#f59e0b' : '#94a3b8' }}>
                  {points >= maxHp ? '⚠️ Full! Claim now ' : ''}{Math.floor(points).toLocaleString()} / {maxHp.toLocaleString()} HP
                </span>
              </div>
              <div className="stats-row">
                <div className="stat-pill" onClick={() => setShowHardware(true)} style={{ cursor: 'pointer' }}><Zap size={12} className="text-yellow-500" /><span className="stat-pill-value">{hashRate} MH/s</span></div>
                <div className="stat-pill" onClick={() => setShowHardware(true)} style={{ cursor: 'pointer' }}><Cpu size={12} className="text-purple-500" /><span className="stat-pill-value">{inventory.rigs} Rigs</span></div>
              </div>
            </div>

            {/* Daily Tap Game button removed - modal is now outside main */}

            <div className="action-grid">
              <button onClick={handleClaimPoints} className="action-btn" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #93c5fd' }}>
                <div className="action-btn-icon" style={{ background: '#3b82f6' }}><ArrowDownToLine size={22} className="text-white" /></div>
                <span className="action-btn-label">Claim</span>
              </button>
              <button onClick={() => { haptic('light'); setMining(!mining); }} className="action-btn">
                <div className="action-btn-icon" style={{ background: mining ? '#dcfce7' : '#fee2e2' }}><Power size={22} className={mining ? 'text-green-500' : 'text-red-500'} /></div>
                <span className="action-btn-label">{mining ? 'Active' : 'Paused'}</span>
              </button>
            </div>

            <div className="balance-card">
              <div className="balance-card-header"><Wallet size={18} /><span>Your Balance</span></div>
              <div className="balance-card-value"><span className="balance-amount">{balance.toLocaleString()}</span><span className="balance-unit">HP</span></div>
              <div className="balance-card-footer">
                <div className="balance-stat"><Ticket size={14} className="text-yellow-500" /><span>{inventory.tickets}</span></div>
                <div className="balance-stat"><Coins size={14} className="text-purple-500" /><span>{inventory.tokens}</span></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'store' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>💻 Hardware Store</h2>
            {HARDWARE_ITEMS.map(item => (
              <div key={item.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                    <div><div style={{ fontWeight: 700 }}>{item.name}</div><div style={{ fontSize: '0.75rem', color: '#22c55e' }}>+{item.boost} MH/s</div></div>
                  </div>
                  <button onClick={() => handleBuy(item)} style={{ padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{item.price} Ξ</button>
                </div>
              </div>
            ))}

            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginTop: 24, marginBottom: 16 }}>🎩 Redeem {REWARD_SYMBOL} ({balance.toLocaleString()} HP available)</h3>

            {/* Cooldown Warning - Show if cooldown active */}
            {userCooldown > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: '2px solid #f59e0b',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                  <Clock size={20} className="text-amber-600" />
                  <span style={{ fontWeight: 800, color: '#92400e', fontSize: '1rem' }}>Cooldown Active</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', marginBottom: 4 }}>
                  {Math.floor(userCooldown / 3600)}h {Math.floor((userCooldown % 3600) / 60)}m
                </div>
                <p style={{ fontSize: '0.75rem', color: '#92400e' }}>Wait until cooldown ends to redeem again</p>
              </div>
            )}

            {/* USDC Redeem Card Centered */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <button
                onClick={handleRedeemRewards}
                disabled={balance < MIN_HP_REDEEM || userCooldown > 0}
                className="card"
                style={{
                  width: '100%',
                  maxWidth: 320,
                  background: userCooldown > 0
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : balance >= MIN_HP_REDEEM
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#f1f5f9',
                  border: 'none',
                  padding: '24px 20px',
                  borderRadius: 24,
                  cursor: balance >= MIN_HP_REDEEM && userCooldown === 0 ? 'pointer' : 'not-allowed',
                  color: balance >= MIN_HP_REDEEM || userCooldown > 0 ? 'white' : '#94a3b8',
                  boxShadow: balance >= MIN_HP_REDEEM && userCooldown === 0 ? '0 10px 25px -5px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  opacity: userCooldown > 0 ? 0.7 : 1
                }}
              >
                <div style={{
                  width: 60,
                  height: 60,
                  background: balance >= MIN_HP_REDEEM || userCooldown > 0 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  {userCooldown > 0 ? <Clock size={32} /> : <div style={{ fontSize: '32px' }}>🎩</div>}
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>{REWARD_AMOUNT} {REWARD_SYMBOL}</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: 4 }}>Min {MIN_HP_REDEEM.toLocaleString()} HP Required</p>
                <p style={{ fontSize: '0.7rem', opacity: 0.75, marginBottom: 12 }}>🔒 Server sends DEGEN automatically • No gas fee!</p>

                <div style={{
                  background: balance >= MIN_HP_REDEEM || userCooldown > 0 ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                  padding: '8px 16px',
                  borderRadius: 12,
                  display: 'inline-block',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  {userCooldown > 0
                    ? `⏳ ${Math.floor(userCooldown / 3600)}h ${Math.floor((userCooldown % 3600) / 60)}m remaining`
                    : balance >= MIN_HP_REDEEM
                      ? `✨ Ready to Claim ${REWARD_AMOUNT} ${REWARD_SYMBOL}`
                      : `Need ${(MIN_HP_REDEEM - balance).toLocaleString()} HP more`
                  }
                </div>
              </button>
            </div>
          </div>
        )}

        {tab === 'rank' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="badges-section">
              <div className="badges-title">Achievements</div>
              <div className="badges-grid">
                {BADGES.map(b => (
                  <div key={b.id} className="badge-item">
                    <div className={`badge-icon ${unlockedBadges.includes(b.id) ? 'unlocked' : 'locked'}`}>{b.icon}</div>
                    <div className="badge-label">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Stats */}
            <div className="card" style={{ padding: 24, marginTop: 16, textAlign: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{userTier.icon}</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>{userTier.name} Tier</h2>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#2563eb', marginBottom: 8 }}>{totalEarned.toLocaleString()} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>HP</span></div>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Next Tier at {(userTier.name === 'Bronze' ? 1000 : userTier.name === 'Silver' ? 10000 : 50000).toLocaleString()} HP</p>
            </div>

            {/* Leaderboard Header - Auto sync enabled */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={22} className="text-yellow-500" />
                Top 50 Players
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RotateCw size={12} />
                Auto-sync
              </div>
            </div>

            {/* Top 3 Podium */}
            {leaderboardData.length >= 3 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8, marginBottom: 24, padding: '0 10px' }}>
                {/* 2nd Place */}
                <div
                  onClick={() => {
                    if (leaderboardData[1]?.fid) {
                      haptic('light');
                      sdk.actions.viewProfile({ fid: Number(leaderboardData[1].fid) });
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
                    borderRadius: '16px 16px 0 0',
                    padding: '16px 8px 12px',
                    textAlign: 'center',
                    border: '2px solid #94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>🥈</div>
                  {leaderboardData[1]?.pfpUrl ? (
                    <img
                      src={leaderboardData[1].pfpUrl}
                      alt={leaderboardData[1].name}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        margin: '0 auto 8px',
                        border: '2px solid white'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40,
                      height: 40,
                      background: '#94a3b8',
                      borderRadius: '50%',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}>
                      {leaderboardData[1]?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{leaderboardData[1]?.name?.slice(0, 8) || '---'}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>
                    {leaderboardData[1]?.score?.toLocaleString() || 0}
                  </div>
                </div>

                {/* 1st Place */}
                <div
                  onClick={() => {
                    if (leaderboardData[0]?.fid) {
                      haptic('light');
                      sdk.actions.viewProfile({ fid: Number(leaderboardData[0].fid) });
                    }
                  }}
                  style={{
                    flex: 1.2,
                    background: 'linear-gradient(180deg, #fef3c7 0%, #fcd34d 100%)',
                    borderRadius: '20px 20px 0 0',
                    padding: '20px 8px 16px',
                    textAlign: 'center',
                    border: '3px solid #f59e0b',
                    transform: 'translateY(-10px)',
                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '2.2rem', marginBottom: 4 }}>👑</div>
                  {leaderboardData[0]?.pfpUrl ? (
                    <img
                      src={leaderboardData[0].pfpUrl}
                      alt={leaderboardData[0].name}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        margin: '0 auto 8px',
                        border: '3px solid white'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 50,
                      height: 50,
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      borderRadius: '50%',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      border: '3px solid white'
                    }}>
                      {leaderboardData[0]?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{leaderboardData[0]?.name?.slice(0, 8) || '---'}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#78350f' }}>
                    {leaderboardData[0]?.score?.toLocaleString() || 0} HP
                  </div>
                </div>

                {/* 3rd Place */}
                <div
                  onClick={() => {
                    if (leaderboardData[2]?.fid) {
                      haptic('light');
                      sdk.actions.viewProfile({ fid: Number(leaderboardData[2].fid) });
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(180deg, #fed7aa 0%, #fdba74 100%)',
                    borderRadius: '16px 16px 0 0',
                    padding: '14px 8px 10px',
                    textAlign: 'center',
                    border: '2px solid #ea580c',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>🥉</div>
                  {leaderboardData[2]?.pfpUrl ? (
                    <img
                      src={leaderboardData[2].pfpUrl}
                      alt={leaderboardData[2].name}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        margin: '0 auto 8px',
                        border: '2px solid white'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 36,
                      height: 36,
                      background: '#ea580c',
                      borderRadius: '50%',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {leaderboardData[2]?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9a3412', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{leaderboardData[2]?.name?.slice(0, 8) || '---'}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#7c2d12' }}>
                    {leaderboardData[2]?.score?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Rest of Leaderboard - Show ALL if less than 3 players */}
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 12 }}>
              {(leaderboardData.length < 3 ? leaderboardData : leaderboardData.slice(3)).map((user, i) => {
                const rank = leaderboardData.length < 3 ? i + 1 : i + 4;

                return (
                  <div
                    key={user.fid || i}
                    onClick={() => {
                      haptic('light');
                      if (user.fid) sdk.actions.viewProfile({ fid: Number(user.fid) });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 8px',
                      borderBottom: '1px solid #e2e8f0',
                      background: rank === 1 ? '#fef3c7' : rank === 2 ? '#f1f5f9' : rank === 3 ? '#fed7aa' : 'transparent',
                      borderRadius: rank <= 3 ? 12 : 0,
                      marginBottom: rank <= 3 ? 8 : 0,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      background: rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#ea580c' : '#e2e8f0',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      color: rank <= 3 ? 'white' : '#64748b'
                    }}>
                      {rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </div>

                    {/* Profile Picture */}
                    {user.pfpUrl ? (
                      <img
                        src={user.pfpUrl}
                        alt={user.name}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: rank <= 3 ? '2px solid #fcd34d' : '2px solid #e2e8f0'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 36,
                        height: 36,
                        background: rank <= 3 ? '#fcd34d' : '#cbd5e1',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#475569'
                      }}>
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>@{user.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user.tier}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: rank === 1 ? '#d97706' : '#2563eb' }}>{user.score?.toLocaleString() || 0}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>HP</div>
                    </div>
                  </div>
                );
              })}

              {leaderboardData.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  <Trophy size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <p>No players yet. Be the first!</p>
                </div>
              )}
            </div>

            {/* Your Position */}
            <div style={{
              marginTop: 16,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'white'
            }}>
              <div style={{
                width: 44,
                height: 44,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1rem'
              }}>
                {context?.user?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>@{context?.user?.username || 'you'}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{userTier.name} Tier</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: '1.25rem' }}>{totalEarned.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>HP</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              {context?.user?.pfpUrl ? (<img src={context.user.pfpUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', border: '3px solid #3b82f6' }} />) : (<div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={40} className="text-white" /></div>)}
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{context?.user?.displayName || 'Anonymous'}</h2>
              <p style={{ color: '#64748b', marginBottom: 12 }}>@{context?.user?.username || 'guest'}</p>

              {walletAddress && (
                <div style={{
                  background: '#f8fafc',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 16,
                  fontSize: '0.8rem',
                  color: '#475569',
                  fontWeight: 700,
                  marginBottom: 16,
                  border: '1px solid #e2e8f0'
                }}>
                  <Wallet size={14} className="text-blue-500" />
                  {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                </div>
              )}

              <div style={{ marginBottom: 4 }}>
                <span className={`tier-badge ${userTier.class}`}>{userTier.icon} {userTier.name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}><div style={{ background: '#f1f5f9', borderRadius: 12, padding: 12 }}><div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{totalEarned.toLocaleString()}</div><div style={{ fontSize: '0.65rem', color: '#64748b' }}>Total HP</div></div><div style={{ background: '#f1f5f9', borderRadius: 12, padding: 12 }}><div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{streak}</div><div style={{ fontSize: '0.65rem', color: '#64748b' }}>Streak</div></div><div style={{ background: '#f1f5f9', borderRadius: 12, padding: 12 }}><div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{unlockedBadges.length}/{BADGES.length}</div><div style={{ fontSize: '0.65rem', color: '#64748b' }}>Badges</div></div></div>
            </div>
            <div className="card" style={{ marginTop: 16, padding: 20, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ background: '#eff6ff', padding: 8, borderRadius: 10 }}><UserPlus size={20} className="text-blue-500" /></div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 800 }}>Referral System</h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Both you and your friend get 500 HP!</p>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', padding: '8px 16px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{referralCount}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.9 }}>Invited</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <code style={{ fontSize: '0.75rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>
                  {getReferralLink().slice(0, 30)}...
                </code>
                <button onClick={copyReferralLink} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Copy size={14} /> Copy
                </button>
              </div>

              {referralCount > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginBottom: 8 }}>🎉 Earned from referrals: +{referralCount * 500} HP</div>
                  <div style={{ fontSize: '0.65rem', color: '#15803d' }}>{referralList.length > 0 ? `Recent: ${referralList.slice(0, 3).join(', ')}${referralList.length > 3 ? '...' : ''}` : 'Loading...'}</div>
                </div>
              )}

              <button
                onClick={() => sdk.actions.composeCast({
                  text: `🎮 Come play HashRush with me! Mine crypto and earn rewards. 🚀\n\nUse my link for a 500 HP starter bonus!`,
                  embeds: [getReferralLink()]
                })}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                <Share2 size={18} /> Invite Friends
              </button>
            </div>

            {/* My Hardware Section */}
            <div className="card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: 8, borderRadius: 10 }}>
                  <Cpu size={20} className="text-white" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 800 }}>My Hardware</h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>{hashRate} MH/s total • {inventory.rigs} rigs</p>
                </div>
              </div>

              {ownedHardware.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ownedHardware.map(hw => {
                    const item = HARDWARE_ITEMS.find(h => h.id === hw.id);
                    if (!item) return null;
                    return (
                      <div key={hw.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: '#f8fafc',
                        padding: 12,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>+{hw.totalBoost} MH/s</div>
                        </div>
                        <div style={{
                          background: '#3b82f6',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          ×{hw.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No hardware yet. Visit Shop to buy!</p>
              )}
            </div>

            <button
              onClick={() => sdk.actions.composeCast({
                text: `🚀 Mining on HashRush!\n⚡ ${totalEarned.toLocaleString()} HP\n🏆 ${userTier.name} Tier`,
                embeds: [getReferralLink()]
              })}
              className="btn-primary"
              style={{ marginTop: 16 }}
            >
              <Share2 size={18} /> Share Stats
            </button>
          </div>
        )}
      </main>

      <div className="nav-bar">{[{ id: 'mine', icon: Zap, label: 'Mine' }, { id: 'store', icon: ShoppingBag, label: 'Shop' }, { id: 'rank', icon: Trophy, label: 'Rank' }, { id: 'profile', icon: User, label: 'Profile' }].map(item => (<button key={item.id} onClick={() => { haptic('light'); setTab(item.id as Tab); }} className={`nav-item ${tab === item.id ? 'active' : ''}`}><item.icon size={20} /><span>{item.label}</span></button>))}</div>
    </>
  );
}
