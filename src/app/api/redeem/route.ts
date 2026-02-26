/**
 * /api/redeem - Redeem DEGEN rewards setelah transaksi blockchain
 * 
 * POST: { fid, walletAddress, txHash }
 * 
 * ANTI-CHEAT:
 * 1. Server cek balance >= 2500 HP di DB DULU (bukan percaya client)
 * 2. Verify txHash valid di Base blockchain
 * 3. Deduct balance dari DB
 * 4. Prevent: bot tidak bisa redeem tanpa balance nyata di DB
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';

const BASE_RPC = 'https://mainnet.base.org';
const MIN_HP_REDEEM = 2500;
const REDEEM_COOLDOWN_HOURS = 24;

async function verifyTxOnChain(txHash: string, expectedFrom: string): Promise<boolean> {
    try {
        const res = await fetch(BASE_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [txHash],
                id: 1
            })
        });
        const data = await res.json();
        const receipt = data.result;
        if (!receipt) return false;
        const isSuccess = receipt.status === '0x1';
        const fromMatch = receipt.from?.toLowerCase() === expectedFrom?.toLowerCase();
        return isSuccess && fromMatch;
    } catch (err) {
        console.error('[verifyTx]', err);
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const { fid, walletAddress, txHash } = await req.json();

        if (!fid || !txHash) {
            return Response.json({ error: 'fid and txHash required' }, { status: 400 });
        }

        // 1. Ambil user dari DB
        const users = await sql`SELECT * FROM users WHERE fid = ${fid}`;
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const user = users[0];

        // 2. CEK BALANCE DI SERVER — ANTI-CHEAT UTAMA
        const serverBalance = Number(user.balance);
        if (serverBalance < MIN_HP_REDEEM) {
            console.warn(`[redeem] FID ${fid} tried to redeem with only ${serverBalance} HP (need ${MIN_HP_REDEEM})`);
            return Response.json({
                error: `Insufficient HP. You have ${Math.floor(serverBalance)} HP, need ${MIN_HP_REDEEM} HP`,
                serverBalance: Math.floor(serverBalance)
            }, { status: 400 });
        }

        // 3. Cek cooldown redeem (24 jam)
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

        // 4. Verify TX di blockchain — pastikan TX nyata dan dari wallet yang benar
        const txValid = await verifyTxOnChain(txHash, walletAddress || user.wallet_address);
        if (!txValid) {
            console.warn(`[redeem] Invalid TX: ${txHash}`);
            return Response.json({ error: 'Transaction not valid or not confirmed' }, { status: 400 });
        }

        // 5. Deduct balance dari DB
        const newBalance = serverBalance - MIN_HP_REDEEM;

        await sql`
      UPDATE users SET
        balance = ${newBalance},
        last_redeem_at = NOW(),
        last_seen = NOW()
      WHERE fid = ${fid}
    `;

        console.log(`[redeem] FID ${fid} redeemed! Balance: ${serverBalance} → ${newBalance}`);

        return Response.json({
            success: true,
            deducted: MIN_HP_REDEEM,
            newBalance,
            nextRedeemAt: new Date(Date.now() + REDEEM_COOLDOWN_HOURS * 3600 * 1000).toISOString()
        });
    } catch (err) {
        console.error('[/api/redeem POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
