const hre = require("hardhat");
const fs = require("fs");

async function main() {
    // Flattening HashRush.sol
    const flattened = await hre.run("flatten", { files: ["contracts/HashRush.sol"] });

    // Cleanup potential leftover logs if any (unlikely via HRE run return value)
    // But just in case, ensure it starts with comments or pragma

    fs.writeFileSync("contracts/HashRush_Flat_Clean.sol", flattened);
    console.log("Successfully flattened to contracts/HashRush_Flat_Clean.sol");
}

main().catch(console.error);
