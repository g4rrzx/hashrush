// Webhook API for Farcaster notifications
import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://37.114.34.131:3001';

// Handle Farcaster webhook events (user subscribes to notifications)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log('Webhook received:', body);

        // Handle frame_added event (user enabled notifications)
        if (body.event === 'frame_added' || body.event === 'notifications_enabled') {
            const { fid, notificationDetails } = body;

            if (fid && notificationDetails?.token && notificationDetails?.url) {
                // Save notification token to VPS
                await fetch(`${API_BASE}/api/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fid: String(fid),
                        token: notificationDetails.token,
                        url: notificationDetails.url
                    })
                });

                console.log('Notification token saved for FID:', fid);
            }
        }

        // Handle frame_removed event (user disabled notifications)
        if (body.event === 'frame_removed' || body.event === 'notifications_disabled') {
            const { fid } = body;

            if (fid) {
                await fetch(`${API_BASE}/api/notifications/${fid}`, {
                    method: 'DELETE'
                });

                console.log('Notification token removed for FID:', fid);
            }
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ error: 'Webhook failed' }, { status: 500 });
    }
}
