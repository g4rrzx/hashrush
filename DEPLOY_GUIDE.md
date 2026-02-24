# HashRush Deployment Guide

## ✅ Smart Contract Deployed!

**Contract Address:** `0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63`  
**Network:** Base Mainnet  
**Reward Token:** DEGEN (`0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed`)

---

## 📋 Next Steps to Fund the Contract

1. **Send DEGEN to Contract**  
   Send DEGEN to: `0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63`  
   Each redeem gives user 5 DEGEN

2. **Verify Contract on BaseScan** (Optional)
   ```bash
   npx hardhat verify --network base 0x3F65f80F006E5B2f74a4ED2D830dBec260A331B8 "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
   ```

---

## 🌐 Hosting on Vercel (Step by Step)

### Step 1: Push to GitHub

1. Create a new repository on GitHub (public or private)
2. Initialize git and push:
   ```bash
   cd c:\Users\USER\Documents\BOT\LikeFarcast\miniApps\cryptominer
   git init
   git add .
   git commit -m "Initial commit - HashRush Mini App"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/hashrush.git
   git push -u origin main
   ```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select your **hashrush** repository
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next` (default)
5. Click **"Deploy"**
6. Wait 1-2 minutes for deployment

### Step 3: Get Your Domain

After deployment, Vercel gives you a URL like:
- `https://hashrush-xxxxx.vercel.app`

You can also add a custom domain in Vercel settings.

### Step 4: Update Farcaster Manifest

Update `public/.well-known/farcaster.json`:
```json
{
  "accountAssociation": {...},
  "frame": {
    "version": "1",
    "name": "HashRush",
    "iconUrl": "https://YOUR-DOMAIN.vercel.app/icon.png",
    "homeUrl": "https://YOUR-DOMAIN.vercel.app",
    "splashImageUrl": "https://YOUR-DOMAIN.vercel.app/splash.png",
    "splashBackgroundColor": "#0f172a",
    "webhookUrl": "https://YOUR-DOMAIN.vercel.app/api/webhook"
  }
}
```

### Step 5: Register on Farcaster

1. Go to [Warpcast Mini App Developer Portal](https://warpcast.com/~/developers/new-frame)
2. Submit your app URL
3. Wait for approval

---

## 🎮 Contract Features

| Function | Description |
|----------|-------------|
| `redeem(hpAmount)` | User redeems HP for USDC |
| `canRedeem(user)` | Check if user can redeem |
| `getRemainingCooldown(user)` | Seconds until next redeem |
| `getPoolBalance()` | USDC available in pool |

### Admin Functions (Owner Only)
| Function | Description |
|----------|-------------|
| `setRewardAmount(amount)` | Change USDC reward (in 6 decimals) |
| `setMinHpRequired(hp)` | Change minimum HP requirement |
| `setCooldown(seconds)` | Change cooldown period |
| `withdrawUSDC(amount)` | Withdraw USDC from contract |
| `withdrawETH()` | Withdraw any ETH sent to contract |

---

## 💰 Monetization Summary

| Action | User Pays | You Earn |
|--------|-----------|----------|
| Claim Points | 0.0001 ETH | 0.0001 ETH |
| Buy Hardware | 0.0005-0.005 ETH | 0.0005-0.005 ETH |
| Spin Wheel | 0.001 ETH | 0.001 ETH |
| Redeem USDC | 5000 HP | -0.01 USDC |

---

## 🔒 Security Notes

1. Keep your private key secure
2. Only you (contract owner) can withdraw funds
3. Users cannot redeem more than once per day (24h cooldown)
4. Make sure pool always has enough USDC to cover redeems
