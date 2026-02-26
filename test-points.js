const ethers = require('ethers');

const CONTRACT_ADDRESS = "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63";
const RPC_URL = "https://mainnet.base.org";
const CONTRACT_ABI = [
    "function claimPoints(uint256 amount) external",
    "function buyHardware(string itemId) external payable",
    "function redeemRewards(uint256 hpAmount) external",
    "function canRedeem(address user) external view returns (bool, string memory)",
    "function getRemainingCooldown(address user) external view returns (uint256)",
    "function userPoints(address user) external view returns (uint256)"
];

async function test() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const testAddress = "0x47694210254fd19f57f8635a6E1FD1587a150965";

    try {
        // Try calling userPoints, if it exists
        const pts = await contract.userPoints(testAddress);
        console.log("On-chain points for user:", pts.toString());
    } catch (e) {
        console.log("No userPoints function or error:", e.message);
    }
}

test();
