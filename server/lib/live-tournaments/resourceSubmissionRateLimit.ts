const WINDOW_MS = 10 * 60_000;
const MAX_SUBMISSIONS = 20;
const MAX_USERS = 10_000;

// Bound per-account bursts that would otherwise create unlimited dev-role pings.
// Like the Crossfire HTTP limiter, this is per backend process, not a global quota.
export function createResourceSubmissionRateLimiter() {
  const buckets = new Map<string, { until: number; used: number }>();
  let nextSweep = 0;

  /** Returns Retry-After seconds, or zero when the submission may proceed. */
  return (userId: string, now = Date.now()): number => {
    if (now >= nextSweep) {
      for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
      nextSweep = now + 60_000;
    }
    let bucket = buckets.get(userId);
    if (bucket && bucket.until <= now) {
      buckets.delete(userId);
      bucket = undefined;
    }
    if (bucket && bucket.used >= MAX_SUBMISSIONS) {
      return Math.max(1, Math.ceil((bucket.until - now) / 1000));
    }
    if (!bucket && buckets.size >= MAX_USERS) return 60;
    if (bucket) bucket.used++;
    else buckets.set(userId, { until: now + WINDOW_MS, used: 1 });
    return 0;
  };
}
