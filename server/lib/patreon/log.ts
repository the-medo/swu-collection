import { PatreonError } from './config.ts';

// Database exceptions may embed SQL parameters; upstream errors may contain
// tokens. Emit bounded categories/codes only, never Error objects or payloads.
export function logPatreonFailure(
  operation: 'admin' | 'webhook' | 'account' | 'sync',
  error: unknown,
) {
  const candidate = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = candidate?.cause?.code ?? candidate?.code;
  console.error(`[patreon] ${operation} failed`, {
    kind: error instanceof PatreonError ? 'provider_or_configuration' : 'internal',
    status: error instanceof PatreonError ? error.status : undefined,
    databaseCode: typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined,
  });
}
