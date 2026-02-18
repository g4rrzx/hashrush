const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63";
    const DEGEN_ADDRESS = "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed";

    // 5 DEGEN (18 decimals)
    const REWARD_AMOUNT = ethers.parseUnits("5", 18);
    const MIN_HP = 2500;

    console.log(`Configuring HashRush at ${CONTRACT_ADDRESS}...`);

    // const HashRush = await ethers.getContractFactory("contracts/HashRush.sol:HashRush");
    // const contract = HashRush.attach(CONTRACT_ADDRESS);
    const contract = await ethers.getContractAt("contracts/HashRush.sol:HashRush", CONTRACT_ADDRESS);

    // 1. Set Reward Token
    console.log(`Setting reward token to DEGEN (${DEGEN_ADDRESS})...`);
    let tx = await contract.setRewardToken(DEGEN_ADDRESS);
    await tx.wait();
    console.log("✅ Reward Token updated.");

    // 2. Set Reward Amount
    console.log(`Setting reward amount to 5 DEGEN (${REWARD_AMOUNT.toString()})...`);
    tx = await contract.setRewardAmount(REWARD_AMOUNT);
    await tx.wait();
    console.log("✅ Reward Amount updated.");

    // 3. Set Min HP
    console.log(`Setting Min HP to ${MIN_HP}...`);
    tx = await contract.setMinHpRequired(MIN_HP);
    await tx.wait();
    console.log("✅ Min HP updated.");

    console.log("🎉 Configuration Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
