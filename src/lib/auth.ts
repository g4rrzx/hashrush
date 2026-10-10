/**
 * Server-side authentication for Farcaster Mini App requests.
 *
 * The client attaches a Quick Auth JWT (`sdk.quickAuth.fetch`) as
 * `Authorization: Bearer <jwt>`. The token is signed by Farcaster's auth
 * server and carries the user's FID in `sub`, so the server can trust the
 * FID instead of whatever the client put in the request body.
 *
 * NEVER trust a `fid` / `walletAddress` from the request body — derive the
 * identity from the verified token only.
 */
import { createClient } from '@farcaster/quick-auth';

const client = createClient();

/** Domains this Mini App is served from (the token `aud` must match one). */
function isAllowedDomain(domain: string): boolean {
  if (domain === 'hashrush.vercel.app') return true;
  // Vercel preview deployments for this project: hashrush-<hash>-g4rrzxs-projects.vercel.app
  return /^hashrush-[a-z0-9-]+-g4rrzxs-projects\.vercel\.app$/i.test(domain);
}

function decodeAudience(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(Buffer.from(part, 'base64url').toString('utf-8'));
    return typeof json.aud === 'string' ? json.aud : null;
  } catch {
    return null;
  }
}

/**
 * Verify the Quick Auth bearer token and return the authenticated FID.
 * Returns null when the request is unauthenticated or the token is invalid.
 */
export async function getAuthFid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const aud = decodeAudience(token);
  if (!aud || !isAllowedDomain(aud)) return null;

  try {
    const payload = await client.verifyJwt({ token, domain: aud });
    if (!payload || typeof payload.sub !== 'number') return null;
    return String(payload.sub);
  } catch {
    return null;
  }
}

/** 401 helper. */
export function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
