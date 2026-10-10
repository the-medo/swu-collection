import Stripe from 'stripe';

export class SupportError extends Error {
  constructor(
    message: string,
    public status: 400 | 401 | 403 | 404 | 409 | 503 = 503,
  ) {
    super(message);
  }
}

export function supportConfig() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const accountId = process.env.STRIPE_ACCOUNT_ID?.trim();
  const mode = process.env.STRIPE_MODE;
  if (!key || !accountId || !['test', 'live'].includes(mode ?? ''))
    throw new SupportError('Support payments are not configured.');
  if (!/^acct_[a-zA-Z0-9]+$/.test(accountId) || !new RegExp(`^(sk|rk)_${mode}_`).test(key))
    throw new SupportError('Support payments are not configured correctly.');
  if (process.env.ENVIRONMENT === 'local' && mode !== 'test')
    throw new SupportError('Local support payments require a sandbox.');
  if (process.env.ENVIRONMENT === 'production' && mode !== 'live')
    throw new SupportError('Production support payments require live configuration.');
  let origin: URL;
  try {
    origin = new URL(process.env.BETTER_AUTH_URL ?? '');
  } catch {
    throw new SupportError('Support return URLs are not configured correctly.');
  }
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    (mode === 'live' && origin.protocol !== 'https:')
  )
    throw new SupportError('Support return URLs are not configured correctly.');
  return { key, accountId, live: mode === 'live', origin: origin.origin };
}

let cached: { key: string; client: Stripe } | undefined;
export function stripeClient() {
  const { key } = supportConfig();
  if (cached?.key !== key)
    cached = { key, client: new Stripe(key, { maxNetworkRetries: 2, timeout: 15_000 }) };
  return cached!.client;
}

export function logSupportFailure(error: unknown) {
  const code =
    (error as { code?: unknown; cause?: { code?: unknown } })?.cause?.code ??
    (error as { code?: unknown })?.code;
  // Upstream errors and database exceptions can contain secrets/SQL values.
  console.error('[stripe] support processing failed', {
    kind: error instanceof SupportError ? 'configuration_or_provider' : 'internal',
    databaseCode: typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined,
  });
}
