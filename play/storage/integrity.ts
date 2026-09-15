import { createHash } from 'node:crypto';
// Object member order is not state: codecs and JSONB may reorder it. Arrays,
// including ordered decks, effects and journals, retain their exact order.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export const stateDigest = (checkpoint: string) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(JSON.parse(checkpoint))))
    .digest('hex');
