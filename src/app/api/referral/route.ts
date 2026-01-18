import { kv } from '@vercel/kv';

// Track referrals and give bonus to both parties
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { inviterFid, inviteeFid, inviteeUsername } = body;

        if (!inviterFid || !inviteeFid) {
            return Response.json({ error: 'Both FIDs required' }, { status: 400 });
        }

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

        return Response.json({
            success: true,
            message: 'Referral bonus applied to both!'
        });
    } catch (error) {
        console.error('Referral error:', error);
        return Response.json({ error: 'Referral failed' }, { status: 500 });
    }
}

// Get referral stats for a user
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fid = searchParams.get('fid');

        if (!fid) {
            return Response.json({ error: 'FID required' }, { status: 400 });
        }

        // Get referral list
        const referralList = await kv.smembers(`referrals:${fid}:list`);

        // Get user data
        const userData = await kv.hgetall(`user:${fid}`);
        const referralCount = userData?.referralCount || 0;

        return Response.json({
            count: referralCount,
            referrals: referralList || []
        });
    } catch (error) {
        console.error('Get referrals error:', error);
        return Response.json({ error: 'Failed to get referrals' }, { status: 500 });
    }
}
