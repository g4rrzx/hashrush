const ethers = require('ethers');

const CONTRACT_ADDRESS = "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63";
const RPC_URL = "https://mainnet.base.org";
const CONTRACT_ABI = [
    "function claimPoints(uint256 amount) external",
    "function buyHardware(string itemId) external payable",
    "function redeemRewards(uint256 hpAmount) external",
    "function canRedeem(address user) external view returns (bool, string memory)",
    "function getRemainingCooldown(address user) external view returns (uint256)"
];

async function test() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const testAddress = "0x47694210254fd19f57f8635a6E1FD1587a150965"; // Example address from earlier

    try {
        const can = await contract.canRedeem(testAddress);
        console.log("canRedeem:", can);
    } catch (e) {
        console.error("canRedeem error:", e);
    }

    try {
        const cd = await contract.getRemainingCooldown(testAddress);
        console.log("Cooldown:", cd.toString());
    } catch (e) {
        console.error("cooldown error:", e);
    }
}

test();
