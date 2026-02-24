"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import sdk, { type Context } from "@farcaster/frame-sdk";
import { Zap, ShoppingBag, Trophy, Power, Ticket, Coins, Cpu, Share2, Gift, Wallet, Target, User, Clock, ArrowDownToLine, Settings, Moon, Sun, Bell, BellOff, Sparkles, Package, DollarSign, RotateCw, UserPlus, Copy } from "lucide-react";
import { ethers } from "ethers";
import { Attribution } from "ox/erc8021";

const OWNER_ADDRESS = "0xe0E8222404BFb2Bf10B3A38A758b0Cff0336cd5B"; // Checksummed Verified
const CONTRACT_ADDRESS = "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63";
const REWARD_AMOUNT = 5; // 5 DEGEN
const REWARD_SYMBOL = "DEGEN";
const MIN_HP_REDEEM = 2500;
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
  { id: 'starter', name: 'Starter GPU', boost: 10, price: '0.0005', icon: '💻' },
  { id: 'turbo', name: 'Turbo Rig', boost: 50, price: '0.001', icon: '⚡' },
  { id: 'farm', name: 'Mining Farm', boost: 200, price: '0.003', icon: '🏭' },
  { id: 'quantum', name: 'Quantum Core', boost: 500, price: '0.005', icon: '🔮' },
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

type Transaction = { type: 'claim' | 'buy' | 'spin' | 'game'; amount: string; time: number };
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

  // Connect wallet
  const connectWallet = async () => {
    haptic('medium');
    try {
      const accounts = await sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      }) as string[];

      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
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
          // Try to switch to Base
          await switchToBase();
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

  // Check Contract State (Pool Balance & Cooldown)
  useEffect(() => {
    const checkContract = async () => {
      if (!walletConnected || !isCorrectChain) return;
      try {
        const provider = new ethers.BrowserProvider(sdk.wallet.ethProvider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

        // Get Pool Balance
        const poolBal = await contract.getPoolBalance();
        setContractPoolBalance(ethers.formatUnits(poolBal, 6)); // USDC 6 decimals

        // Get Cooldown
        if (walletAddress) {
          const cooldown = await contract.getRemainingCooldown(walletAddress);
          setUserCooldown(Number(cooldown));
        }
      } catch (err) {
        console.error("Contract check failed:", err);
      }
    };
    checkContract();
    const interval = setInterval(checkContract, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [walletConnected, isCorrectChain, walletAddress]);

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

  // Handle Referral on Load
  useEffect(() => {
    if (isLoading || !context) return;

    // Check both window.location and farcaster context for ref param
    const urlParams = new URLSearchParams(window.location.search);

    // Some Farcaster context versions use different structures for location
    const sdkContext = context as any;
    const contextSearch = sdkContext?.location?.search || '';
    const contextParams = contextSearch ? new URLSearchParams(contextSearch) : null;

    const ref = urlParams.get('ref') || contextParams?.get('ref');

    if (ref && !localStorage.getItem('hr_ref_claimed')) {
      console.log('Referral detected from FID:', ref);
      const bonus = 500;
      setBalance(b => b + bonus);
      setTotalEarned(t => t + bonus);
      showToast('🎁', 'Referral Bonus: +500 HP!');
      localStorage.setItem('hr_ref_claimed', 'true');
      haptic('heavy');
      triggerConfetti();

      // Notify API to give bonus to inviter too
      fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviterFid: ref,
          inviteeFid: context?.user?.fid,
          inviteeUsername: context?.user?.username
        })
      }).catch(console.error);
    }
  }, [isLoading, context]);

  // Fetch referral stats and apply bonus for inviter
  useEffect(() => {
    const fetchReferralStats = async () => {
      if (!context?.user?.fid) return;
      try {
        const res = await fetch(`/api/referral?fid=${context.user.fid}`);
        const data = await res.json();

        if (data.count !== undefined) setReferralCount(data.count);
        if (data.referrals) setReferralList(data.referrals);

        // Apply referral bonus to inviter if they haven't received it yet
        const lastBonusApplied = parseInt(localStorage.getItem('hr_ref_bonus_applied') || '0');
        const currentBonus = data.bonusAwarded || 0;

        if (currentBonus > lastBonusApplied) {
          const newBonus = currentBonus - lastBonusApplied;
          setBalance(b => b + newBonus);
          setTotalEarned(t => t + newBonus);
          localStorage.setItem('hr_ref_bonus_applied', String(currentBonus));

          if (newBonus > 0) {
            showToast('🎁', `Referral Bonus: +${newBonus} HP!`);
            haptic('heavy');
          }
        }
      } catch (e) {
        console.error('Referral stats failed', e);
      }
    };

    // Fetch on profile tab AND on initial load
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

  // Separate effect for loading data once FID is available
  useEffect(() => {
    if (!context?.user?.fid || !isLoading) return;

    const loadData = async () => {
      let data: any = null;
      let fromServer = false;

      // 1. Try load from Server
      try {
        const res = await fetch(`/api/progress/${context.user.fid}`);
        const json = await res.json();
        if (json.success && json.data) {
          data = json.data;
          fromServer = true;
          console.log('Loaded from Server');
        }
      } catch (e) {
        console.error('Server load failed', e);
      }

      // 2. If no server data, try LocalStorage (Migration first time)
      if (!data) {
        const local = localStorage.getItem('hr_v12');
        if (local) {
          try {
            data = JSON.parse(local);
            console.log('Loaded from LocalStorage (Migration)');
          } catch (e) { console.error(e); }
        }
      }

      // 3. Apply Data if exists
      if (data) {
        try {
          const elapsed = (Date.now() - (data.time || Date.now())) / 1000;
          const gain = (data.hashRate / 1000) * Math.min(elapsed, 86400 * 3); // Max 3 days offline

          const lastDate = new Date(data.time).toDateString();
          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();

          if (lastDate === today) setStreak(data.streak || 1);
          else if (lastDate === yesterday) setStreak((data.streak || 0) + 1);
          else setStreak(1);

          if (data.lastTapGameDate === today) {
            setCanPlayTapGame(false);
            setLastTapGameDate(data.lastTapGameDate);
          } else {
            setCanPlayTapGame(true);
            setTimeout(() => setShowTapGame(true), 1500);
          }

          // Apply state
          setPoints(data.points + gain);
          pointsRef.current = data.points + gain;
          setBalance(data.balance || 0);
          setTotalEarned(data.totalEarned || 0);
          setLastMilestone(Math.floor((data.points + gain) / 100) * 100);
          setInventory(data.inventory || { tickets: 0, tokens: 0, rigs: 1, spins: 0 });
          setOwnedHardware(data.ownedHardware || [{ id: 'starter', count: 1, totalBoost: 10 }]);
          setHashRate(data.hashRate || 10);
          setUnlockedBadges(data.badges || []);
          prevBadgesRef.current = data.badges || [];
          setTransactions(data.transactions || []);
          setDarkMode(data.darkMode || false);
          setSoundEnabled(data.soundEnabled !== false);
          setNotificationsEnabled(data.notificationsEnabled || false);

          if (gain > 0) setOfflineGain(gain);

          // If migration (local but no server), save immediately
          if (!fromServer) {
            saveToServer({
              points: data.points + gain, balance: data.balance, totalEarned: data.totalEarned,
              inventory: data.inventory, ownedHardware: data.ownedHardware, hashRate: data.hashRate,
              streak: data.streak, badges: data.badges, lastTapGameDate: data.lastTapGameDate,
              transactions: data.transactions, darkMode: data.darkMode, soundEnabled: data.soundEnabled,
              time: Date.now()
            });
          }
        } catch (e) { console.error('Data apply error', e); }
      } else {
        setShowOnboarding(true);
      }

      setIsLoading(false);

      // Auto add favorites
      if (!localStorage.getItem('hr_added_favorite')) {
        setTimeout(async () => {
          try { await sdk.actions.addFrame(); localStorage.setItem('hr_added_favorite', 'true'); }
          catch (e) { localStorage.setItem('hr_added_favorite', 'true'); }
        }, 1500);
      }
    };

    loadData();
  }, [context, isLoading, saveToServer, sdk]);

  // Auto-Save Loop (To Local & Server)
  useEffect(() => {
    if (isLoading) return;

    const saveData = {
      points: pointsRef.current, balance, totalEarned, inventory, ownedHardware, hashRate, streak,
      badges: unlockedBadges, lastTapGameDate, transactions: transactions.slice(-20),
      darkMode, soundEnabled, notificationsEnabled, time: Date.now()
    };

    const save = () => {
      // 1. Local Save (Fast)
      localStorage.setItem('hr_v12', JSON.stringify(saveData));
    };

    // Save to server less frequently or if forced
    const saveServer = () => {
      saveToServer(saveData);
    };

    const interval = setInterval(() => {
      save();
      // Also save to server every 10s if active
      if (Math.random() > 0.5) saveServer();
    }, 5000);

    // Save on close/hide
    const handleVisibility = () => {
      if (document.hidden) {
        save();
        saveServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLoading, balance, totalEarned, inventory, ownedHardware, hashRate, streak, unlockedBadges, lastTapGameDate, transactions, darkMode, soundEnabled, notificationsEnabled, saveToServer]);

  useEffect(() => {
    if (!mining || isLoading) return;
    const streakMultiplier = streak >= 7 ? 1.5 : 1;
    const interval = setInterval(() => {
      const inc = (hashRate / 1000) * (0.9 + Math.random() * 0.2) * streakMultiplier;
      setPoints(p => { pointsRef.current = p + inc; return p + inc; });
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

    setIsTransacting(true);
    haptic('medium');

    try {
      const claimed = Math.floor(points);

      // Encode claimPoints function call - NO ETH, only gas fee
      const iface = new ethers.Interface(CONTRACT_ABI);
      const data = iface.encodeFunctionData("claimPoints", [claimed]);

      const txParams = {
        to: CONTRACT_ADDRESS as `0x${string}`,
        from: walletAddress as `0x${string}`,
        value: "0x0" as `0x${string}`, // NO ETH transfer
        data: (data + DATA_SUFFIX.slice(2)) as `0x${string}`,
        chainId: "0x2105" as `0x${string}`
      };

      console.log("Claim Points TX:", txParams);

      const tx = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });

      if (tx) {
        // Success - update local state
        setBalance(b => b + claimed);
        setTotalEarned(t => t + claimed);
        setPoints(0);
        pointsRef.current = 0;
        setTransactions(prev => [...prev, { type: 'claim', amount: `+${claimed} HP`, time: Date.now() }]);
        if (soundEnabled) playKaching();
        showToast('💰', `Claimed ${claimed} HP!`);
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      showToast('❌', 'Transaction Failed');
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

      const tx = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });

      if (tx) {
        completeHardwarePurchase(item);
      }
    } catch (error) {
      console.error('Buy error:', error);
      showToast('❌', 'Purchase failed');
    } finally {
      setIsTransacting(false);
    }
  };

  const completeHardwarePurchase = (item: typeof HARDWARE_ITEMS[0]) => {
    setHashRate(h => h + item.boost);
    setInventory(i => ({ ...i, rigs: i.rigs + 1 }));
    setOwnedHardware(prev => {
      const existing = prev.find(h => h.id === item.id);
      if (existing) {
        return prev.map(h => h.id === item.id ? { ...h, count: h.count + 1, totalBoost: h.totalBoost + item.boost } : h);
      }
      return [...prev, { id: item.id, count: 1, totalBoost: item.boost }];
    });
    setTransactions(prev => [...prev, { type: 'buy', amount: `+${item.boost} MH/s`, time: Date.now() }]);
    showToast(item.icon, `${item.name} installed!`);
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

  // Redeem USDC from smart contract
  const handleRedeemRewards = async () => {
    console.log("handleRedeemUSDC called", { balance, MIN_HP_REDEEM, isTransacting, walletConnected });

    if (balance < MIN_HP_REDEEM || isTransacting) {
      showToast('❌', `Need ${MIN_HP_REDEEM} HP minimum`);
      return;
    }

    if (!walletConnected) {
      await connectWallet();
      return;
    }

    // Enforce Base Chain
    if (!isCorrectChain) {
      await switchToBase();
      if (!isCorrectChain) {
        showToast('⚠️', 'Please switch to Base Mainnet');
        return;
      }
    }

    // Check Cooldown (optional - contract will also check)
    if (userCooldown > 0) {
      const hrs = Math.ceil(userCooldown / 3600);
      showToast('⏳', `Cooldown active: Wait ${hrs}h`);
      return;
    }

    setIsTransacting(true);
    haptic('medium');

    try {
      // Create contract interface and data
      const iface = new ethers.Interface(CONTRACT_ABI);
      const data = iface.encodeFunctionData("redeemRewards", [BigInt(balance)]);

      console.log("Calling redeemRewards with balance:", balance);

      // Call contract directly via SDK provider
      const txParams = {
        to: CONTRACT_ADDRESS as `0x${string}`,
        from: walletAddress as `0x${string}`,
        data: (data + DATA_SUFFIX.slice(2)) as `0x${string}`,
        value: "0x0" as `0x${string}`,
        chainId: "0x2105" as `0x${string}`
      };

      console.log("TX Params:", txParams);

      const tx = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });

      console.log("TX Result:", tx);

      if (tx) {
        // Success
        setBalance(0);
        if (soundEnabled) playKaching();
        haptic('heavy');
        triggerConfetti();
        showToast('💵', `Claimed ${REWARD_AMOUNT} ${REWARD_SYMBOL}!`);
        setTransactions(prev => [...prev, { type: 'claim', amount: `+${REWARD_AMOUNT} ${REWARD_SYMBOL}`, time: Date.now() }]);
        // Reset cooldown locally to prevent immediate retry
        setUserCooldown(86400);
      }
    } catch (error) {
      console.error('Redeem error:', error);
      showToast('❌', 'Redeem Failed');
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
      <>
        <div className="app-bg" />
        <main className="container">
          <div className="skeleton-card" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-3">
              <div className="skeleton skeleton-circle" style={{ width: 42, height: 42 }} />
              <div style={{ flex: 1 }}><div className="skeleton skeleton-text" style={{ width: '40%' }} /></div>
            </div>
          </div>
          <div className="skeleton-card" style={{ padding: 40 }} />
        </main>
      </>
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


      {/* Modals removed - Hardware shown in Profile tab */}

      {/* Settings modal moved to after main - see line 1470+ */}

      {/* Welcome popup removed - offline gains applied silently */}

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
              <div className="hash-value">{points.toFixed(2)}</div>
              <div className="hash-unit">HP</div>
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
                <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: 12 }}>Min {MIN_HP_REDEEM.toLocaleString()} HP Required</p>

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
                Top 100 Players
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
              <p style={{ color: '#64748b', marginBottom: 8 }}>@{context?.user?.username || 'guest'}</p>
              <span className={`tier-badge ${userTier.class}`}>{userTier.icon} {userTier.name}</span>
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
                  text: `🎮 Come play HashRush with me! Mine crypto and earn USDC rewards. 🚀\n\nUse my link for a 500 HP starter bonus!`,
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
