const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying HashRush with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Base Mainnet USDC address
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    const HashRush = await ethers.getContractFactory("contracts/HashRush.sol:HashRush");
    const hashRush = await HashRush.deploy(USDC_ADDRESS);

    await hashRush.waitForDeployment();
    const address = await hashRush.getAddress();

    console.log("\n✅ HashRush deployed to:", address);
    console.log("\n📋 Next steps:");
    console.log("1. Send USDC to contract:", address);
    console.log("2. Update CONTRACT_ADDRESS in page.tsx");
    console.log("3. Verify contract on BaseScan");
    console.log("\nVerify command:");
    console.log(`npx hardhat verify --network base ${address} "${USDC_ADDRESS}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
