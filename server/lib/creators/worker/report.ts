import { desc, eq, sql } from 'drizzle-orm';
import { creation } from '../../../db/schema/creator_hub.ts';
import {
  creatorVideoJob as jobs,
  creatorVideoSpend as spend,
  creatorImportedDeck,
} from '../../../db/schema/creator_video_job.ts';
import { deck } from '../../../db/schema/deck.ts';
import type { JobStatus } from './contracts.ts';
import type { Database } from '../types.ts';

export function createReportStore(database: Database) {
  return {
    async report(page = 1, status?: JobStatus) {
      const attentionFilter = status
        ? eq(jobs.status, status)
        : sql`${jobs.status} IN ('review', 'failed') OR (${jobs.status} = 'pending' AND ${jobs.lastError} IS NOT NULL) OR ${jobs.issues} <> '[]'::jsonb`;
      const [counts, totals, attention, attentionTotals, staged] = await Promise.all([
        database
          .select({ status: jobs.status, count: sql<number>`count(*)::int` })
          .from(jobs)
          .groupBy(jobs.status),
        database
          .select({
            chargedMicros: sql<number>`coalesce(sum(${spend.chargedMicros}),0)::bigint`,
            heldMicros: sql<number>`coalesce(sum(case when ${spend.chargedMicros} is null then ${spend.reservedMicros} else 0 end),0)::bigint`,
            requests: sql<number>`count(*)::int`,
          })
          .from(spend),
        database
          .select({
            videoId: jobs.videoId,
            status: jobs.status,
            creationId: jobs.creationId,
            attempts: jobs.attempts,
            lastError: jobs.lastError,
            issues: jobs.issues,
            analysis: jobs.analysis,
          })
          .from(jobs)
          .where(attentionFilter)
          .orderBy(desc(jobs.updatedAt), desc(jobs.videoId))
          .limit(100)
          .offset((page - 1) * 100),
        database
          .select({ count: sql<number>`count(*)::int` })
          .from(jobs)
          .where(attentionFilter),
        database
          .select({
            pending: sql<number>`count(*)::int`,
            unreferencedOlderThan7Days: sql<number>`count(*) filter (where ${deck.createdAt} < now() - interval '7 days' AND NOT EXISTS (SELECT 1 FROM ${creation} WHERE (${creation.draft}->'references') @> jsonb_build_array(jsonb_build_object('type', 'deck', 'id', ${deck.id}::text)) OR (${creation.published}->'references') @> jsonb_build_array(jsonb_build_object('type', 'deck', 'id', ${deck.id}::text))))::int`,
          })
          .from(creatorImportedDeck)
          .innerJoin(deck, eq(deck.id, creatorImportedDeck.deckId))
          .where(eq(creatorImportedDeck.pendingPublication, true)),
      ]);
      return {
        counts,
        spending: totals[0],
        attention,
        attentionTotal: attentionTotals[0].count,
        attentionPage: page,
        attentionHasMore: page * 100 < attentionTotals[0].count,
        stagedDecks: staged[0],
      };
    },
  };
}
