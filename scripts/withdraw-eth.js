const ethers = require('ethers');
require('dotenv').config();

const RPC_URL = "https://mainnet.base.org";
const CONTRACT_ADDRESS = "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63";

// Full ABI from the source code we found
const ABI = [
    "function owner() view returns (address)",
    "function withdrawETH() external",
    "function withdrawUSDC(uint256 amount) external"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log("Your Wallet:", wallet.address);

    // Step 1: Check owner
    const owner = await contract.owner();
    console.log("Contract Owner:", owner);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.log("\n❌ Your wallet is NOT the owner of this contract!");
        console.log("Only the owner can call withdrawETH().");
        console.log("You need to use the wallet that DEPLOYED this contract.");
        process.exit(1);
    }

    console.log("\n✅ You ARE the owner! Proceeding to withdraw...");

    // Step 2: Check ETH balance
    const balance = await provider.getBalance(CONTRACT_ADDRESS);
    console.log("Contract ETH Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.log("No ETH to withdraw.");
        process.exit(0);
    }

    // Step 3: Call withdrawETH
    console.log("\nCalling withdrawETH()...");
    const tx = await contract.withdrawETH();
    console.log("TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Success! ETH withdrawn. Gas used:", receipt.gasUsed.toString());

    const newBalance = await provider.getBalance(wallet.address);
    console.log("Your new ETH balance:", ethers.formatEther(newBalance), "ETH");
}

main().catch(console.error);
