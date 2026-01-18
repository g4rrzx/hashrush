// Leaderboard API using Vercel Blob Storage
import { put, list, del } from '@vercel/blob';

const LEADERBOARD_FILE = 'leaderboard.json';

interface LeaderboardEntry {
    fid: string;
    name: string;
    score: number;
    tier: string;
    lastUpdated: number;
}

// Get leaderboard data from Blob
async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
    try {
        const { blobs } = await list({ prefix: LEADERBOARD_FILE });

        if (blobs.length === 0) {
            return [];
        }

        // Get the latest blob
        const latestBlob = blobs[0];
        const response = await fetch(latestBlob.url);

        if (!response.ok) {
            console.error('Failed to fetch blob:', response.status);
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error reading leaderboard:', error);
        return [];
    }
}

// Save leaderboard data to Blob
async function saveLeaderboardData(data: LeaderboardEntry[]): Promise<boolean> {
    try {
        // Delete old blobs first
        const { blobs } = await list({ prefix: LEADERBOARD_FILE });
        for (const blob of blobs) {
            try {
                await del(blob.url);
            } catch (e) {
                console.log('Delete old blob failed (ok if first time):', e);
            }
        }

        // Save new data
        await put(LEADERBOARD_FILE, JSON.stringify(data), {
            access: 'public',
            contentType: 'application/json',
        });

        return true;
    } catch (error) {
        console.error('Error saving leaderboard:', error);
        return false;
    }
}

export async function GET() {
    try {
        const leaderboard = await getLeaderboardData();

        // Sort by score descending
        const sorted = leaderboard
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 100);

        return Response.json(sorted);
    } catch (error) {
        console.error('Leaderboard GET error:', error);
        return Response.json([]);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fid, username, score, tier } = body;

        if (!fid) {
            return Response.json({ error: 'FID required' }, { status: 400 });
        }

        // Get current leaderboard
        let leaderboard = await getLeaderboardData();

        // Find existing user or create new
        const fidStr = String(fid);
        const existingIndex = leaderboard.findIndex(u => String(u.fid) === fidStr);

        const userData: LeaderboardEntry = {
            fid: fidStr,
            name: username || `user_${fid}`,
            score: Number(score) || 0,
            tier: tier || 'Bronze',
            lastUpdated: Date.now()
        };

        if (existingIndex >= 0) {
            // Update existing user - always update with higher score
            const currentScore = leaderboard[existingIndex].score || 0;
            if (Number(score) >= currentScore) {
                leaderboard[existingIndex] = userData;
            } else {
                // Just update name/tier/time
                leaderboard[existingIndex].name = userData.name;
                leaderboard[existingIndex].tier = userData.tier;
                leaderboard[existingIndex].lastUpdated = userData.lastUpdated;
            }
        } else {
            // Add new user
            leaderboard.push(userData);
        }

        // Save updated leaderboard
        const saved = await saveLeaderboardData(leaderboard);

        if (!saved) {
            return Response.json({ error: 'Failed to save' }, { status: 500 });
        }

        return Response.json({
            success: true,
            totalPlayers: leaderboard.length,
            yourScore: userData.score
        });
    } catch (error) {
        console.error('Leaderboard POST error:', error);
        return Response.json({ error: 'Failed to update score' }, { status: 500 });
    }
}
