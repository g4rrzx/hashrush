/**
 * Neon PostgreSQL Connection
 * Menggunakan @neondatabase/serverless untuk serverless/edge compatibility
 * Singleton pool — tidak membuat koneksi baru setiap request
 */
import { neon } from '@neondatabase/serverless';

// Singleton SQL client
// Defaulting to a dummy URL during build so it doesn't crash if Vercel build doesn't have the env var yet
const dbUrl = process.env.DATABASE_URL || 'postgres://dummy:dummy@dummy/dummy';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Real DB operations will fail.');
}

export const sql = neon(dbUrl);

/**
 * Initialize semua tabel jika belum ada.
 * Dipanggil sekali saat server start / cold start.
 */
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      fid TEXT PRIMARY KEY,
      wallet_address TEXT,
      username TEXT,
      pfp_url TEXT,
      points NUMERIC DEFAULT 0,
      balance NUMERIC DEFAULT 0,
      total_earned NUMERIC DEFAULT 0,
      total_zora_earned NUMERIC DEFAULT 0,
      hash_rate INTEGER DEFAULT 10,
      streak INTEGER DEFAULT 1,
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      last_mine_at TIMESTAMPTZ DEFAULT NOW(),
      last_redeem_at TIMESTAMPTZ,
      last_zora_redeem_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Backward-safe migrations for existing deployments
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS total_zora_earned NUMERIC DEFAULT 0
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_zora_redeem_at TIMESTAMPTZ
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rigs (
      id SERIAL PRIMARY KEY,
      fid TEXT REFERENCES users(fid) ON DELETE CASCADE,
      rig_type TEXT NOT NULL,
      boost INTEGER NOT NULL,
      tx_hash TEXT UNIQUE NOT NULL,
      purchased_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leaderboard (
      fid TEXT PRIMARY KEY,
      username TEXT,
      pfp_url TEXT,
      score NUMERIC DEFAULT 0,
      tier TEXT DEFAULT 'Bronze',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      inviter_fid TEXT,
      invitee_fid TEXT UNIQUE,
      bonus_awarded INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS claimed_txs (
      tx_hash TEXT PRIMARY KEY,
      fid TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      claimed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

/**
 * Hitung hashrate user berdasarkan semua rigs yang dimiliki
 * Base rate = 10 MH/s + total boost dari semua rigs
 */
export async function calcHashRate(fid: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(boost), 0) as total_boost
    FROM rigs WHERE fid = ${fid}
  `;
  return 10 + Number(rows[0].total_boost);
}

/**
 * Ambil data lengkap user + rigs
 */
export async function getUserData(fid: string) {
  const users = await sql`
    SELECT * FROM users WHERE fid = ${fid}
  `;
  if (users.length === 0) return null;

  const rigs = await sql`
    SELECT rig_type, boost, tx_hash, purchased_at
    FROM rigs WHERE fid = ${fid}
    ORDER BY purchased_at DESC
  `;

  const user = users[0];
  // Group rigs by type
  const ownedHardware: Record<string, { id: string; count: number; totalBoost: number }> = {};
  for (const rig of rigs) {
    if (!ownedHardware[rig.rig_type]) {
      ownedHardware[rig.rig_type] = { id: rig.rig_type, count: 0, totalBoost: 0 };
    }
    ownedHardware[rig.rig_type].count++;
    ownedHardware[rig.rig_type].totalBoost += Number(rig.boost);
  }

  // Calculate dynamic maxHp based on owned hardware
  const RIG_HP_CAPS: Record<string, number> = {
    starter: 2000,
    turbo: 3500,
    farm: 6000,
    quantum: 10000,
  };
  const maxHp = Object.keys(ownedHardware).length > 0
    ? Math.max(...Object.keys(ownedHardware).map(hwId => RIG_HP_CAPS[hwId] ?? 2000))
    : 2000;

  return {
    fid: user.fid,
    walletAddress: user.wallet_address,
    username: user.username,
    pfpUrl: user.pfp_url,
    points: Math.min(Number(user.points), maxHp), // Capped at their maxHp
    maxHp, // Return maxHp so frontend knows it immediately
    balance: Number(user.balance),
    totalEarned: Number(user.total_earned),
    totalZoraEarned: Number(user.total_zora_earned || 0),
    hashRate: Number(user.hash_rate),
    streak: Number(user.streak),
    lastMineAt: user.last_mine_at,
    lastRedeemAt: user.last_redeem_at,
    lastZoraRedeemAt: user.last_zora_redeem_at,
    ownedHardware: Object.values(ownedHardware),
  };
}
