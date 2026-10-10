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
import { ethers } from 'ethers';
import { getAuthFid, unauthorized } from '@/lib/auth';

const BASE_RPC = 'https://mainnet.base.org';
const CONTRACT_ADDRESS = '0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63';
const BUY_HARDWARE_SELECTOR = ethers.id('buyHardware(string)').slice(0, 10); // 0x + 4-byte selector
const BUY_HARDWARE_IFACE = new ethers.Interface(['function buyHardware(string itemId)']);

// Daftar valid rig types dan boost-nya
const RIG_BOOSTS: Record<string, number> = {
    starter: 10,
    turbo: 50,
    farm: 200,
    quantum: 500,
};

async function rpc(method: string, params: unknown[]): Promise<any> {
    const res = await fetch(BASE_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
    });
    const data = await res.json();
    return data.result;
}

/**
 * A rig purchase is valid only when the tx actually called buyHardware(itemId)
 * on our contract, from the user's own wallet, and succeeded.
 */
async function verifyTxOnChain(txHash: string, expectedFrom: string, rigType: string): Promise<boolean> {
    try {
        const receipt = await rpc('eth_getTransactionReceipt', [txHash]);
        if (!receipt) return false;
        if (receipt.status !== '0x1') return false;

        const receiptFrom = (receipt.from || '').toLowerCase();
        const expected = (expectedFrom || '').toLowerCase();
        if (!receiptFrom || receiptFrom !== expected) return false;

        // Must have gone to the HashRush contract
        if ((receipt.to || '').toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) return false;

        // Must be a buyHardware(...) call with the matching item
        const tx = await rpc('eth_getTransactionByHash', [txHash]);
        const input: string = tx?.input || tx?.data || '0x';
        if (!input.startsWith(BUY_HARDWARE_SELECTOR)) return false;

        const [itemId] = BUY_HARDWARE_IFACE.decodeFunctionData('buyHardware', input);
        if (String(itemId).toLowerCase() !== rigType.toLowerCase()) return false;

        return true;
    } catch (err) {
        console.error('[verifyTx]', err);
        return false;
    }
}

export async function GET(req: NextRequest) {
    try {
        await initDB();
        const fid = await getAuthFid(req);
        if (!fid) return unauthorized();

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
        const fid = await getAuthFid(req);
        if (!fid) return unauthorized();

        const { rigType, txHash } = await req.json();

        if (!rigType || !txHash) {
            return Response.json({ error: 'rigType and txHash required' }, { status: 400 });
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

        if (!user.wallet_address) {
            return Response.json({ error: 'No wallet address found' }, { status: 400 });
        }

        // 3. Cek txHash belum pernah dipakai (replay attack)
        const existingRig = await sql`SELECT 1 FROM rigs WHERE tx_hash = ${txHash}`;
        if (existingRig.length > 0) {
            return Response.json({ error: 'TX hash already used' }, { status: 409 });
        }

        // 4. Verify TX di blockchain (to == contract, buyHardware(rigType), from == user wallet)
        const txValid = await verifyTxOnChain(txHash, user.wallet_address, rigType);
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
