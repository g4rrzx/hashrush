/**
 * /api/progress - Sync mining buffer ke server
 * 
 * POST: { fid, points, balance, totalEarned, hashRate, streak, ... }
 * → Server VALIDASI hashRate dari DB (dari rigs yang dimiliki)
 * → Points yang disimpan = recalculate berdasarkan hashrate DB
 * 
 * ANTI-CHEAT:
 * - Server tidak percaya `hashRate` dari client
 * - Server recalculate hashrate dari rigs di DB
 * - Points buffer di-cap berdasarkan max offline time
 */
import { NextRequest } from 'next/server';
import { sql, initDB, calcHashRate } from '@/lib/db';

const MAX_OFFLINE_HOURS = 72; // Max 3 days offline mining

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const body = await req.json();
        const { fid, data } = body;

        if (!fid || !data) {
            return Response.json({ error: 'fid and data required' }, { status: 400 });
        }

        // Ambil user dari DB
        const users = await sql`SELECT * FROM users WHERE fid = ${fid}`;
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const user = users[0];

        // ANTI-CHEAT: Hitung hashrate dari rigs di DB, bukan dari client
        const serverHashRate = await calcHashRate(fid);

        // Hitung points yang seharusnya di-accumulate sejak last_mine_at
        const lastMineAt = new Date(user.last_mine_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.min((now - lastMineAt) / 1000, MAX_OFFLINE_HOURS * 3600);

        // Points per second = hashRate / 1000
        const serverPointsGain = (serverHashRate / 1000) * elapsedSeconds;

        // Current points = existing points + server-calculated gain
        const currentServerPoints = Number(user.points) + serverPointsGain;

        // Client-sent points tidak boleh > server-calculated (anti-cheat)
        const clientPoints = Number(data.points) || 0;
        const safePoints = Math.min(clientPoints, currentServerPoints * 1.05); // 5% tolerance

        // Update streak
        const lastSeen = new Date(user.last_seen);
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let newStreak = Number(user.streak);
        if (lastSeen.toDateString() !== today) {
            if (lastSeen.toDateString() === yesterday) newStreak = newStreak + 1;
            else newStreak = 1;
        }

        // Update user di DB
        await sql`
      UPDATE users SET
        points = ${safePoints},
        balance = ${Number(data.balance) || Number(user.balance)},
        total_earned = ${Math.max(Number(data.totalEarned) || 0, Number(user.total_earned))},
        hash_rate = ${serverHashRate},
        streak = ${newStreak},
        username = COALESCE(${data.username || null}, username),
        pfp_url = COALESCE(${data.pfpUrl || null}, pfp_url),
        last_seen = NOW(),
        last_mine_at = NOW()
      WHERE fid = ${fid}
    `;

        return Response.json({
            success: true,
            serverHashRate,
            serverPoints: safePoints,
            streak: newStreak
        });
    } catch (err) {
        console.error('[/api/progress POST]', err);
        return Response.json({ error: 'Internal error' }, { status: 500 });
    }
}
