/**
 * /api/redeem-zora - Server sends 10 ZORA to user's wallet
 *
 * POST: { fid, walletAddress }
 *
 * Flow:
 * 1. Server checks DB balance >= 10000 HP
 * 2. Server checks 24h ZORA cooldown
 * 3. Server sends 10 ZORA from Admin Wallet to user
 * 4. Deduct 10000 HP from DB balance
 */
import { NextRequest } from 'next/server';
import { sql, initDB } from '@/lib/db';
import { ethers } from 'ethers';

const BASE_RPC = 'https://mainnet.base.org';
const ZORA_CONTRACT = '0x1111111111166b7FE7bd91427724B487980aFc69';
const MIN_HP_ZORA_REDEEM = 10000;
const ZORA_REWARD = 10;
const ZORA_REDEEM_COOLDOWN_HOURS = 24;

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const maybeShort = (err as { shortMessage?: unknown }).shortMessage;
    if (typeof maybeShort === 'string') return maybeShort;

    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return 'Transfer error';
}

async function sendZora(
  toAddress: string,
  amount: number,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!process.env.PRIVATE_KEY) {
      return { success: false, error: 'Server wallet not configured' };
    }

    const provider = new ethers.JsonRpcProvider(BASE_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const zora = new ethers.Contract(ZORA_CONTRACT, ERC20_ABI, wallet);

    const amountWei = ethers.parseEther(amount.toString());
    const adminBalance = await zora.balanceOf(wallet.address);
    if (adminBalance < amountWei) {
      console.error(`[redeem-zora] Admin ZORA balance insufficient: ${ethers.formatEther(adminBalance)}`);
      return { success: false, error: 'ZORA reward pool empty. Try again later.' };
    }

    const tx = await zora.transfer(toAddress, amountWei);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      return { success: false, error: 'ZORA transfer failed on-chain' };
    }

    return { success: true, txHash: tx.hash };
  } catch (err: unknown) {
    console.error('[sendZora]', err);
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDB();
    const { fid, walletAddress } = await req.json();

    if (!fid) {
      return Response.json({ error: 'fid required' }, { status: 400 });
    }

    const users = await sql`SELECT * FROM users WHERE fid = ${fid}`;
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];

    const targetWallet = walletAddress || user.wallet_address;
    if (!targetWallet) {
      return Response.json({ error: 'No wallet address found' }, { status: 400 });
    }

    const serverBalance = Number(user.balance);
    if (serverBalance < MIN_HP_ZORA_REDEEM) {
      return Response.json(
        {
          error: `Insufficient HP. You have ${Math.floor(serverBalance)} HP, need ${MIN_HP_ZORA_REDEEM} HP`,
          serverBalance: Math.floor(serverBalance),
        },
        { status: 400 },
      );
    }

    if (user.last_zora_redeem_at) {
      const lastRedeem = new Date(user.last_zora_redeem_at).getTime();
      const hoursSince = (Date.now() - lastRedeem) / (1000 * 3600);
      if (hoursSince < ZORA_REDEEM_COOLDOWN_HOURS) {
        const hoursLeft = Math.ceil(ZORA_REDEEM_COOLDOWN_HOURS - hoursSince);
        return Response.json(
          {
            error: `Cooldown active. Wait ${hoursLeft} more hour(s)`,
            hoursLeft,
          },
          { status: 429 },
        );
      }
    }

    const sendResult = await sendZora(targetWallet, ZORA_REWARD);
    if (!sendResult.success) {
      return Response.json({ error: sendResult.error || 'Failed to send ZORA' }, { status: 500 });
    }

    const newBalance = serverBalance - MIN_HP_ZORA_REDEEM;

    await sql`
      UPDATE users SET
        balance = ${newBalance},
        total_zora_earned = COALESCE(total_zora_earned, 0) + ${ZORA_REWARD},
        last_zora_redeem_at = NOW(),
        last_seen = NOW()
      WHERE fid = ${fid}
    `;

    return Response.json({
      success: true,
      zoraSent: ZORA_REWARD,
      txHash: sendResult.txHash,
      deducted: MIN_HP_ZORA_REDEEM,
      newBalance,
      nextRedeemAt: new Date(Date.now() + ZORA_REDEEM_COOLDOWN_HOURS * 3600 * 1000).toISOString(),
    });
  } catch (err: unknown) {
    console.error('[/api/redeem-zora POST]', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
