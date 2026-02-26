/**
 * /api/claim - Klaim poin setelah user bayar 0.000003 ETH ke Smart Contract
 * 
 * POST: { fid, walletAddress, txHash, amount }
 * 
 * Flow:
 * 1. User kirim 0.000003 ETH ke contract (plain ETH transfer)
 * 2. Server verify TX on-chain (status, from, to)
 * 3. Pindahkan points → balance di DB
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';

const BASE_RPC = 'https://mainnet.base.org';
const CONTRACT_ADDRESS = '0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63';

interface TxVerifyResult {
    valid: boolean;
    error?: string;
}

// Wait for TX receipt with retries (TX might not be confirmed immediately)
async function verifyClaimTx(txHash: string, expectedFrom: string): Promise<TxVerifyResult> {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Get TX receipt
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

            // TX not yet confirmed — retry
            if (!receipt) {
                if (attempt < maxRetries - 1) {
                    console.log(`[verifyClaimTx] TX not confirmed yet, retry ${attempt + 1}/${maxRetries}...`);
                    await new Promise(r => setTimeout(r, retryDelay));
                    continue;
                }
                return { valid: false, error: 'Transaction not confirmed yet. Try again in a few seconds.' };
            }

            // Check status = success
            if (receipt.status !== '0x1') {
                return { valid: false, error: 'Transaction failed on-chain' };
            }

            // Check from address
            const receiptFrom = (receipt.from || '').toLowerCase();
            const expected = (expectedFrom || '').toLowerCase();
            if (!receiptFrom || receiptFrom !== expected) {
                return { valid: false, error: 'Sender address mismatch' };
            }

            // Check to address = Smart Contract
            const receiptTo = (receipt.to || '').toLowerCase();
            if (receiptTo !== CONTRACT_ADDRESS.toLowerCase()) {
                return { valid: false, error: 'TX not sent to HashRush contract' };
            }

            return { valid: true };
        } catch (err) {
            console.error(`[verifyClaimTx] attempt ${attempt + 1} error:`, err);
            if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, retryDelay));
                continue;
            }
            return { valid: false, error: 'Verification error' };
        }
    }

    return { valid: false, error: 'Max retries exceeded' };
}

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const { fid, walletAddress, txHash, amount } = await req.json();

        if (!fid || !txHash || !amount) {
            return Response.json({ error: 'fid, txHash, and amount required' }, { status: 400 });
        }

        // 1. Ambil user dari DB
        const users = await sql`SELECT * FROM users WHERE fid = ${fid}`;
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const user = users[0];

        // 2. Wallet address check
        if (walletAddress && user.wallet_address) {
            if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
                return Response.json({ error: 'Wallet address mismatch' }, { status: 403 });
            }
        }

        // 3. Verify TX on-chain (with retries for pending TX)
        const verification = await verifyClaimTx(txHash, walletAddress || user.wallet_address);
        if (!verification.valid) {
            console.warn(`[claim] TX verification failed: ${verification.error} (txHash: ${txHash})`);
            return Response.json({ error: verification.error }, { status: 400 });
        }

        // 4. Validate amount <= points di DB
        const claimAmount = Number(amount);
        const serverPoints = Number(user.points);

        if (claimAmount <= 0) {
            return Response.json({ error: 'Invalid claim amount' }, { status: 400 });
        }

        // Toleransi 10% karena mining terus berjalan
        const maxAllowed = serverPoints * 1.1;
        const safeClaimAmount = Math.min(claimAmount, maxAllowed);

        if (safeClaimAmount <= 0) {
            return Response.json({ error: 'Insufficient points in server balance' }, { status: 400 });
        }

        // 5. Update DB: pindah poin dari buffer ke balance
        const newPoints = Math.max(0, serverPoints - safeClaimAmount);
        const newBalance = Number(user.balance) + safeClaimAmount;
        const newTotalEarned = Number(user.total_earned) + safeClaimAmount;

        await sql`
      UPDATE users SET
        points = ${newPoints},
        balance = ${newBalance},
        total_earned = ${newTotalEarned},
        last_seen = NOW()
      WHERE fid = ${fid}
    `;

        // 6. Update leaderboard
        await sql`
      INSERT INTO leaderboard (fid, username, pfp_url, score, tier, updated_at)
      VALUES (${fid}, ${user.username}, ${user.pfp_url}, ${newTotalEarned}, 
        ${newTotalEarned >= 50000 ? 'Diamond' : newTotalEarned >= 10000 ? 'Gold' : newTotalEarned >= 1000 ? 'Silver' : 'Bronze'}, 
        NOW())
      ON CONFLICT (fid) DO UPDATE SET
        score = ${newTotalEarned},
        tier = CASE 
          WHEN ${newTotalEarned} >= 50000 THEN 'Diamond'
          WHEN ${newTotalEarned} >= 10000 THEN 'Gold'
          WHEN ${newTotalEarned} >= 1000 THEN 'Silver'
          ELSE 'Bronze'
        END,
        username = COALESCE(${user.username}, leaderboard.username),
        pfp_url = COALESCE(${user.pfp_url}, leaderboard.pfp_url),
        updated_at = NOW()
    `;

        console.log(`[claim] FID ${fid} claimed ${safeClaimAmount} HP (paid 0.000003 ETH). Balance: ${newBalance}`);

        return Response.json({
            success: true,
            claimed: safeClaimAmount,
            newBalance,
            newPoints,
            newTotalEarned
        });
    } catch (err) {
        console.error('[/api/claim POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
