"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import sdk, { type Context } from "@farcaster/frame-sdk";
import { Zap, ShoppingBag, Trophy, Power, Ticket, Coins, Cpu, Share2, Gift, Wallet, Target, User, Clock, ArrowDownToLine, Settings, Moon, Sun, Bell, BellOff, Sparkles, Package, DollarSign, RotateCw, UserPlus, Copy } from "lucide-react";
import { ethers } from "ethers";

const OWNER_ADDRESS = "0xe0E8222404BFb2Bf10B3A38A758b0Cff0336cd5B"; // Checksummed Verified
const CONTRACT_ADDRESS = "0x3F65f80F006E5B2f74a4ED2D830dBec260A331B8";
const USDC_REWARD = 0.01; // 0.01 USDC per redeem
const MIN_HP_REDEEM = 5000;

const CONTRACT_ABI = [
  "function redeem(uint256 hpAmount) external",
  "function canRedeem(address user) external view returns (bool, string memory)",
  "function getRemainingCooldown(address user) external view returns (uint256)",
  "function getPoolBalance() external view returns (uint256)",
  "function rewardAmount() external view returns (uint256)"
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
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
  const [leaderboardData, setLeaderboardData] = useState<{ name: string, score: number, tier: string }[]>([]);

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
          score: Math.floor(totalEarned),
          tier: getTier(totalEarned).name
        })
      });
    } catch (e) {
      console.error('Score sync failed', e);
    }
  }, [context, totalEarned]);

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaderboardData(data);
      }
    } catch (e) {
      console.error('Leaderboard fetch failed', e);
    }
  };

  useEffect(() => {
    if (tab === 'rank') {
      fetchLeaderboard();
      syncScore();
    }
  }, [tab, syncScore]);

  // Sync score periodically
  useEffect(() => {
    const timer = setInterval(() => {
      if (totalEarned > 100) syncScore();
    }, 60000); // Every 1 min
    return () => clearInterval(timer);
  }, [syncScore, totalEarned]);
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

  // Check wallet on load
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
        }
      } catch { }
    };

    if (!isLoading) checkWallet();
    if (!isLoading) checkWallet();
  }, [isLoading, BASE_CHAIN_ID]);

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

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

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

  // Fetch referral stats
  useEffect(() => {
    const fetchReferralStats = async () => {
      if (!context?.user?.fid) return;
      try {
        const res = await fetch(`/api/referral?fid=${context.user.fid}`);
        const data = await res.json();
        if (data.count) setReferralCount(data.count);
        if (data.referrals) setReferralList(data.referrals);
      } catch (e) {
        console.error('Referral stats failed', e);
      }
    };
    if (tab === 'profile') fetchReferralStats();
  }, [tab, context]);

  const getReferralLink = () => {
    const fid = context?.user?.fid || '0';
    // Use official Farcaster Directory format
    const baseUrl = "https://farcaster.xyz/miniapps/wbQq2mQrDpWS/hashrush";
    const referralUrl = `${baseUrl}?ref=${fid}`;
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

  useEffect(() => {
    const init = async () => {
      const ctx = await sdk.context;
      setContext(ctx);
      sdk.actions.ready();
    };
    if (sdk && !context) init();

    setTimeout(() => {
      const saved = localStorage.getItem('hr_v12');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const elapsed = (Date.now() - data.time) / 1000;
          const gain = (data.hashRate / 1000) * Math.min(elapsed, 86400);

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
            setTimeout(() => setShowTapGame(true), 1500); // Auto popup daily game
          }

          if (gain > 50) { setOfflineGain(gain); setShowWelcome(true); }

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
        } catch (e) { console.error(e); }
      } else {
        setShowOnboarding(true);
      }
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const save = () => {
      localStorage.setItem('hr_v12', JSON.stringify({
        points: pointsRef.current, balance, totalEarned, inventory, ownedHardware, hashRate, streak,
        badges: unlockedBadges, lastTapGameDate, transactions: transactions.slice(-20),
        darkMode, soundEnabled, notificationsEnabled, time: Date.now()
      }));
    };
    const interval = setInterval(save, 5000);
    document.addEventListener('visibilitychange', () => document.hidden && save());
    return () => clearInterval(interval);
  }, [isLoading, balance, totalEarned, inventory, ownedHardware, hashRate, streak, unlockedBadges, lastTapGameDate, transactions, darkMode, soundEnabled, notificationsEnabled]);

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
      const value = ethers.parseEther("0.00001");

      console.log("Sending Claim TX");

      // Transaction parameters details for wallet visibility
      const txParams = {
        to: OWNER_ADDRESS as `0x${string}`,
        from: walletAddress as `0x${string}`,
        value: ("0x" + value.toString(16)) as `0x${string}`,
        data: "0x" as `0x${string}`, // Empty data for ETH transfer
        chainId: "0x2105" as `0x${string}` // Base Mainnet
      };

      console.log("TX Params:", txParams);

      const tx = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });

      if (tx) {
        // Success Logic...
        const claimed = Math.floor(points);
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

      const txParams = {
        to: OWNER_ADDRESS as `0x${string}`,
        from: walletAddress as `0x${string}`,
        value: ("0x" + cost.toString(16)) as `0x${string}`,
        data: "0x" as `0x${string}`,
        chainId: "0x2105" as `0x${string}`
      };

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
  const handleRedeemUSDC = async () => {
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

    // Check Pool Balance
    if (parseFloat(contractPoolBalance) < USDC_REWARD) {
      showToast('⚠️', 'Reward Pool Empty - Try again later');
      return;
    }

    // Check Cooldown
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
      const data = iface.encodeFunctionData("redeem", [BigInt(balance)]);

      // Call contract directly via SDK provider
      const tx = await sdk.wallet.ethProvider.request({
        method: "eth_sendTransaction",
        params: [{
          to: CONTRACT_ADDRESS as `0x${string}`, // Already checks validity
          data: data as `0x${string}`,
          value: "0x0" // No ETH sent, only gas paid
        }]
      });

      if (tx) {
        // Success
        setBalance(0);
        if (soundEnabled) playKaching();
        haptic('heavy');
        triggerConfetti();
        showToast('💵', `Claimed ${USDC_REWARD} USDC!`);
        setTransactions(prev => [...prev, { type: 'claim', amount: `+${USDC_REWARD} USDC`, time: Date.now() }]);
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

      {/* Spin Modal */}
      {showSpinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => !spinning && setShowSpinModal(false)}>
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-700 relative" onClick={(e) => e.stopPropagation()}>

            {!spinning && !spinResult && (
              <button
                onClick={() => setShowSpinModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-white text-lg transition"
              >
                ×
              </button>
            )}

            <h2 className="text-2xl font-black mb-2 text-white">🎰 Lucky Spin</h2>
            <p className="text-slate-400 text-sm mb-4">Spin to win amazing rewards!</p>

            <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: '2rem', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>▼</div>
              <div className={`spin-modal-wheel ${spinning ? 'spinning' : ''}`} style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 0 60px rgba(59, 130, 246, 0.3), inset 0 0 0 8px rgba(255,255,255,0.1)',
                transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
                border: '4px solid rgba(255,255,255,0.2)'
              }}>
                {SPIN_REWARDS.map((reward, i) => (
                  <div key={i} className="wheel-segment" style={{ transform: `rotate(${i * 45}deg)`, background: reward.color }}>
                    <div className="wheel-segment-content">
                      <span className="wheel-segment-icon" style={{ fontSize: '1.5rem', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{reward.icon}</span>
                      <span className="wheel-segment-label" style={{ fontSize: '0.6rem', fontWeight: 700 }}>{reward.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 60, height: 60, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.5)', zIndex: 5, border: '3px solid white' }}>🎯</div>
            </div>

            {spinResult ? (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30">
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>{spinResult.icon}</div>
                <div className="text-2xl font-black text-white mb-2">{spinResult.label}</div>
                <div className="text-slate-300 text-sm mb-4">
                  {spinResult.type === 'points' && '⚡ Added to your HP balance!'}
                  {spinResult.type === 'ticket' && '🎫 Lottery ticket added!'}
                  {spinResult.type === 'boost' && '🚀 Mining speed boosted!'}
                </div>
                <button className="btn-primary w-full" onClick={() => setShowSpinModal(false)}>🎉 Awesome!</button>
              </div>
            ) : spinning ? (
              <div className="text-yellow-400 font-bold animate-pulse text-lg">🎲 Spinning...</div>
            ) : (
              <div>
                <div className="bg-slate-700/50 rounded-xl p-3 mb-4">
                  <div className="text-slate-400 text-xs mb-1">Spin Cost</div>
                  <div className="text-white font-bold">0.00001 ETH</div>
                </div>
                <button
                  onClick={handleSpin}
                  disabled={isTransacting}
                  className="btn-primary w-full py-4 text-lg"
                >
                  {isTransacting ? '⏳ Waiting...' : '🎰 SPIN NOW!'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hardware Collection */}
      {showHardware && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[80vh] overflow-auto">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🖥️</div>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>My Hardware</h2>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{inventory.rigs} rigs active</p>
                </div>
              </div>
              <button onClick={() => setShowHardware(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            <div className="hardware-total-stats">
              <div className="hardware-total-stat">
                <div className="hardware-total-value">{hashRate}</div>
                <div className="hardware-total-label">MH/s Total</div>
              </div>
              <div className="hardware-total-stat">
                <div className="hardware-total-value">{inventory.rigs}</div>
                <div className="hardware-total-label">Rigs Owned</div>
              </div>
            </div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Your Rigs</h3>
            {ownedHardware.map(hw => {
              const item = HARDWARE_ITEMS.find(h => h.id === hw.id);
              if (!item) return null;
              return (
                <div key={hw.id} className="hardware-card">
                  <div className="hardware-icon">{item.icon}</div>
                  <div className="hardware-info">
                    <div className="hardware-name">{item.name}</div>
                    <div className="hardware-stats">
                      <span className="hardware-stat count">×{hw.count}</span>
                      <span className="hardware-stat">+{hw.totalBoost} MH/s</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {ownedHardware.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No hardware yet. Visit Shop!</p>
            )}
          </div>
        </div>
      )}

      {/* Settings / Welcome / TapGame modals... (same as before, abbreviated) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="settings-item">
              <div className="settings-label">
                <div className="settings-icon" style={{ background: darkMode ? '#312e81' : '#fef3c7' }}>
                  {darkMode ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-yellow-500" />}
                </div>
                <div><div style={{ fontWeight: 600 }}>Dark Mode</div></div>
              </div>
              <div className={`toggle-switch ${darkMode ? 'active' : ''}`} onClick={() => setDarkMode(!darkMode)} />
            </div>
            <div className="settings-item">
              <div className="settings-label">
                <div className="settings-icon" style={{ background: '#dcfce7' }}><Sparkles size={20} className="text-green-500" /></div>
                <div><div style={{ fontWeight: 600 }}>Sound Effects</div></div>
              </div>
              <div className={`toggle-switch ${soundEnabled ? 'active' : ''}`} onClick={() => setSoundEnabled(!soundEnabled)} />
            </div>
            <div className="settings-item">
              <div className="settings-label">
                <div className="settings-icon" style={{ background: notificationsEnabled ? '#dbeafe' : '#f1f5f9' }}>
                  {notificationsEnabled ? <Bell size={20} className="text-blue-500" /> : <BellOff size={20} className="text-gray-400" />}
                </div>
                <div><div style={{ fontWeight: 600 }}>Notifications</div></div>
              </div>
              <div className={`toggle-switch ${notificationsEnabled ? 'active' : ''}`} onClick={notificationsEnabled ? () => setNotificationsEnabled(false) : enableNotifications} />
            </div>
          </div>
        </div>
      )}

      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center"><Zap size={40} className="text-white" /></div>
            <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
            <div className="bg-blue-50 rounded-2xl p-6 mb-6"><div className="text-4xl font-black text-blue-600">+{offlineGain.toFixed(0)}</div><div className="text-sm text-blue-500">Offline HP</div></div>
            <button onClick={() => { haptic('medium'); if (soundEnabled) playKaching(); setShowWelcome(false); }} className="btn-primary">Collect</button>
          </div>
        </div>
      )}

      {showTapGame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <div className="relative bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(59,130,246,0.3)] animate-in zoom-in duration-300">
            {/* Game Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Target size={18} className="text-blue-500" />
                </div>
                <span className="font-bold dark:text-white">Daily Rush</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${tapTimeLeft < 4 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                {tapTimeLeft}s left
              </div>
            </div>

            {tapGameActive ? (
              <>
                <div className="mb-8">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-bold">Current Combo</div>
                  <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600 drop-shadow-sm">
                    {tapCount}
                  </div>
                </div>

                {/* Big Animated Tap Button */}
                <div className="relative py-12">
                  <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                  <button
                    onPointerDown={(e) => {
                      haptic('medium');
                      setTapCount(c => c + 1);
                      // Add temporary scale effect via style if needed, or rely on active:scale
                    }}
                    className="relative w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_15px_35px_-5px_rgba(59,130,246,0.5)] flex items-center justify-center active:scale-90 active:shadow-inner transition-transform duration-75 group ring-8 ring-blue-500/10"
                  >
                    <div className="w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center">
                      <Zap size={48} className="text-white fill-white group-active:scale-125 transition-transform" />
                    </div>
                  </button>
                </div>

                <p className="mt-6 text-slate-400 text-sm font-medium">Tap as fast as you can!</p>
              </>
            ) : (
              <div className="py-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Sparkles size={40} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-black mb-1 dark:text-white">Game Over!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Great tapping speed!</p>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-700/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-bold mb-1">Total Taps</div>
                      <div className="text-2xl font-black dark:text-white">{tapCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-bold mb-1">Earned</div>
                      <div className="text-2xl font-black text-blue-500">+{Math.floor(tapCount * 0.5)} HP</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowTapGame(false)}
                  className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity"
                >
                  Collect Reward
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                padding: '6px 12px',
                background: isCorrectChain ? '#dcfce7' : '#fef3c7',
                color: isCorrectChain ? '#166534' : '#92400e',
                border: `1px solid ${isCorrectChain ? '#86efac' : '#fcd34d'}`,
                borderRadius: 10,
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: isCorrectChain ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {isCorrectChain ? '🔵' : '⚠️'} {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="settings-btn"><Settings size={16} /></button>
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
            <div className="jackpot-timer">
              <div className="jackpot-left"><h4><Gift size={14} /> Jackpot</h4><p>1 ETH Prize</p></div>
              <div className="jackpot-countdown">
                <div className="jackpot-time-box"><span className="jackpot-time-value">{countdown.days}</span><span className="jackpot-time-label">D</span></div>
                <div className="jackpot-time-box"><span className="jackpot-time-value">{countdown.hours}</span><span className="jackpot-time-label">H</span></div>
                <div className="jackpot-time-box"><span className="jackpot-time-value">{countdown.mins}</span><span className="jackpot-time-label">M</span></div>
              </div>
            </div>

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

            {/* Daily Tap Game Modal */}
            {showTapGame && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-blue-500 relative overflow-hidden">

                  <button
                    onClick={() => setShowTapGame(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <span style={{ fontSize: '1.5rem' }}>×</span>
                  </button>

                  {!tapGameActive ? (
                    <div className="animate-in zoom-in duration-300">
                      <div className="text-4xl mb-2">⚡</div>
                      <h2 className="text-2xl font-black mb-2 text-blue-600 dark:text-blue-400 uppercase italic">Daily Surge!</h2>
                      <p className="text-slate-600 dark:text-slate-300 mb-6">Tap as fast as you can in 10 seconds to generate extra power!</p>
                      <button
                        onClick={() => { setTapGameActive(true); setTapTimeLeft(10); setTapCount(0); haptic('heavy'); }}
                        className="btn-primary w-full text-lg py-4 shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
                      >
                        START SURGE
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-6xl font-black mb-4 text-blue-500 tabular-nums">{tapTimeLeft}s</div>
                      <div className="text-sm uppercase tracking-widest text-slate-400 mb-8 font-bold">Time Remaining</div>

                      <button
                        onClick={() => { setTapCount(c => c + 1); haptic('light'); playKaching(); }}
                        className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_40px_rgba(59,130,246,0.6)] active:scale-90 transition-all flex items-center justify-center mx-auto border-4 border-white dark:border-slate-800"
                      >
                        <div className="text-white font-black text-5xl pointer-events-none drop-shadow-md">{tapCount}</div>
                      </button>
                      <p className="mt-6 text-slate-500 animate-pulse font-bold">TAP FAST!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            <button onClick={canPlayTapGame ? () => { setTapCount(0); setTapTimeLeft(10); setTapGameActive(true); setShowTapGame(true); } : undefined} disabled={!canPlayTapGame} className="card w-full flex items-center gap-4" style={{ background: canPlayTapGame ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#f1f5f9', border: canPlayTapGame ? '1px solid #fcd34d' : '1px solid #e2e8f0', cursor: canPlayTapGame ? 'pointer' : 'default', padding: 16 }}>
              <div style={{ fontSize: '2rem' }}>🎮</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: canPlayTapGame ? '#92400e' : '#94a3b8' }}>Daily Tap Game</div></div>
              {canPlayTapGame && <Target size={20} className="text-yellow-600" />}
            </button>
          </div>
        )}

        {tab === 'store' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={handleSpin} className="btn-primary" style={{ marginBottom: 20 }}>🎰 Spin Wheel - 0.001 ETH</button>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Hardware</h2>
            {HARDWARE_ITEMS.map(item => (
              <div key={item.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                    <div><div style={{ fontWeight: 700 }}>{item.name}</div><div style={{ fontSize: '0.75rem', color: '#22c55e' }}>+{item.boost} MH/s</div></div>
                  </div>
                  <button onClick={() => handleBuy(item)} style={{ padding: '10px 16px', borderRadius: 10, background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{item.price} Ξ</button>
                </div>
              </div>
            ))}
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: 16, marginBottom: 10 }}>Redeem ({balance.toLocaleString()} HP)</h3>

            {/* USDC Redeem Card Centered */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <button onClick={handleRedeemUSDC} disabled={balance < MIN_HP_REDEEM} className="card" style={{
                width: '100%',
                maxWidth: 320,
                background: balance >= MIN_HP_REDEEM ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f1f5f9',
                border: 'none',
                padding: '24px 20px',
                borderRadius: 24,
                cursor: balance >= MIN_HP_REDEEM ? 'pointer' : 'not-allowed',
                color: balance >= MIN_HP_REDEEM ? 'white' : '#94a3b8',
                boxShadow: balance >= MIN_HP_REDEEM ? '0 10px 25px -5px rgba(16, 185, 129, 0.4)' : 'none',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}>
                <div style={{
                  width: 60,
                  height: 60,
                  background: balance >= MIN_HP_REDEEM ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <DollarSign size={32} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>{USDC_REWARD} USDC</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: 4 }}>Min {MIN_HP_REDEEM.toLocaleString()} HP Required</p>
                <p style={{ fontSize: '0.7rem', color: '#cbd5e1', marginBottom: 12 }}>Pool: {contractPoolBalance} USDC</p>

                <div style={{
                  background: balance >= MIN_HP_REDEEM ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                  padding: '8px 16px',
                  borderRadius: 12,
                  display: 'inline-block',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  {balance >= MIN_HP_REDEEM ? (parseFloat(contractPoolBalance) >= USDC_REWARD ? '✨ Ready to Claim' : '⚠️ Pool Empty') : `Need ${(MIN_HP_REDEEM - balance).toLocaleString()} HP more`}
                </div>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => handleRedeem('ticket', 1000)} className="card" style={{ textAlign: 'center', padding: 20, cursor: 'pointer' }}><Ticket size={24} className="text-yellow-500" style={{ margin: '0 auto 8px' }} /><div style={{ fontWeight: 700 }}>1 Ticket</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>1,000 HP</div></button>
              <button onClick={() => handleRedeem('token', 5000)} className="card" style={{ textAlign: 'center', padding: 20, cursor: 'pointer' }}><Coins size={24} className="text-purple-500" style={{ margin: '0 auto 8px' }} /><div style={{ fontWeight: 700 }}>1 $RUSH</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>5,000 HP</div></button>
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

            <div className="flex justify-between items-center mt-8 mb-4">
              <h3 className="text-lg font-black dark:text-white">Leaderboard</h3>
              <button
                onClick={() => { haptic('medium'); fetchLeaderboard(); showToast('🔄', 'Ranking refreshed!'); }}
                className="text-blue-500 text-sm font-bold flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full"
              >
                <RotateCw size={14} /> Refresh
              </button>
            </div>

            <div className="leaderboard-list">
              {leaderboardData.map((user, i) => (
                <div key={i} className="leaderboard-row">
                  <div className="leaderboard-rank">{i + 1}</div>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="leaderboard-name">@{user.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="leaderboard-score">{user.score.toLocaleString()} HP</div>
                    <div className="text-[10px] opacity-60 font-bold uppercase">{user.tier}</div>
                  </div>
                </div>
              ))}
              <div className="leaderboard-row self">
                <div className="leaderboard-rank">-</div>
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">
                    {context?.user?.displayName?.[0].toUpperCase() || 'U'}
                  </div>
                  <div className="leaderboard-name">@{context?.user?.username || 'you'} (You)</div>
                </div>
                <div className="text-right">
                  <div className="leaderboard-score">{totalEarned.toLocaleString()} HP</div>
                  <div className="text-[10px] opacity-60 font-bold uppercase">{userTier.name}</div>
                </div>
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
                onClick={() => sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(`🎮 Come play HashRush with me! Mine crypto and earn USDC rewards. 🚀\n\nUse my link for a 500 HP starter bonus!`)}&embeds[]=${encodeURIComponent(getReferralLink())}`)}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                <Share2 size={18} /> Invite Friends
              </button>
            </div>

            <button onClick={() => setShowHardware(true)} className="btn-secondary" style={{ marginTop: 16, marginBottom: 16 }}><Package size={18} /> View Hardware</button>
            <button
              onClick={() => sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(`🚀 Mining on HashRush!\n⚡ ${totalEarned.toLocaleString()} HP\n🏆 ${userTier.name} Tier`)}&embeds[]=${encodeURIComponent(getReferralLink())}`)}
              className="btn-primary"
            >
              <Share2 size={18} /> Share Stats
            </button>
          </div>
        )}
      </main>

      {/* Settings Modal - Popup Style */}
      {/* Settings Modal - Popup Style */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <span className="text-xl font-bold leading-none">×</span>
            </button>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-orange-400" />}
                  <span className="font-bold">Dark Mode</span>
                </div>
                <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-7 rounded-full transition-colors relative ${darkMode ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${darkMode ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Bell size={20} className="text-emerald-500" /> : <BellOff size={20} className="text-slate-400" />}
                  <span className="font-bold">Sound Effects</span>
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-7 rounded-full transition-colors relative ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${soundEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400">HashRush v1.2</p>
            </div>
          </div>
        </div>
      )}

      <div className="nav-bar">{[{ id: 'mine', icon: Zap, label: 'Mine' }, { id: 'store', icon: ShoppingBag, label: 'Shop' }, { id: 'rank', icon: Trophy, label: 'Rank' }, { id: 'profile', icon: User, label: 'Profile' }].map(item => (<button key={item.id} onClick={() => { haptic('light'); setTab(item.id as Tab); }} className={`nav-item ${tab === item.id ? 'active' : ''}`}><item.icon size={20} /><span>{item.label}</span></button>))}</div>
    </>
  );
}
