import { IntegrationAppError } from './errors.ts';

// Bounded LRU buckets: random failed credentials must never fill a global
// rejection bucket or consume another app's allowance. Volumetric/IP limits
// belong at the trusted ingress; never trust arbitrary forwarded IP headers.
export function createIntegrationRateLimiter(maxKeys = 10_000) {
  const windows = new Map<string, { count: number; expires: number }>();
  let nextSweep = 0;
  return (key: string, now = Date.now()) => {
    if (now >= nextSweep) {
      for (const [id, window] of windows) if (window.expires <= now) windows.delete(id);
      nextSweep = now + 10_000;
    }
    const existing = windows.get(key);
    const window =
      existing && existing.expires > now ? existing : { count: 0, expires: now + 60_000 };
    windows.delete(key);
    if (windows.size >= maxKeys) windows.delete(windows.keys().next().value!);
    windows.set(key, window);
    if (++window.count > 120)
      throw new IntegrationAppError('Too many requests. Try again in a minute.', 429);
  };
}
