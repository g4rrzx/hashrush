import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { CONFIG, CONTRACT_ABI } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper untuk delay acak
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Stats Keeper (Reset per batch)
let STATS = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    gasUsed: 0n,
    totalCostEth: 0n
};

function resetStats() {
    STATS = {
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        gasUsed: 0n,
        totalCostEth: 0n
    };
}

function printBanner(iteration) {
    console.clear();
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║                HASHRUSH AUTOMATION BOT v2.2                  ║'));
    console.log(chalk.cyan.bold('║           Base Builder Codes: ') + chalk.yellow(CONFIG.BUILDER_CODE) + chalk.cyan.bold('            ║'));
    console.log(chalk.cyan.bold(`║           🔄 Loop Iteration: `) + chalk.yellow(iteration).padEnd(32) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log(chalk.gray(`Target Contract: ${CONFIG.CONTRACT_ADDRESS}`));
    console.log('\n');
}

function printSummary() {
    console.log('\n');
    console.log(chalk.cyan.bold('┌───────────────── BATCH SUMMARY ─────────────────────┐'));
    console.log(chalk.cyan.bold('│') + `  Total Accounts  : ${chalk.white.bold(STATS.total)}`.padEnd(52) + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('│') + `  ✅ Success       : ${chalk.green.bold(STATS.success)}`.padEnd(52) + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('│') + `  ❌ Failed        : ${chalk.red.bold(STATS.failed)}`.padEnd(52) + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('│') + `  ⏭️ Skipped       : ${chalk.yellow.bold(STATS.skipped)}`.padEnd(52) + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('├──────────────────────────────────────────────────────┤'));

    const costEth = ethers.formatEther(STATS.totalCostEth);
    const costUsd = (parseFloat(costEth) * CONFIG.ETH_PRICE_EST).toFixed(6);

    console.log(chalk.cyan.bold('│') + `  ⛽ Total Cost    : ${chalk.white(costEth)} ETH`.padEnd(52) + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('│') + `  💲 Est. USD      : $${chalk.white(costUsd)}`.padEnd(52) + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('└──────────────────────────────────────────────────────┘'));
}

async function processBatch(iteration) {
    printBanner(iteration);
    resetStats();

    // 1. Load Private Keys
    const keysPath = path.join(__dirname, '../data/privateKeys.txt');
    if (!fs.existsSync(keysPath)) {
        console.error(chalk.red("❌ ERROR: File data/privateKeys.txt tidak ditemukan!"));
        process.exit(1);
    }

    const privateKeys = fs.readFileSync(keysPath, 'utf8')
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0 && !k.startsWith('#'));

    if (privateKeys.length === 0) {
        console.error(chalk.red("❌ No private keys found in data/privateKeys.txt"));
        process.exit(1);
    }

    // Shuffle Array (Random Order)
    for (let i = privateKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [privateKeys[i], privateKeys[j]] = [privateKeys[j], privateKeys[i]];
    }

    console.log(chalk.magenta(`🔀 Accounts Shuffled! Starting batch execution...`));

    STATS.total = privateKeys.length;
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

    // 2. Loop Execution
    for (const [index, pk] of privateKeys.entries()) {
        const accountNum = index + 1;
        const total = privateKeys.length;
        let wallet;

        try {
            wallet = new ethers.Wallet(pk, provider);
            const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

            console.log(chalk.white(`\n[${accountNum}/${total}] `) + chalk.blue.bold(`Checking Account: ${shortAddr}`));

            // Cek Saldo
            const balance = await provider.getBalance(wallet.address);

            if (balance === 0n) {
                console.log(chalk.yellow(`   ⚠️  Balance 0 ETH. Skipping.`));
                STATS.skipped++;
                continue;
            }

            // Estimate Gas Price
            const feeData = await provider.getFeeData();
            const gasPrice = feeData.gasPrice || ethers.parseUnits("0.01", "gwei"); // Fallback

            // Randomize Claim Amount (50 - 200)
            const claimAmount = randomInt(50, 200);

            // Construct TX Data
            const iface = new ethers.Interface(CONTRACT_ABI);
            const rawData = iface.encodeFunctionData("claimPoints", [claimAmount]);
            const finalData = rawData + CONFIG.DATA_SUFFIX.slice(2);

            // Estimate Gas Limit
            let gasLimit;
            try {
                gasLimit = await provider.estimateGas({
                    to: CONFIG.CONTRACT_ADDRESS,
                    data: finalData,
                    from: wallet.address
                });
            } catch (e) {
                gasLimit = 100000n; // Fallback
            }

            // Calculate Cost in ETH & USD
            const txCost = gasLimit * gasPrice;
            const txCostEth = ethers.formatEther(txCost);
            const txCostUsd = parseFloat(txCostEth) * CONFIG.ETH_PRICE_EST;

            console.log(chalk.gray(`   ⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei | Est. Cost: $${txCostUsd.toFixed(6)}`));

            // MAX FEE CHECK
            if (txCostUsd > CONFIG.MAX_FEE_USD) {
                console.log(chalk.red(`   ⛔ Too Expensive (Limit: $${CONFIG.MAX_FEE_USD}). Skipping.`));
                STATS.skipped++;
                continue;
            }

            // Send TX
            console.log(chalk.cyan(`   🚀 Claiming ${claimAmount} Points...`));

            const tx = await wallet.sendTransaction({
                to: CONFIG.CONTRACT_ADDRESS,
                data: finalData,
                gasLimit: gasLimit * 120n / 100n // +20% buffer
            });

            console.log(chalk.green(`   ✅ TX Sent! Hash: `) + chalk.underline.white(`https://basescan.org/tx/${tx.hash}`));

            STATS.success++;
            STATS.totalCostEth += txCost;

        } catch (error) {
            console.log(chalk.red(`   ❌ FAILED: ${error.message.split('(')[0]}`));
            STATS.failed++;
        }

        // Random Delay between accounts
        if (index < privateKeys.length - 1) {
            const delay = randomInt(CONFIG.SLEEP_MIN, CONFIG.SLEEP_MAX);
            console.log(chalk.gray(`   💤 Sleeping ${(delay / 1000).toFixed(1)}s before next account...`));
            await sleep(delay);
        }
    }

    printSummary();
}

async function startLoop() {
    let iteration = 1;
    while (true) {
        await processBatch(iteration);

        // Loop Delay
        const loopDelay = randomInt(CONFIG.LOOP_DELAY_MIN, CONFIG.LOOP_DELAY_MAX);
        const nextTime = new Date(Date.now() + loopDelay);

        console.log(chalk.magenta.bold(`\n🛑 Batch Finished. Waiting ${(loopDelay / 60000).toFixed(1)} Minutes for next round...`));
        console.log(chalk.gray(`⏰ Next Run: ${nextTime.toLocaleTimeString()}`));

        await sleep(loopDelay);
        iteration++;
    }
}

startLoop().catch(console.error);
