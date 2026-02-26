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

// GET /api/progress/[fid]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ fid: string }> }
) {
    const { fid } = await params;

    try {
        await initDB();

        if (!fid) {
            return Response.json({ success: false, error: 'FID required' }, { status: 400 });
        }

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
