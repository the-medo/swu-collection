export type AuthEmailMode = 'disabled' | 'capture' | 'resend';

export function getAuthEmailConfig(env = process.env) {
  const mode = env.AUTH_EMAIL_MODE ?? 'disabled';
  if (!['disabled', 'capture', 'resend'].includes(mode)) throw new Error('Invalid AUTH_EMAIL_MODE');
  if (mode === 'capture' && env.ENVIRONMENT !== 'local') {
    throw new Error('Auth email capture is restricted to ENVIRONMENT=local');
  }
  if (mode !== 'disabled' && (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)) {
    throw new Error(
      'Auth email requires a persistent BETTER_AUTH_SECRET of at least 32 characters',
    );
  }
  if (mode === 'resend' && (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM)) {
    throw new Error('Resend requires RESEND_API_KEY and AUTH_EMAIL_FROM');
  }
  const origin = env.BETTER_AUTH_URL ? new URL(env.BETTER_AUTH_URL).origin : '';
  if (mode !== 'disabled' && !origin) throw new Error('Auth email requires BETTER_AUTH_URL');
  if (mode === 'resend' && !origin.startsWith('https://'))
    throw new Error('Resend requires an HTTPS auth origin');
  return {
    mode: mode as AuthEmailMode,
    enabled: mode !== 'disabled',
    origin,
    from: env.AUTH_EMAIL_FROM ?? 'SWUBASE <local@invalid.local>',
    replyTo: env.AUTH_EMAIL_REPLY_TO,
    apiKey: env.RESEND_API_KEY,
  };
}
