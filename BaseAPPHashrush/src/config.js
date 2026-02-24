import { Attribution } from 'ox/erc8021';

export const CONFIG = {
    // HashRush Contract
    CONTRACT_ADDRESS: "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63",

    // YOUR Builder Code (Verified from page.tsx)
    BUILDER_CODE: "bc_8io601u8",

    // Base Mainnet RPC
    RPC_URL: "https://mainnet.base.org",

    // Generate Suffix correctly using OX
    DATA_SUFFIX: Attribution.toDataSuffix({ codes: ["bc_8io601u8"] }),

    // Transaction Settings
    GAS_LIMIT: 100000n,
    SLEEP_MIN: 30000,   // 30 detik
    SLEEP_MAX: 60000,   // 60 detik

    // Game Settings (DEGEN Rewards)
    REWARD_TOKEN: "DEGEN",
    REWARD_AMOUNT: 5,   // 5 DEGEN
    MIN_HP_REDEEM: 2500, // Min HP to redeem

    // Limits
    MAX_FEE_USD: 0.0008, // Max fee in USD
    ETH_PRICE_EST: 2600 // Fixed ETH Price for estimation
};

export const CONTRACT_ABI = [
    "function claimPoints(uint256 amount) external",
    "function buyHardware(string itemId) external payable",
    "function redeemRewards(uint256 hpAmount) external",
    "function canRedeem(address user) external view returns (bool, string memory)",
    "function getRemainingCooldown(address user) external view returns (uint256)"
];
