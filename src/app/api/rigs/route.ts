/**
 * /api/rigs - Daftarkan RIG yang sudah dibeli ke dalam DB
 * 
 * POST: { fid, walletAddress, rigType, txHash }
 * 
 * ANTI-CHEAT:
 * 1. Verify txHash di blockchain — harus TX yang nyata
 * 2. txHash harus unik (prevent replay attack)
 * 3. Server update hashrate berdasarkan rigs yang dimiliki di DB
 * 4. Client tidak bisa set hashrate sendiri
 * 
 * GET: ?fid=xxx → Return semua rigs user
 */
import { NextRequest } from 'next/server';
import { sql, initDB, calcHashRate } from '@/lib/db';

const BASE_RPC = 'https://mainnet.base.org';

// Daftar valid rig types dan boost-nya
const RIG_BOOSTS: Record<string, number> = {
    starter: 10,
    turbo: 50,
    farm: 200,
    quantum: 500,
};

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
        const receiptFrom = receipt.from ? receipt.from.toLowerCase() : '';
        const expected = expectedFrom ? expectedFrom.toLowerCase() : '';
        const fromMatch = receiptFrom !== '' && receiptFrom === expected;
        return isSuccess && fromMatch;
    } catch (err) {
        console.error('[verifyTx]', err);
        return false;
    }
}

export async function GET(req: NextRequest) {
    try {
        await initDB();
        const { searchParams } = new URL(req.url);
        const fid = searchParams.get('fid');

        if (!fid) return Response.json({ error: 'fid required' }, { status: 400 });

        const rigs = await sql`
      SELECT rig_type, boost, tx_hash, purchased_at
      FROM rigs WHERE fid = ${fid}
      ORDER BY purchased_at DESC
    `;

        const hashRate = await calcHashRate(fid);

        return Response.json({ success: true, rigs, hashRate });
    } catch (err) {
        console.error('[/api/rigs GET]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const { fid, walletAddress, rigType, txHash } = await req.json();

        if (!fid || !rigType || !txHash) {
            return Response.json({ error: 'fid, rigType, and txHash required' }, { status: 400 });
        }

        // 1. Validate rig type
        const boost = RIG_BOOSTS[rigType];
        if (!boost) {
            return Response.json({ error: `Invalid rig type: ${rigType}` }, { status: 400 });
        }

        // 2. Cek user ada di DB
        const users = await sql`SELECT * FROM users WHERE fid = ${fid}`;
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const user = users[0];

        // 3. Cek txHash belum pernah dipakai (replay attack)
        const existingRig = await sql`SELECT 1 FROM rigs WHERE tx_hash = ${txHash}`;
        if (existingRig.length > 0) {
            return Response.json({ error: 'TX hash already used' }, { status: 409 });
        }

        // 4. Verify TX di blockchain
        const txValid = await verifyTxOnChain(txHash, walletAddress || user.wallet_address);
        if (!txValid) {
            console.warn(`[rigs] Invalid TX: ${txHash}`);
            return Response.json({ error: 'Transaction not valid or not confirmed' }, { status: 400 });
        }

        // 5. Insert rig ke DB
        await sql`
      INSERT INTO rigs (fid, rig_type, boost, tx_hash)
      VALUES (${fid}, ${rigType}, ${boost}, ${txHash})
    `;

        // 6. Recalculate dan update hashrate di users table
        const newHashRate = await calcHashRate(fid);
        await sql`
      UPDATE users SET hash_rate = ${newHashRate}, last_seen = NOW()
      WHERE fid = ${fid}
    `;

        console.log(`[rigs] FID ${fid} bought ${rigType} (+${boost} MH/s). New hashrate: ${newHashRate}`);

        return Response.json({
            success: true,
            rigType,
            boost,
            newHashRate
        });
    } catch (err) {
        console.error('[/api/rigs POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
