import { z } from 'zod';

/** Extract a reference only. A pasted URL is never fetched or stored. */
export function poolIdFromInput(value: string): string | undefined {
  const input = value.trim();
  if (z.uuid().safeParse(input).success) return input.toLowerCase();
  if (input.length > 2048 || /[\s\\]/.test(input)) return;
  try {
    const url = new URL(input, 'https://swubase.com');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
    const id = url.pathname.match(/^\/limited\/pool\/([^/]+)(?:\/detail)?\/?$/)?.[1];
    if (id && z.uuid().safeParse(id).success) return id.toLowerCase();
  } catch {
    // Incomplete input is not a pool link.
  }
}
