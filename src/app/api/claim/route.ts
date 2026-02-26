/**
 * /api/claim - Klaim poin setelah user bayar 0.000003 ETH ke Smart Contract
 * 
 * POST: { fid, walletAddress, txHash, amount }
 * 
 * Flow:
 * 1. User kirim 0.000003 ETH ke contract (plain ETH transfer)
 * 2. Server verify TX on-chain (status, from, to)
 * 3. Check TX hasn't been used before (anti-replay)
 * 4. Add claimed amount to balance in DB
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';

const BASE_RPC = 'https://mainnet.base.org';
const CONTRACT_ADDRESS = '0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63';
const MAX_CLAIM_PER_TX = 100000; // Safety cap: max 100K HP per claim

interface TxVerifyResult {
    valid: boolean;
    error?: string;
}

// Wait for TX receipt with retries
async function verifyClaimTx(txHash: string, expectedFrom: string): Promise<TxVerifyResult> {
    const maxRetries = 5;
    const retryDelay = 2000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
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

            if (!receipt) {
                if (attempt < maxRetries - 1) {
                    console.log(`[verifyClaimTx] TX not confirmed yet, retry ${attempt + 1}/${maxRetries}...`);
                    await new Promise(r => setTimeout(r, retryDelay));
                    continue;
                }
                return { valid: false, error: 'Transaction not confirmed yet. Try again in a few seconds.' };
            }

            if (receipt.status !== '0x1') {
                return { valid: false, error: 'Transaction failed on-chain' };
            }

            const receiptFrom = (receipt.from || '').toLowerCase();
            const expected = (expectedFrom || '').toLowerCase();
            if (!receiptFrom || receiptFrom !== expected) {
                return { valid: false, error: 'Sender address mismatch' };
            }

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

        // Ensure claimed_txs table exists for anti-replay
        await sql`
      CREATE TABLE IF NOT EXISTS claimed_txs (
        tx_hash TEXT PRIMARY KEY,
        fid TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        claimed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

        const { fid, walletAddress, txHash, amount } = await req.json();

        if (!fid || !txHash || !amount) {
            return Response.json({ error: 'fid, txHash, and amount required' }, { status: 400 });
        }

        // 1. Anti-replay: check if TX was already used
        const usedTx = await sql`SELECT 1 FROM claimed_txs WHERE tx_hash = ${txHash}`;
        if (usedTx.length > 0) {
            return Response.json({ error: 'This transaction was already used for a claim' }, { status: 400 });
        }

        // 2. Get user from DB
        const users = await sql`SELECT * FROM users WHERE fid = ${fid}`;
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const user = users[0];

        // 3. Wallet address check
        if (walletAddress && user.wallet_address) {
            if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
                return Response.json({ error: 'Wallet address mismatch' }, { status: 403 });
            }
        }

        // 4. Verify TX on-chain (with retries)
        const verification = await verifyClaimTx(txHash, walletAddress || user.wallet_address);
        if (!verification.valid) {
            console.warn(`[claim] TX verification failed: ${verification.error} (txHash: ${txHash})`);
            return Response.json({ error: verification.error }, { status: 400 });
        }

        // 5. Validate amount (safety cap)
        const claimAmount = Math.min(Math.floor(Number(amount)), MAX_CLAIM_PER_TX);
        if (claimAmount <= 0) {
            return Response.json({ error: 'Invalid claim amount' }, { status: 400 });
        }

        // 6. Update DB: add claimed points to balance
        // Mining happens client-side, so we trust the amount after TX verification
        // The ETH payment IS the proof of claim
        const newPoints = 0; // Reset mining buffer after claim
        const newBalance = Number(user.balance) + claimAmount;
        const newTotalEarned = Number(user.total_earned) + claimAmount;

        await sql`
      UPDATE users SET
        points = ${newPoints},
        balance = ${newBalance},
        total_earned = ${newTotalEarned},
        last_mine_at = NOW(),
        last_seen = NOW()
      WHERE fid = ${fid}
    `;

        // 7. Record TX as used (anti-replay)
        await sql`
      INSERT INTO claimed_txs (tx_hash, fid, amount)
      VALUES (${txHash}, ${fid}, ${claimAmount})
      ON CONFLICT (tx_hash) DO NOTHING
    `;

        // 8. Update leaderboard
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

        console.log(`[claim] FID ${fid} claimed ${claimAmount} HP (paid 0.000003 ETH). Balance: ${newBalance}`);

        return Response.json({
            success: true,
            claimed: claimAmount,
            newBalance,
            newPoints,
            newTotalEarned
        });
    } catch (err) {
        console.error('[/api/claim POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
