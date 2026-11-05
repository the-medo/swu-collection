import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const newIntegrationSecret = (prefix: string) =>
  `${prefix}_${randomBytes(32).toString('base64url')}`;
// These values have 256 bits of entropy; one-way hashes allow indexed lookups
// without retaining credentials that can be recovered from a database dump.
export const hashIntegrationSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export function matchesIntegrationSecret(value: string, hash: string) {
  const actual = Buffer.from(hashIntegrationSecret(value), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const integrationResultId = (clientId: string, kind: 'game' | 'match', externalId: string) =>
  `app:${kind}:${hashIntegrationSecret(JSON.stringify([clientId, externalId]))}`;
