import { createHmac } from 'node:crypto';
/** Stable private-key handles survive storage compaction; never expose the key. */
export function historyHandle(
  key: string,
  gameId: string,
  kind: 'position' | 'branch',
  value: number,
): string {
  return createHmac('sha256', key)
    .update(JSON.stringify([gameId, kind, value]))
    .digest('hex')
    .slice(0, 32);
}
