/**
 * /api/user - Upsert user saat connect wallet
 * 
 * POST: { fid, walletAddress, username, pfpUrl }
 * → Buat/update user di DB, return full user state
 * 
 * GET: ?fid=xxx
 * → Return user data dari DB
 */
import { NextRequest } from 'next/server';
import { sql, initDB, getUserData, calcHashRate } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await initDB();
        const { searchParams } = new URL(req.url);
        const fid = searchParams.get('fid');

        if (!fid) {
            return Response.json({ error: 'fid required' }, { status: 400 });
        }

        const user = await getUserData(fid);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        return Response.json({ success: true, user });
    } catch (err) {
        console.error('[/api/user GET]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const { fid, walletAddress, username, pfpUrl } = await req.json();

        if (!fid) {
            return Response.json({ error: 'fid required' }, { status: 400 });
        }

        // Check apakah user sudah ada
        const existing = await sql`SELECT fid FROM users WHERE fid = ${fid}`;

        if (existing.length === 0) {
            // User baru — buat dengan default values
            await sql`
        INSERT INTO users (fid, wallet_address, username, pfp_url, hash_rate)
        VALUES (${fid}, ${walletAddress || null}, ${username || null}, ${pfpUrl || null}, 10)
      `;
            console.log(`[user] New user created: ${fid}`);
        } else {
            // Update wallet info kalau ada perubahan
            await sql`
        UPDATE users SET
          wallet_address = COALESCE(${walletAddress || null}, wallet_address),
          username = COALESCE(${username || null}, username),
          pfp_url = COALESCE(${pfpUrl || null}, pfp_url),
          last_seen = NOW()
        WHERE fid = ${fid}
      `;
        }

        const user = await getUserData(fid);
        return Response.json({ success: true, user });
    } catch (err) {
        console.error('[/api/user POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
