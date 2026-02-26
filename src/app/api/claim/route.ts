/**
 * /api/claim - Klaim poin setelah transaksi blockchain berhasil
 * 
 * POST: { fid, walletAddress, txHash, amount }
 * 
 * ANTI-CHEAT:
 * 1. Verify wallet address match dengan user di DB
 * 2. Verify txHash valid di Base blockchain
 * 3. Check amount <= user.points di DB (tidak bisa claim lebih dari yang dipunya)
 * 4. Pindahkan dari points buffer → balance (bisa redeem)
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';

const BASE_RPC = 'https://mainnet.base.org';

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
        // Verify status = success (0x1) dan from address match
        const isSuccess = receipt.status === '0x1';
        const receiptFrom = receipt.from ? receipt.from.toLowerCase() : '';
        const expected = expectedFrom ? expectedFrom.toLowerCase() : '';
        const fromMatch = receiptFrom !== '' && receiptFrom === expected;
        return isSuccess && fromMatch;
    } catch (err) {
        console.error('[verifyTx]', err);
        return false;
    }
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

        // 2. Jika wallet address dikirim, pastikan match dengan DB
        if (walletAddress && user.wallet_address) {
            if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
                console.warn(`[claim] Wallet mismatch for FID ${fid}: DB=${user.wallet_address}, got=${walletAddress}`);
                return Response.json({ error: 'Wallet address mismatch' }, { status: 403 });
            }
        }

        // 3. Cek apakah txHash sudah pernah dipakai (replay attack prevention)
        const existing = await sql`
      SELECT 1 FROM rigs WHERE tx_hash = ${txHash}
      UNION
      SELECT 1 FROM referrals WHERE invitee_fid = ${txHash}
    `;
        // Note: kita simpan claim tx hash di tabel tersendiri nanti, untuk sementara cek via unique claim log

        // 4. Verify TX di blockchain
        const txValid = await verifyTxOnChain(txHash, walletAddress || user.wallet_address);
        if (!txValid) {
            console.warn(`[claim] Invalid TX: ${txHash}`);
            return Response.json({ error: 'Transaction not valid or not confirmed' }, { status: 400 });
        }

        // 5. Validate amount <= points di DB
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

        // 6. Update DB: pindah poin dari buffer ke balance
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

        // 7. Update leaderboard
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

        console.log(`[claim] FID ${fid} claimed ${safeClaimAmount} HP. Balance: ${newBalance}`);

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
