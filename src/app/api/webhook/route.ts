// Webhook API for Farcaster notifications
//
// Events arrive as a JSON Farcaster Signature envelope
// (`{ header, payload, signature }`) signed by the user's app key. We verify
// the signature AND that the app key is currently valid for the claimed FID
// before trusting any token. Unverifiable events are rejected.
import { NextRequest } from 'next/server';
import {
    parseWebhookEvent,
    verifyAppKeyWithNeynar,
    createVerifyAppKeyWithHub,
    type VerifyAppKey,
} from '@farcaster/miniapp-node';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://37.114.34.131:3001';

// Where to check that an app key is valid for an FID.
// Prefer Neynar (needs NEYNAR_API_KEY); otherwise a Farcaster hub HTTP endpoint.
function resolveVerifyAppKey(): VerifyAppKey | null {
    if (process.env.NEYNAR_API_KEY) return verifyAppKeyWithNeynar;
    if (process.env.FARCASTER_HUB_URL) return createVerifyAppKeyWithHub(process.env.FARCASTER_HUB_URL);
    return null;
}

// Handle Farcaster webhook events (user subscribes to notifications)
export async function POST(req: NextRequest) {
    try {
        const verifyAppKey = resolveVerifyAppKey();
        if (!verifyAppKey) {
            // Fail-closed: without a key-verification source, events cannot be trusted.
            console.error('[webhook] No key-verification source (set NEYNAR_API_KEY or FARCASTER_HUB_URL)');
            return Response.json({ error: 'Webhook verification not configured' }, { status: 503 });
        }

        const raw = await req.json();

        let data;
        try {
            data = await parseWebhookEvent(raw, verifyAppKey);
        } catch (e) {
            console.warn('[webhook] Rejected event:', (e as Error)?.name || e);
            return Response.json({ error: 'Invalid webhook event' }, { status: 401 });
        }

        const { fid, event } = data;
        const eventType = (event as { event?: string })?.event;

        if (eventType === 'miniapp_added' || eventType === 'notifications_enabled') {
            const details = (event as { notificationDetails?: { token?: string; url?: string } })?.notificationDetails;
            if (details?.token && details?.url) {
                await fetch(`${API_BASE}/api/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fid: String(fid),
                        token: details.token,
                        url: details.url
                    })
                });
                console.log('Notification token saved for FID:', fid);
            }
        }

        if (eventType === 'miniapp_removed' || eventType === 'notifications_disabled') {
            await fetch(`${API_BASE}/api/notifications/${fid}`, {
                method: 'DELETE'
            });
            console.log('Notification token removed for FID:', fid);
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ error: 'Webhook failed' }, { status: 500 });
    }
}
