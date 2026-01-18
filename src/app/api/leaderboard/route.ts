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
        const data = await response.json();
        return data as LeaderboardEntry[];
    } catch (error) {
        console.error('Error reading leaderboard:', error);
        return [];
    }
}

// Save leaderboard data to Blob
async function saveLeaderboardData(data: LeaderboardEntry[]): Promise<void> {
    try {
        // Delete old blobs first
        const { blobs } = await list({ prefix: LEADERBOARD_FILE });
        for (const blob of blobs) {
            await del(blob.url);
        }

        // Save new data
        await put(LEADERBOARD_FILE, JSON.stringify(data), {
            access: 'public',
            contentType: 'application/json',
        });
    } catch (error) {
        console.error('Error saving leaderboard:', error);
        throw error;
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
        return Response.json([], { status: 200 });
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
        const leaderboard = await getLeaderboardData();

        // Find existing user or create new
        const existingIndex = leaderboard.findIndex(u => u.fid === String(fid));

        const userData: LeaderboardEntry = {
            fid: String(fid),
            name: username || `user_${fid}`,
            score: score || 0,
            tier: tier || 'Bronze',
            lastUpdated: Date.now()
        };

        if (existingIndex >= 0) {
            // Update existing user (keep higher score)
            if (score > leaderboard[existingIndex].score) {
                leaderboard[existingIndex] = userData;
            } else {
                // Update other fields but keep score
                leaderboard[existingIndex].name = userData.name;
                leaderboard[existingIndex].tier = userData.tier;
                leaderboard[existingIndex].lastUpdated = userData.lastUpdated;
            }
        } else {
            // Add new user
            leaderboard.push(userData);
        }

        // Save updated leaderboard
        await saveLeaderboardData(leaderboard);

        return Response.json({ success: true, totalPlayers: leaderboard.length });
    } catch (error) {
        console.error('Leaderboard POST error:', error);
        return Response.json({ error: 'Failed to update score' }, { status: 500 });
    }
}
