/**
 * /api/leaderboard - Leaderboard dari Neon DB (bukan VPS proxy)
 * 
 * GET → Top 50 players dari DB
 * POST → Upsert score (dipanggil setelah claim)
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';
import { getAuthFid, unauthorized } from '@/lib/auth';

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
        const fid = await getAuthFid(req);
        if (!fid) return unauthorized();

        const { username, pfpUrl } = await req.json();

        // Score is computed server-side from the user's real DB state — never trusted from the client.
        const users = await sql`SELECT username, pfp_url, total_earned, balance FROM users WHERE fid = ${fid}`;
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const u = users[0];
        const score = Math.floor(Number(u.total_earned || 0) + Number(u.balance || 0));
        const tier = score >= 50000 ? 'Diamond' : score >= 10000 ? 'Gold' : score >= 1000 ? 'Silver' : 'Bronze';

        await sql`
      INSERT INTO leaderboard (fid, username, pfp_url, score, tier, updated_at)
      VALUES (${fid}, ${u.username || username || null}, ${u.pfp_url || pfpUrl || null}, ${score}, ${tier}, NOW())
      ON CONFLICT (fid) DO UPDATE SET
        username = COALESCE(${u.username || username || null}, leaderboard.username),
        pfp_url = COALESCE(${u.pfp_url || pfpUrl || null}, leaderboard.pfp_url),
        score = GREATEST(${score}, leaderboard.score),
        tier = ${tier},
        updated_at = NOW()
    `;

        return Response.json({ success: true, score, tier });
    } catch (err) {
        console.error('[/api/leaderboard POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
