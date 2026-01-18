// Referral API using Vercel Blob Storage
import { put, list, del } from '@vercel/blob';

const REFERRAL_FILE = 'referrals.json';

interface ReferralData {
    [inviterFid: string]: {
        referrals: string[];
        referralCount: number;
        bonusAwarded: number; // Total bonus points given to inviter
    };
}

// Get referral data from Blob
async function getReferralData(): Promise<ReferralData> {
    try {
        const { blobs } = await list({ prefix: REFERRAL_FILE });

        if (blobs.length === 0) {
            return {};
        }

        const latestBlob = blobs[0];
        const response = await fetch(latestBlob.url);

        if (!response.ok) {
            console.error('Failed to fetch referral blob:', response.status);
            return {};
        }

        const data = await response.json();
        return data || {};
    } catch (error) {
        console.error('Error reading referrals:', error);
        return {};
    }
}

// Save referral data to Blob
async function saveReferralData(data: ReferralData): Promise<boolean> {
    try {
        // Delete old blobs first
        const { blobs } = await list({ prefix: REFERRAL_FILE });
        for (const blob of blobs) {
            try {
                await del(blob.url);
            } catch (e) {
                console.log('Delete old blob failed:', e);
            }
        }

        // Save new data
        await put(REFERRAL_FILE, JSON.stringify(data), {
            access: 'public',
            contentType: 'application/json',
        });

        return true;
    } catch (error) {
        console.error('Error saving referrals:', error);
        return false;
    }
}

// Track referrals and give bonus to inviter
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { inviterFid, inviteeFid, inviteeUsername } = body;

        if (!inviterFid || !inviteeFid) {
            return Response.json({ error: 'Both FIDs required' }, { status: 400 });
        }

        // Can't refer yourself
        if (String(inviterFid) === String(inviteeFid)) {
            return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
        }

        const inviterKey = String(inviterFid);
        const inviteeKey = String(inviteeFid);

        // Get current referral data
        const referralData = await getReferralData();

        // Initialize inviter if not exists
        if (!referralData[inviterKey]) {
            referralData[inviterKey] = {
                referrals: [],
                referralCount: 0,
                bonusAwarded: 0
            };
        }

        // Check if already claimed
        if (referralData[inviterKey].referrals.includes(inviteeKey)) {
            return Response.json({
                error: 'Already claimed',
                alreadyClaimed: true,
                currentCount: referralData[inviterKey].referralCount
            }, { status: 200 });
        }

        // Add referral and award bonus to INVITER
        const REFERRAL_BONUS = 500; // 500 HP bonus per referral

        referralData[inviterKey].referrals.push(inviteeKey);
        referralData[inviterKey].referralCount += 1;
        referralData[inviterKey].bonusAwarded += REFERRAL_BONUS;

        // Save updated data
        const saved = await saveReferralData(referralData);

        if (!saved) {
            return Response.json({ error: 'Failed to save referral' }, { status: 500 });
        }

        return Response.json({
            success: true,
            message: `Referral recorded! Inviter gets +${REFERRAL_BONUS} HP bonus!`,
            newCount: referralData[inviterKey].referralCount,
            totalBonus: referralData[inviterKey].bonusAwarded,
            inviterFid: inviterKey,
            inviteeFid: inviteeKey,
            inviteeUsername: inviteeUsername
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

        const referralData = await getReferralData();
        const userReferrals = referralData[String(fid)];

        return Response.json({
            count: userReferrals?.referralCount || 0,
            referrals: userReferrals?.referrals || [],
            bonusAwarded: userReferrals?.bonusAwarded || 0
        });
    } catch (error) {
        console.error('Get referrals error:', error);
        return Response.json({ count: 0, referrals: [], bonusAwarded: 0 });
    }
}
