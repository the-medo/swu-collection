import { eq, sql } from 'drizzle-orm';
import { creatorVideoSpend as spend } from '../../../db/schema/creator_video_job.ts';
import {
  costMicros,
  MODEL,
  RESERVATION_MICROS,
  WorkerError,
  type TokenUsage,
} from './contracts.ts';
import type { Database } from '../types.ts';

export function createSpendingStore(database: Database) {
  return {
    async reserve(videoId: string, capMicros: number) {
      return database.transaction(async tx => {
        await tx.execute(sql`select pg_advisory_xact_lock(728540913)`);
        const [total] = await tx
          .select({
            amount: sql<number>`coalesce(sum(coalesce(${spend.chargedMicros}, ${spend.reservedMicros})), 0)::bigint`,
            anomaly: sql<boolean>`coalesce(bool_or(${spend.chargedMicros} > ${spend.reservedMicros}), false)`,
          })
          .from(spend);
        if (total.anomaly || Number(total.amount) + RESERVATION_MICROS > capMicros)
          throw new WorkerError('budget_exhausted', false);
        const [reservation] = await tx
          .insert(spend)
          .values({ videoId, model: MODEL, reservedMicros: RESERVATION_MICROS })
          .returning({ id: spend.id });
        return reservation.id;
      });
    },
    async settle(id: string, usage: TokenUsage | null) {
      // Timeouts, missing usage and uncertain outcomes retain the full reservation indefinitely.
      if (!usage) return;
      await database
        .update(spend)
        .set({ usage, chargedMicros: costMicros(usage) })
        .where(eq(spend.id, id));
    },
    async releaseRejectedRequest(id: string) {
      await database.update(spend).set({ chargedMicros: 0 }).where(eq(spend.id, id));
    },
  };
}
