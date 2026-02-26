/**
 * /api/leaderboard - Leaderboard dari Neon DB (bukan VPS proxy)
 * 
 * GET → Top 50 players dari DB
 * POST → Upsert score (dipanggil setelah claim)
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';

export async function GET() {
    try {
        await initDB();

        const rows = await sql`
      SELECT fid, username, pfp_url, score, tier
      FROM leaderboard
      ORDER BY score DESC
      LIMIT 50
    `;

        const data = rows.map(r => ({
            fid: r.fid,
            name: r.username || `User ${r.fid}`,
            score: Number(r.score),
            tier: r.tier || 'Bronze',
            pfpUrl: r.pfp_url || null,
        }));

        return Response.json(data);
    } catch (err) {
        console.error('[/api/leaderboard GET]', err);
        return Response.json([]);
    }
}

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const { fid, username, score, tier, pfpUrl } = await req.json();

        if (!fid) {
            return Response.json({ error: 'fid required' }, { status: 400 });
        }

        await sql`
      INSERT INTO leaderboard (fid, username, pfp_url, score, tier, updated_at)
      VALUES (${fid}, ${username || null}, ${pfpUrl || null}, ${score || 0}, ${tier || 'Bronze'}, NOW())
      ON CONFLICT (fid) DO UPDATE SET
        username = COALESCE(${username || null}, leaderboard.username),
        pfp_url = COALESCE(${pfpUrl || null}, leaderboard.pfp_url),
        score = GREATEST(${score || 0}, leaderboard.score),
        tier = ${tier || 'Bronze'},
        updated_at = NOW()
    `;

        return Response.json({ success: true });
    } catch (err) {
        console.error('[/api/leaderboard POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
