// Leaderboard API - connects to VPS backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://37.114.34.131:3001';

export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/api/leaderboard`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            console.error('VPS API error:', res.status);
            return Response.json([]);
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error('Leaderboard GET error:', error);
        return Response.json([]);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const res = await fetch(`${API_BASE}/api/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error('VPS API POST error:', res.status);
            return Response.json({ error: 'Failed to sync' }, { status: 500 });
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error('Leaderboard POST error:', error);
        return Response.json({ error: 'Failed to update score' }, { status: 500 });
    }
}
