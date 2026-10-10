/**
 * /api/progress - Save/Load progress ke/dari Neon DB
 * 
 * GET /api/progress/[fid] → Load user data dari DB
 * POST /api/progress → Sync mining points buffer (server validates hashrate)
 * 
 * ANTI-CHEAT:
 * - Server menghitung ulang poin berdasarkan waktu & hashrate dari DB (bukan dari client)
 * - Jika client kirim hashrate lebih tinggi dari DB → diabaikan
 */
import { NextRequest } from 'next/server';
import { sql, initDB, getUserData, calcHashRate } from '@/lib/db';
import { getAuthFid, unauthorized } from '@/lib/auth';

// GET /api/progress/[fid]
export async function GET(req: NextRequest) {
    try {
        await initDB();

        // Identity comes from the verified token, not the URL.
        const fid = await getAuthFid(req);
        if (!fid) return unauthorized();

        const user = await getUserData(fid);

        if (!user) {
            return Response.json({ success: false, data: null });
        }

        return Response.json({ success: true, data: user });
    } catch (err) {
        console.error('[/api/progress GET]', err);
        return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
