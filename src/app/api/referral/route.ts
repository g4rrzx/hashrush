/**
 * /api/referral - Sistem referral via Neon DB (bukan VPS proxy)
 * 
 * GET: ?fid=xxx → Return stats referral user
 * POST: { inviterFid, inviteeFid, inviteeUsername } → Daftarkan referral baru
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';
import { getAuthFid, unauthorized } from '@/lib/auth';

const REFERRAL_BONUS_INVITER = 500; // HP bonus untuk pengundang
const REFERRAL_BONUS_INVITEE = 500; // HP bonus untuk yang diundang

export async function GET(req: NextRequest) {
    try {
        await initDB();
        const fid = await getAuthFid(req);
        if (!fid) return unauthorized();

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

        // The authenticated user is the INVITEE (they just arrived via the referral link).
        const inviteeFid = await getAuthFid(req);
        if (!inviteeFid) return unauthorized();

        const { inviterFid } = await req.json();

        if (!inviterFid) {
            return Response.json({ error: 'inviterFid required' }, { status: 400 });
        }
        const inviter = String(inviterFid);

        // Jangan referral diri sendiri
        if (inviter === inviteeFid) {
            return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
        }

        // Inviter harus user nyata (FID acak ditolak → tidak bisa farming bonus).
        const inviterRows = await sql`SELECT fid FROM users WHERE fid = ${inviter}`;
        if (inviterRows.length === 0) {
            return Response.json({ error: 'Inviter not found' }, { status: 404 });
        }

        // Invitee harus user nyata (biasanya sudah dibuat saat connect).
        const inviteeRows = await sql`SELECT fid FROM users WHERE fid = ${inviteeFid}`;
        if (inviteeRows.length === 0) {
            return Response.json({ error: 'Invitee not found' }, { status: 404 });
        }

        // Cek apakah invitee sudah pernah didaftarkan (satu bonus per invitee)
        const existing = await sql`
      SELECT 1 FROM referrals WHERE invitee_fid = ${inviteeFid}
    `;

        if (existing.length > 0) {
            return Response.json({ success: false, message: 'Already referred' });
        }

        // Insert referral
        await sql`
      INSERT INTO referrals (inviter_fid, invitee_fid, bonus_awarded)
      VALUES (${inviter}, ${inviteeFid}, ${REFERRAL_BONUS_INVITER})
      ON CONFLICT (invitee_fid) DO NOTHING
    `;

        // Berikan bonus ke inviter di DB langsung
        await sql`
      UPDATE users SET
        balance = balance + ${REFERRAL_BONUS_INVITER},
        total_earned = total_earned + ${REFERRAL_BONUS_INVITER},
        last_seen = NOW()
      WHERE fid = ${inviter}
    `;

        // Juga berikan bonus ke invitee (dipastikan bisa apply waktu pertama load)
        await sql`
      UPDATE users SET
        balance = balance + ${REFERRAL_BONUS_INVITEE},
        total_earned = total_earned + ${REFERRAL_BONUS_INVITEE}
      WHERE fid = ${inviteeFid}
    `;

        console.log(`[referral] ${inviter} referred ${inviteeFid}. Both get ${REFERRAL_BONUS_INVITER} HP.`);

        return Response.json({
            success: true,
            bonusAwarded: REFERRAL_BONUS_INVITER
        });
    } catch (err) {
        console.error('[/api/referral POST]', err);
        return Response.json({ error: 'Referral failed' }, { status: 500 });
    }
}
