// Leaderboard API with fallback
// Works with Vercel KV or in-memory fallback

let memoryStore: Map<string, any> = new Map();

// Try to use Vercel KV, fallback to memory
let kv: any = null;
try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
} catch (e) {
    console.log('Vercel KV not available, using memory store');
}

export async function GET() {
    try {
        let leaderboard: any[] = [];

        if (kv) {
            try {
                // Get all keys (User IDs)
                const keys = await kv.keys('user:*');

                // Fetch data for all users
                const users = await Promise.all(
                    keys.map(async (key: string) => {
                        const data = await kv.hgetall(key);
                        return data ? { ...data, fid: key.split(':')[1] } : null;
                    })
                );

                // Filter valid users and sort by score (desc)
                leaderboard = users
                    .filter((u): u is any => u !== null)
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 100);
            } catch (kvError) {
                console.error('KV error, using memory:', kvError);
                // Fall through to memory store
                leaderboard = Array.from(memoryStore.values())
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 100);
            }
        } else {
            // Use memory store
            leaderboard = Array.from(memoryStore.values())
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 100);
        }

        return Response.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard GET error:', error);
        return Response.json([], { status: 200 }); // Return empty array instead of error
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fid, username, score, tier } = body;

        if (!fid) return Response.json({ error: 'FID required' }, { status: 400 });

        const userData = {
            name: username || `user_${fid}`,
            score: score || 0,
            tier: tier || 'Bronze',
            lastUpdated: Date.now()
        };

        if (kv) {
            try {
                // Store user data in KV
                await kv.hset(`user:${fid}`, userData);
            } catch (kvError) {
                console.error('KV write error, using memory:', kvError);
                memoryStore.set(fid, userData);
            }
        } else {
            // Use memory store
            memoryStore.set(fid, userData);
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Leaderboard POST error:', error);
        return Response.json({ error: 'Failed to update score' }, { status: 500 });
    }
}
