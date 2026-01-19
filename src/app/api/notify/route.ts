// Send notification to all users API
import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://37.114.34.131:3001';

// POST - Send notification to all subscribed users
export async function POST(req: NextRequest) {
    try {
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

        for (const user of tokens) {
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
            total: tokens.length
        });
    } catch (error) {
        console.error('Send notification error:', error);
        return Response.json({ error: 'Failed to send notifications' }, { status: 500 });
    }
}
