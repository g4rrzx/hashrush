// Send notification to all users API
import { NextRequest } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://37.114.34.131:3001';

// Only Farcaster notification endpoints may be fetched (SSRF guard).
const ALLOWED_NOTIFY_HOSTS = ['api.farcaster.xyz', 'api.warpcast.com'];

function isAllowedNotifyUrl(raw: unknown): raw is string {
    if (typeof raw !== 'string') return false;
    try {
        const u = new URL(raw);
        return u.protocol === 'https:' && ALLOWED_NOTIFY_HOSTS.includes(u.hostname);
    } catch {
        return false;
    }
}

// POST - Send notification to all subscribed users (admin only)
export async function POST(req: NextRequest) {
    try {
        const adminFid = await requireAdmin(req);
        if (!adminFid) return unauthorized();

        const body = await req.json();
        const { title, message, targetUrl } = body;

        if (!title || !message) {
            return Response.json({ error: 'Title and message required' }, { status: 400 });
        }

        // Get all notification tokens from VPS
        const res = await fetch(`${API_BASE}/api/notifications`);
        const tokens = await res.json();

        if (!Array.isArray(tokens) || tokens.length === 0) {
            return Response.json({
                success: true,
                sent: 0,
                message: 'No subscribers found'
            });
        }

        // Send notification to each user
        let sentCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (const user of tokens) {
            // Skip any token whose callback URL is not a Farcaster endpoint.
            if (!isAllowedNotifyUrl(user?.url)) {
                skippedCount++;
                console.warn(`Skipped FID ${user?.fid}: disallowed notify URL`);
                continue;
            }

            try {
                const notifyRes = await fetch(user.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notificationId: `reward-update-${Date.now()}`,
                        title: title,
                        body: message,
                        targetUrl: targetUrl || 'https://hashrush.vercel.app',
                        tokens: [user.token]
                    })
                });

                if (notifyRes.ok) {
                    sentCount++;
                    console.log(`Notification sent to FID ${user.fid}`);
                } else {
                    failCount++;
                    console.error(`Failed to notify FID ${user.fid}:`, await notifyRes.text());
                }
            } catch (e) {
                failCount++;
                console.error(`Error notifying FID ${user.fid}:`, e);
            }
        }

        return Response.json({
            success: true,
            sent: sentCount,
            failed: failCount,
            skipped: skippedCount,
            total: tokens.length
        });
    } catch (error) {
        console.error('Send notification error:', error);
        return Response.json({ error: 'Failed to send notifications' }, { status: 500 });
    }
}
