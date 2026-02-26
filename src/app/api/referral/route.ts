/**
 * /api/referral - Sistem referral via Neon DB (bukan VPS proxy)
 * 
 * GET: ?fid=xxx → Return stats referral user
 * POST: { inviterFid, inviteeFid, inviteeUsername } → Daftarkan referral baru
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';

const REFERRAL_BONUS_INVITER = 500; // HP bonus untuk pengundang
const REFERRAL_BONUS_INVITEE = 500; // HP bonus untuk yang diundang

export async function GET(req: NextRequest) {
    try {
        await initDB();
        const { searchParams } = new URL(req.url);
        const fid = searchParams.get('fid');

        if (!fid) {
            return Response.json({ error: 'FID required' }, { status: 400 });
        }

        // Ambil daftar referral yang dilakukan user ini
        const referrals = await sql`
      SELECT invitee_fid, bonus_awarded, created_at
      FROM referrals WHERE inviter_fid = ${fid}
      ORDER BY created_at DESC
    `;

        // Total bonus yang sudah diterima
        const totalBonus = referrals.reduce((sum, r) => sum + Number(r.bonus_awarded), 0);

        return Response.json({
            count: referrals.length,
            referrals: referrals.map(r => r.invitee_fid),
            bonusAwarded: totalBonus,
        });
    } catch (err) {
        console.error('[/api/referral GET]', err);
        return Response.json({ count: 0, referrals: [], bonusAwarded: 0 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await initDB();
        const { inviterFid, inviteeFid, inviteeUsername } = await req.json();

        if (!inviterFid || !inviteeFid) {
            return Response.json({ error: 'inviterFid and inviteeFid required' }, { status: 400 });
        }

        // Jangan referral diri sendiri
        if (inviterFid === inviteeFid) {
            return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
        }

        // Cek apakah invitee sudah pernah didaftarkan
        const existing = await sql`
      SELECT 1 FROM referrals WHERE invitee_fid = ${inviteeFid}
    `;

        if (existing.length > 0) {
            return Response.json({ success: false, message: 'Already referred' });
        }

        // Pastikan inviter ada di DB
        const inviterRows = await sql`SELECT fid FROM users WHERE fid = ${inviterFid}`;
        if (inviterRows.length === 0) {
            return Response.json({ error: 'Inviter not found' }, { status: 404 });
        }

        // Insert referral
        await sql`
      INSERT INTO referrals (inviter_fid, invitee_fid, bonus_awarded)
      VALUES (${inviterFid}, ${inviteeFid}, ${REFERRAL_BONUS_INVITER})
      ON CONFLICT (invitee_fid) DO NOTHING
    `;

        // Berikan bonus ke inviter di DB langsung
        await sql`
      UPDATE users SET
        balance = balance + ${REFERRAL_BONUS_INVITER},
        total_earned = total_earned + ${REFERRAL_BONUS_INVITER},
        last_seen = NOW()
      WHERE fid = ${inviterFid}
    `;

        // Juga berikan bonus ke invitee (dipastikan bisa apply waktu pertama load)
        await sql`
      UPDATE users SET
        balance = balance + ${REFERRAL_BONUS_INVITEE},
        total_earned = total_earned + ${REFERRAL_BONUS_INVITEE}
      WHERE fid = ${inviteeFid}
    `;

        console.log(`[referral] ${inviterFid} referred ${inviteeFid}. Both get ${REFERRAL_BONUS_INVITER} HP.`);

        return Response.json({
            success: true,
            bonusAwarded: REFERRAL_BONUS_INVITER
        });
    } catch (err) {
        console.error('[/api/referral POST]', err);
        return Response.json({ error: 'Referral failed' }, { status: 500 });
    }
}
