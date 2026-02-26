/**
 * /api/redeem - Server sends 20 DEGEN to user's wallet
 * 
 * POST: { fid, walletAddress }
 * 
 * Flow:
 * 1. Server checks DB balance >= 2500 HP
 * 2. Server checks 24h cooldown
 * 3. Server sends 20 DEGEN from Admin Wallet to user
 * 4. Deduct 2500 HP from DB balance
 * 
 * NO client-side TX needed! Server handles everything.
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';
import { ethers } from 'ethers';

const BASE_RPC = 'https://mainnet.base.org';
const DEGEN_CONTRACT = '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed';
const MIN_HP_REDEEM = 2500;
const DEGEN_REWARD = 20; // 20 DEGEN per redeem
const REDEEM_COOLDOWN_HOURS = 24;

const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)'
];

async function sendDegen(toAddress: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        if (!process.env.PRIVATE_KEY) {
            return { success: false, error: 'Server wallet not configured' };
        }

        const provider = new ethers.JsonRpcProvider(BASE_RPC);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const degen = new ethers.Contract(DEGEN_CONTRACT.toLowerCase(), ERC20_ABI, wallet);

        // Check admin DEGEN balance
        const adminBalance = await degen.balanceOf(wallet.address);
        const amountWei = ethers.parseEther(amount.toString());

        if (adminBalance < amountWei) {
            console.error(`[redeem] Admin DEGEN balance insufficient: ${ethers.formatEther(adminBalance)}`);
            return { success: false, error: 'Reward pool empty. Try again later.' };
        }

        // Send DEGEN to user
        const tx = await degen.transfer(toAddress, amountWei);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            return { success: true, txHash: tx.hash };
        } else {
            return { success: false, error: 'DEGEN transfer failed on-chain' };
        }
    } catch (err: any) {
        console.error('[sendDegen]', err);
        return { success: false, error: err.shortMessage || 'Transfer error' };
    }
}

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const { fid, walletAddress } = await req.json();

        if (!fid) {
            return Response.json({ error: 'fid required' }, { status: 400 });
        }

        // 1. Ambil user dari DB
        const users = await sql`SELECT * FROM users WHERE fid = ${fid}`;
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const user = users[0];

        // 2. Determine wallet address
        const targetWallet = walletAddress || user.wallet_address;
        if (!targetWallet) {
            return Response.json({ error: 'No wallet address found' }, { status: 400 });
        }

        // 3. CEK BALANCE DI SERVER — ANTI-CHEAT
        const serverBalance = Number(user.balance);
        if (serverBalance < MIN_HP_REDEEM) {
            console.warn(`[redeem] FID ${fid} tried to redeem with only ${serverBalance} HP`);
            return Response.json({
                error: `Insufficient HP. You have ${Math.floor(serverBalance)} HP, need ${MIN_HP_REDEEM} HP`,
                serverBalance: Math.floor(serverBalance)
            }, { status: 400 });
        }

        // 4. Cek cooldown redeem (24 jam)
        if (user.last_redeem_at) {
            const lastRedeem = new Date(user.last_redeem_at).getTime();
            const hoursSince = (Date.now() - lastRedeem) / (1000 * 3600);
            if (hoursSince < REDEEM_COOLDOWN_HOURS) {
                const hoursLeft = Math.ceil(REDEEM_COOLDOWN_HOURS - hoursSince);
                return Response.json({
                    error: `Cooldown active. Wait ${hoursLeft} more hour(s)`,
                    hoursLeft
                }, { status: 429 });
            }
        }

        // 5. SERVER kirim DEGEN ke user wallet
        console.log(`[redeem] Sending ${DEGEN_REWARD} DEGEN to ${targetWallet} for FID ${fid}...`);
        const sendResult = await sendDegen(targetWallet, DEGEN_REWARD);

        if (!sendResult.success) {
            console.error(`[redeem] DEGEN send failed: ${sendResult.error}`);
            return Response.json({ error: sendResult.error || 'Failed to send DEGEN' }, { status: 500 });
        }

        // 6. Deduct balance dari DB (only after successful DEGEN transfer)
        const newBalance = serverBalance - MIN_HP_REDEEM;

        await sql`
      UPDATE users SET
        balance = ${newBalance},
        last_redeem_at = NOW(),
        last_seen = NOW()
      WHERE fid = ${fid}
    `;

        console.log(`[redeem] FID ${fid} redeemed! ${DEGEN_REWARD} DEGEN sent. Balance: ${serverBalance} → ${newBalance}. TX: ${sendResult.txHash}`);

        return Response.json({
            success: true,
            degenSent: DEGEN_REWARD,
            txHash: sendResult.txHash,
            deducted: MIN_HP_REDEEM,
            newBalance,
            nextRedeemAt: new Date(Date.now() + REDEEM_COOLDOWN_HOURS * 3600 * 1000).toISOString()
        });
    } catch (err) {
        console.error('[/api/redeem POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
