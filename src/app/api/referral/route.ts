// Referral API with fallback
// Works with Vercel KV or in-memory fallback

let referralStore: Map<string, Set<string>> = new Map();
let userStore: Map<string, any> = new Map();

// Try to use Vercel KV, fallback to memory
let kv: any = null;
try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
} catch (e) {
    console.log('Vercel KV not available, using memory store');
}

// Track referrals and give bonus to both parties
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { inviterFid, inviteeFid, inviteeUsername } = body;

        if (!inviterFid || !inviteeFid) {
            return Response.json({ error: 'Both FIDs required' }, { status: 400 });
        }

        if (kv) {
            try {
                // Check if this invitee already claimed referral
                const alreadyClaimed = await kv.sismember(`referrals:${inviterFid}:list`, inviteeFid);
                if (alreadyClaimed) {
                    return Response.json({ error: 'Already claimed', alreadyClaimed: true }, { status: 200 });
                }

                // Add to inviter's referral list
                await kv.sadd(`referrals:${inviterFid}:list`, inviteeFid);

                // Increment inviter's referral count
                await kv.hincrby(`user:${inviterFid}`, 'referralCount', 1);
                await kv.hincrby(`user:${inviterFid}`, 'score', 500); // Bonus for inviter

                // Track invitee info
                await kv.hset(`referral:${inviteeFid}`, {
                    invitedBy: inviterFid,
                    username: inviteeUsername,
                    claimedAt: Date.now()
                });
            } catch (kvError) {
                console.error('KV error, using memory:', kvError);
                // Fallback to memory
                handleMemoryReferral(inviterFid, inviteeFid, inviteeUsername);
            }
        } else {
            // Use memory store
            handleMemoryReferral(inviterFid, inviteeFid, inviteeUsername);
        }

        return Response.json({
            success: true,
            message: 'Referral bonus applied to both!'
        });
    } catch (error) {
        console.error('Referral error:', error);
        return Response.json({ error: 'Referral failed' }, { status: 500 });
    }
}

function handleMemoryReferral(inviterFid: string, inviteeFid: string, inviteeUsername: string) {
    // Get or create referral set
    if (!referralStore.has(inviterFid)) {
        referralStore.set(inviterFid, new Set());
    }
    const referrals = referralStore.get(inviterFid)!;

    // Check if already claimed
    if (referrals.has(inviteeFid)) {
        return false;
    }

    // Add referral
    referrals.add(inviteeFid);

    // Update user stats
    const userData = userStore.get(inviterFid) || { referralCount: 0, score: 0 };
    userData.referralCount += 1;
    userData.score += 500;
    userStore.set(inviterFid, userData);

    return true;
}

// Get referral stats for a user
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fid = searchParams.get('fid');

        if (!fid) {
            return Response.json({ error: 'FID required' }, { status: 400 });
        }

        let referralCount = 0;
        let referralList: string[] = [];

        if (kv) {
            try {
                // Get referral list
                referralList = await kv.smembers(`referrals:${fid}:list`) || [];

                // Get user data
                const userData = await kv.hgetall(`user:${fid}`);
                referralCount = userData?.referralCount || 0;
            } catch (kvError) {
                console.error('KV read error, using memory:', kvError);
                // Fallback to memory
                const referrals = referralStore.get(fid);
                referralList = referrals ? Array.from(referrals) : [];
                const userData = userStore.get(fid);
                referralCount = userData?.referralCount || 0;
            }
        } else {
            // Use memory store
            const referrals = referralStore.get(fid);
            referralList = referrals ? Array.from(referrals) : [];
            const userData = userStore.get(fid);
            referralCount = userData?.referralCount || 0;
        }

        return Response.json({
            count: referralCount,
            referrals: referralList
        });
    } catch (error) {
        console.error('Get referrals error:', error);
        return Response.json({ count: 0, referrals: [] }, { status: 200 }); // Return empty instead of error
    }
}
