const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63";
    const MIN_HP = 2500;

    console.log(`Configuring HashRush Min HP at ${CONTRACT_ADDRESS}...`);

    const contract = await ethers.getContractAt("contracts/HashRush.sol:HashRush", CONTRACT_ADDRESS);

    // Set Min HP
    console.log(`Setting Min HP to ${MIN_HP}...`);
    const tx = await contract.setMinHpRequired(MIN_HP);
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Min HP updated.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
