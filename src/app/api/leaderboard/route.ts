// Leaderboard API using Vercel Blob Storage with fallback
import { put, list, del } from '@vercel/blob';

const LEADERBOARD_FILE = 'leaderboard.json';

interface LeaderboardEntry {
    fid: string;
    name: string;
    score: number;
    tier: string;
    lastUpdated: number;
}

// In-memory fallback when Blob is not configured
let memoryLeaderboard: LeaderboardEntry[] = [];

// Check if Blob token is configured
const isBlobConfigured = (): boolean => {
    return !!process.env.BLOB_READ_WRITE_TOKEN;
};

// Get leaderboard data from Blob
async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
    // If Blob not configured, use memory
    if (!isBlobConfigured()) {
        console.log('Blob not configured, using memory store');
        return memoryLeaderboard;
    }

    try {
        const { blobs } = await list({ prefix: LEADERBOARD_FILE });

        if (blobs.length === 0) {
            return [];
        }

        const latestBlob = blobs[0];
        const response = await fetch(latestBlob.url);

        if (!response.ok) {
            console.error('Failed to fetch blob:', response.status);
            return memoryLeaderboard;
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error reading leaderboard from Blob:', error);
        return memoryLeaderboard;
    }
}

// Save leaderboard data to Blob
async function saveLeaderboardData(data: LeaderboardEntry[]): Promise<boolean> {
    // Always update memory as backup
    memoryLeaderboard = data;

    // If Blob not configured, just use memory
    if (!isBlobConfigured()) {
        console.log('Blob not configured, saved to memory only');
        return true;
    }

    try {
        // Delete old blobs first
        const { blobs } = await list({ prefix: LEADERBOARD_FILE });
        for (const blob of blobs) {
            try {
                await del(blob.url);
            } catch (e) {
                // Ignore delete errors
            }
        }

        // Save new data
        await put(LEADERBOARD_FILE, JSON.stringify(data), {
            access: 'public',
            contentType: 'application/json',
        });

        return true;
    } catch (error) {
        console.error('Error saving leaderboard to Blob:', error);
        // Memory is already updated, so return true anyway
        return true;
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
        await saveLeaderboardData(leaderboard);

        return Response.json({
            success: true,
            totalPlayers: leaderboard.length,
            yourScore: userData.score,
            blobConfigured: isBlobConfigured()
        });
    } catch (error) {
        console.error('Leaderboard POST error:', error);
        return Response.json({ error: 'Failed to update score', details: String(error) }, { status: 500 });
    }
}
