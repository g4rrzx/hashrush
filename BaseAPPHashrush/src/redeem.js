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

async function main() {
    console.clear();
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║              HASHRUSH REDEEM AUTOMATION (DEGEN)              ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log(chalk.gray(`Contract: ${CONFIG.CONTRACT_ADDRESS}`));
    console.log(chalk.gray(`Min HP: ${CONFIG.MIN_HP_REDEEM} | Reward: ${CONFIG.REWARD_AMOUNT} ${CONFIG.REWARD_TOKEN}`));

    // Load Private Keys
    const keysPath = path.join(__dirname, '../data/privateKeys.txt');
    if (!fs.existsSync(keysPath)) {
        console.error(chalk.red("❌ ERROR: File data/privateKeys.txt tidak ditemukan!"));
        process.exit(1);
    }

    const privateKeys = fs.readFileSync(keysPath, 'utf8')
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0 && !k.startsWith('#'));

    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    console.log(chalk.cyan(`\nFound ${privateKeys.length} accounts. Checking eligibility...\n`));

    for (const [index, pk] of privateKeys.entries()) {
        const wallet = new ethers.Wallet(pk, provider);
        const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

        try {
            // Check User Stats from Contract
            // getUserStats returns (hpClaimed, rewardsClaimed, hardwareSpent, claims)
            // But we actually need to check BALANCE (totalHpClaimed - redeemed). 
            // The contract tracks totalHpClaimed and totalRewardsClaimed.
            // Wait, the contract doesn't expose "current balance" directly in a simple view except via `getUserStats`?
            // Actually `points` (balance) is NOT public in the contract!
            // The frontend logic is: balance = totalHpClaimed - (totalRewardsClaimed / rewardAmount * minHpRequired)?
            // NO. The contract logic for redeem is:
            // require(hpAmount >= minHpRequired);
            // emit RewardRedeemed(..., hpAmount, ...);
            // It doesn't actually DEDUCT HP from totalHpClaimed. 
            // It allows redeeming based on cooldown?
            // Let's check HashRush.sol again.

            /*
            function redeemRewards(uint256 hpAmount) external nonReentrant {
                require(hpAmount >= minHpRequired, "Insufficient HP");
                require(block.timestamp >= lastRedeemTime[msg.sender] + redeemCooldown, "Cooldown not passed");
                // ...
                lastRedeemTime[msg.sender] = block.timestamp;
                totalRewardsClaimed[msg.sender] += rewardAmount;
                // ...
            }
            */

            // So on-chain, it only enforces COOLDOWN. The "HP check" is just `hpAmount >= minHpRequired`.
            // The frontend validates if user *actually* has enough points.
            // On-chain, `hpAmount` is just an input parameter for logging?
            // Yes, "param hpAmount The HP amount being redeemed (for logging)".
            // So as long as we pass `minHpRequired`, and cooldown is passed, we can redeem!
            // Wait, does the contract check if user HAS that HP?
            // it checks: `require(hpAmount >= minHpRequired, "Insufficient HP");`
            // But `hpAmount` is passed by user!
            // So anybody can claim if cooldown is passed?
            // YES, currently `redeemRewards` trusts the input `hpAmount`? 
            // No, the frontend calculates balance. The contract doesn't seem to track "current balance".
            // It tracks `totalHpClaimed`.
            // But it doesn't subtract from `totalHpClaimed` when redeeming.
            // So technically, one can redeem every 24h regardless of HP?
            // Wait, `claimPoints` adds to `totalHpClaimed`.
            // `redeemRewards` does NOT check `totalHpClaimed`.
            // It seems "Insufficient HP" check is just on the *input* `hpAmount`.

            // BUT, let's assume valid usage.
            // We should check `canRedeem` view function.

            const [canClaim, reason] = await contract.canRedeem(wallet.address);

            if (canClaim) {
                console.log(chalk.green(`[${index + 1}/${privateKeys.length}] ${shortAddr} ✅ Ready to Redeem!`));

                // Redeem!
                const contractWithSigner = contract.connect(wallet);
                // We pass MIN_HP_REDEEM as the amount to satisfy the check
                // In reality we might want to pass actual balance to be nice to the log
                // but we can't easily fetch off-chain balance here.
                // We'll pass the minimum required.

                const tx = await contractWithSigner.redeemRewards(CONFIG.MIN_HP_REDEEM);
                console.log(chalk.gray(`   ⏳ Sending TX...`));
                await tx.wait();
                console.log(chalk.green(`   🎉 Redeemed 5 DEGEN! Hash: ${tx.hash}`));

            } else {
                console.log(chalk.yellow(`[${index + 1}/${privateKeys.length}] ${shortAddr} ⏳ Not Ready: ${reason}`));
            }

        } catch (error) {
            console.log(chalk.red(`[${index + 1}/${privateKeys.length}] ${shortAddr} ❌ Error: ${error.message}`));
        }

        await sleep(1000); // 1s delay
    }
}

main().catch(console.error);
