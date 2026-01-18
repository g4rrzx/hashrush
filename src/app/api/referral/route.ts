// Referral API using Vercel Blob Storage
import { put, list, del } from '@vercel/blob';

const REFERRAL_FILE = 'referrals.json';

interface ReferralData {
    [inviterFid: string]: {
        referrals: string[];
        referralCount: number;
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
        const data = await response.json();
        return data as ReferralData;
    } catch (error) {
        console.error('Error reading referrals:', error);
        return {};
    }
}

// Save referral data to Blob
async function saveReferralData(data: ReferralData): Promise<void> {
    try {
        // Delete old blobs first
        const { blobs } = await list({ prefix: REFERRAL_FILE });
        for (const blob of blobs) {
            await del(blob.url);
        }

        // Save new data
        await put(REFERRAL_FILE, JSON.stringify(data), {
            access: 'public',
            contentType: 'application/json',
        });
    } catch (error) {
        console.error('Error saving referrals:', error);
        throw error;
    }
}

// Track referrals and give bonus to both parties
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { inviterFid, inviteeFid, inviteeUsername } = body;

        if (!inviterFid || !inviteeFid) {
            return Response.json({ error: 'Both FIDs required' }, { status: 400 });
        }

        const inviterKey = String(inviterFid);
        const inviteeKey = String(inviteeFid);

        // Get current referral data
        const referralData = await getReferralData();

        // Initialize inviter if not exists
        if (!referralData[inviterKey]) {
            referralData[inviterKey] = {
                referrals: [],
                referralCount: 0
            };
        }

        // Check if already claimed
        if (referralData[inviterKey].referrals.includes(inviteeKey)) {
            return Response.json({
                error: 'Already claimed',
                alreadyClaimed: true
            }, { status: 200 });
        }

        // Add referral
        referralData[inviterKey].referrals.push(inviteeKey);
        referralData[inviterKey].referralCount += 1;

        // Save updated data
        await saveReferralData(referralData);

        return Response.json({
            success: true,
            message: 'Referral bonus applied!',
            newCount: referralData[inviterKey].referralCount
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
            referrals: userReferrals?.referrals || []
        });
    } catch (error) {
        console.error('Get referrals error:', error);
        return Response.json({ count: 0, referrals: [] }, { status: 200 });
    }
}
