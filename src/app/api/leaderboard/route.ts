import { kv } from '@vercel/kv';

export async function GET() {
    try {
        // Get all keys (User IDs)
        const keys = await kv.keys('user:*');

        // Fetch data for all users
        const users = await Promise.all(
            keys.map(async (key) => {
                const data = await kv.hgetall(key);
                return data ? { ...data, fid: key.split(':')[1] } : null;
            })
        );

        // Filter valid users and sort by score (desc)
        const leaderboard = users
            .filter((u): u is any => u !== null)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 100); // Top 100 only

        return Response.json(leaderboard);
    } catch (error) {
        return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fid, username, score, tier } = body;

        if (!fid) return Response.json({ error: 'FID required' }, { status: 400 });

        // Store user data in KV
        await kv.hset(`user:${fid}`, {
            name: username,
            score: score,
            tier: tier,
            lastUpdated: Date.now()
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: 'Failed to update score' }, { status: 500 });
    }
}
