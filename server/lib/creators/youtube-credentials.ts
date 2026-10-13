import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { CreatorError } from './errors.ts';

export const youtubeScope = 'https://www.googleapis.com/auth/youtube.readonly';
export function youtubeConfig() {
  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const encryptionKey = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY;
  const origin = process.env.BETTER_AUTH_URL;
  if (
    !clientId ||
    !clientSecret ||
    !origin ||
    !encryptionKey ||
    !/^[a-f0-9]{64}$/i.test(encryptionKey)
  )
    throw new CreatorError('YouTube connection is not configured yet.', 503);
  return {
    clientId,
    clientSecret,
    encryptionKey,
    redirectUri: `${new URL(origin).origin}/api/creator-hub/youtube/callback`,
  };
}
export function seal(value: string, key = youtubeConfig().encryptionKey) {
  const nonce = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), nonce);
  const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [nonce, cipher.getAuthTag(), bytes].map(x => x.toString('base64url')).join('.');
}
export function unseal(value: string, key = youtubeConfig().encryptionKey) {
  const [nonce, tag, bytes] = value.split('.').map(x => Buffer.from(x, 'base64url'));
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), nonce);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(bytes), cipher.final()]).toString('utf8');
}
export class YoutubeAccessRevoked extends CreatorError {
  constructor() {
    super(
      'YouTube access is no longer available. Reconnect your channel. Public auto-import settings are unchanged.',
      403,
    );
  }
}
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive(),
  scope: z.string().optional(),
});
export async function exchangeYoutubeToken(params: Record<string, string>) {
  const config = youtubeConfig();
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        ...params,
      }),
    });
    const payload: unknown = await response.json();
    if (
      params.grant_type === 'refresh_token' &&
      response.status === 400 &&
      z.object({ error: z.literal('invalid_grant') }).safeParse(payload).success
    )
      throw new YoutubeAccessRevoked();
    if (!response.ok) throw new Error('token_request_failed');
    const parsed = tokenSchema.safeParse(payload);
    if (!parsed.success) throw new Error('token_response_invalid');
    if (parsed.data.scope !== undefined && !parsed.data.scope.split(' ').includes(youtubeScope)) {
      if (params.grant_type === 'authorization_code')
        throw new CreatorError('YouTube read access was not granted.', 403);
      throw new YoutubeAccessRevoked();
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof CreatorError) throw error;
    throw new CreatorError(
      'YouTube could not complete this request. Check the connection and try again.',
      503,
    );
  }
}
