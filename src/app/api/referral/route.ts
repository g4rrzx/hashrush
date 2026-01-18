// Referral API using Vercel Blob Storage with fallback
import { put, list, del } from '@vercel/blob';

const REFERRAL_FILE = 'referrals.json';

interface ReferralData {
    [inviterFid: string]: {
        referrals: string[];
        referralCount: number;
        bonusAwarded: number;
    };
}

// In-memory fallback
let memoryReferrals: ReferralData = {};

// Check if Blob token is configured
const isBlobConfigured = (): boolean => {
    return !!process.env.BLOB_READ_WRITE_TOKEN;
};

// Get referral data from Blob
async function getReferralData(): Promise<ReferralData> {
    if (!isBlobConfigured()) {
        return memoryReferrals;
    }

    try {
        const { blobs } = await list({ prefix: REFERRAL_FILE });

        if (blobs.length === 0) {
            return {};
        }

        const latestBlob = blobs[0];
        const response = await fetch(latestBlob.url);

        if (!response.ok) {
            return memoryReferrals;
        }

        const data = await response.json();
        return data || {};
    } catch (error) {
        console.error('Error reading referrals:', error);
        return memoryReferrals;
    }
}

// Save referral data to Blob
async function saveReferralData(data: ReferralData): Promise<boolean> {
    memoryReferrals = data;

    if (!isBlobConfigured()) {
        return true;
    }

    try {
        const { blobs } = await list({ prefix: REFERRAL_FILE });
        for (const blob of blobs) {
            try { await del(blob.url); } catch (e) { }
        }

        await put(REFERRAL_FILE, JSON.stringify(data), {
            access: 'public',
            contentType: 'application/json',
        });

        return true;
    } catch (error) {
        console.error('Error saving referrals:', error);
        return true; // Memory already updated
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

        if (String(inviterFid) === String(inviteeFid)) {
            return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
        }

        const inviterKey = String(inviterFid);
        const inviteeKey = String(inviteeFid);

        const referralData = await getReferralData();

        if (!referralData[inviterKey]) {
            referralData[inviterKey] = {
                referrals: [],
                referralCount: 0,
                bonusAwarded: 0
            };
        }

        if (referralData[inviterKey].referrals.includes(inviteeKey)) {
            return Response.json({
                error: 'Already claimed',
                alreadyClaimed: true,
                currentCount: referralData[inviterKey].referralCount
            }, { status: 200 });
        }

        const REFERRAL_BONUS = 500;

        referralData[inviterKey].referrals.push(inviteeKey);
        referralData[inviterKey].referralCount += 1;
        referralData[inviterKey].bonusAwarded += REFERRAL_BONUS;

        await saveReferralData(referralData);

        return Response.json({
            success: true,
            message: `Referral recorded! Inviter gets +${REFERRAL_BONUS} HP!`,
            newCount: referralData[inviterKey].referralCount,
            totalBonus: referralData[inviterKey].bonusAwarded
        });
    } catch (error) {
        console.error('Referral error:', error);
        return Response.json({ error: 'Referral failed' }, { status: 500 });
    }
}

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
