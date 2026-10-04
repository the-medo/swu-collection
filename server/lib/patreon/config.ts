export class PatreonError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 502 | 503 = 503,
  ) {
    super(message);
  }
}

export function patreonConfigured() {
  return [
    'PATREON_CLIENT_ID',
    'PATREON_CLIENT_SECRET',
    'PATREON_CREATORS_ACCESS_TOKEN',
    'PATREON_CREATORS_REFRESH_TOKEN',
    'TOKEN_ENCRYPTION_KEY',
  ].every(key => !!process.env[key]?.trim());
}

export function patreonConfig() {
  if (!patreonConfigured())
    throw new PatreonError('Patreon creator credentials or token encryption key are missing.');
  return {
    clientId: process.env.PATREON_CLIENT_ID!,
    clientSecret: process.env.PATREON_CLIENT_SECRET!,
    accessToken: process.env.PATREON_CREATORS_ACCESS_TOKEN!,
    refreshToken: process.env.PATREON_CREATORS_REFRESH_TOKEN!,
    encryptionKey: process.env.TOKEN_ENCRYPTION_KEY!,
  };
}
