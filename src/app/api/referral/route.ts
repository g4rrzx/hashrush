// Referral API - connects to VPS backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://37.114.34.131:3001';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fid = searchParams.get('fid');

        if (!fid) {
            return Response.json({ error: 'FID required' }, { status: 400 });
        }

        const res = await fetch(`${API_BASE}/api/referral?fid=${fid}`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            return Response.json({ count: 0, referrals: [], bonusAwarded: 0 });
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error('Referral GET error:', error);
        return Response.json({ count: 0, referrals: [], bonusAwarded: 0 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const res = await fetch(`${API_BASE}/api/referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            return Response.json({ error: 'Referral failed' }, { status: 500 });
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error('Referral POST error:', error);
        return Response.json({ error: 'Referral failed' }, { status: 500 });
    }
}
