import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import {
  creation,
  creationReference,
  creationRevision,
  creatorProfile,
} from '../../../db/schema/creator_hub.ts';
import {
  creatorVideoJob as jobs,
  creatorImportedDeck,
  creatorClaimedDeck,
} from '../../../db/schema/creator_video_job.ts';
import { deck } from '../../../db/schema/deck.ts';
import { writeCreatorPublication } from '../publication.ts';
import { assertChannelImportAllowed } from './channel-policy.ts';
import type { CreationDocument } from '../../../../shared/creators/contracts.ts';
import { WorkerError, type WorkerIssue, type JobStatus } from './contracts.ts';
import { now, ownedClaim, type Job } from './state.ts';
import type { Database } from '../types.ts';

export function createPublicationStore(database: Database) {
  return {
    async publish(
      job: Job,
      document: CreationDocument,
      autoPublish: boolean,
      issues: WorkerIssue[],
    ) {
      return database.transaction(async tx => {
        const [profile] = await tx
          .select()
          .from(creatorProfile)
          .where(eq(creatorProfile.id, job.creatorId))
          .for('update');
        const [claimed] = await tx.select().from(jobs).where(ownedClaim(job)).for('update');
        if (!profile || !claimed) throw new WorkerError('job_claim_lost', false);
        await assertChannelImportAllowed(tx, claimed);
        // OAuth imports and concurrent/manual saves take precedence over automation.
        const [inserted] = await tx
          .insert(creation)
          .values({
            creatorId: job.creatorId,
            authorId: profile.ownerId,
            sourceVideoId: job.videoId,
            sourceChannelId: job.channelId,
            sourceDataOrigin: 'public',
            sourceStatus: 'active',
            sourceMetadataAt: claimed.metadataFetchedAt ?? now(),
            sourceCheckedAt: now(),
            draft: document,
          })
          .onConflictDoNothing({ target: creation.sourceVideoId })
          .returning();
        if (!inserted) {
          const [existing] = await tx
            .select()
            .from(creation)
            .where(eq(creation.sourceVideoId, job.videoId));
          if (existing?.creatorId !== job.creatorId)
            throw new WorkerError('video_belongs_to_another_creator', false);
          await tx
            .update(jobs)
            .set({
              status: 'skipped',
              creationId: existing.id,
              lastError: 'existing_creation_preserved',
              claimId: null,
              leaseUntil: null,
              updatedAt: now(),
            })
            .where(ownedClaim(job));
          return 'skipped' as JobStatus;
        }
        let finalDocument = document;
        if (autoPublish) {
          const deckIds = document.references.filter(r => r.type === 'deck').map(r => r.id);
          const allowedDecks = new Set<string>();
          const sourcesByDeck = new Map<string, { source: string; sourceDeckId: string }>();
          if (deckIds.length) {
            const imported = await tx
              .select({
                deck,
                mapping: creatorImportedDeck,
                wasClaimed: sql<boolean>`EXISTS (SELECT 1 FROM ${creatorClaimedDeck} WHERE ${creatorClaimedDeck.deckId} = ${deck.id})`,
                untouched: sql<boolean>`${deck.updatedAt} = ${deck.createdAt}`,
              })
              .from(creatorImportedDeck)
              .innerJoin(deck, eq(deck.id, creatorImportedDeck.deckId))
              .where(
                and(
                  inArray(deck.id, deckIds),
                  eq(creatorImportedDeck.userId, profile.ownerId ?? 'swubase'),
                  eq(deck.userId, profile.ownerId ?? 'swubase'),
                ),
              )
              .orderBy(asc(deck.id))
              .for('update', { of: deck });
            for (const row of imported) {
              sourcesByDeck.set(row.deck.id, {
                source: row.mapping.source,
                sourceDeckId: row.mapping.sourceDeckId,
              });
              if (row.mapping.pendingPublication && row.deck.public === 2 && row.untouched) {
                await tx
                  .update(deck)
                  .set({ public: 1, updatedAt: new Date() })
                  .where(eq(deck.id, row.deck.id));
                allowedDecks.add(row.deck.id);
              } else if (
                row.deck.public === 1 ||
                (row.deck.public === 2 && !row.mapping.pendingPublication && row.wasClaimed)
              )
                allowedDecks.add(row.deck.id);
              if (allowedDecks.has(row.deck.id) && row.mapping.pendingPublication)
                await tx
                  .update(creatorImportedDeck)
                  .set({ pendingPublication: false })
                  .where(
                    and(
                      eq(creatorImportedDeck.userId, row.mapping.userId),
                      eq(creatorImportedDeck.source, row.mapping.source),
                      eq(creatorImportedDeck.sourceDeckId, row.mapping.sourceDeckId),
                    ),
                  );
            }
          }
          // Another creator may claim a shared original after this run imported
          // it. These references came from importVideoDeck, not client input.
          // Keep them if the original was transferred during this job's lease.
          const movedIds = deckIds.filter(id => !allowedDecks.has(id));
          if (movedIds.length) {
            const moved = await tx
              .select({ id: deck.id })
              .from(deck)
              .innerJoin(creatorClaimedDeck, eq(creatorClaimedDeck.deckId, deck.id))
              .where(
                and(
                  inArray(deck.id, movedIds),
                  inArray(deck.public, [1, 2]),
                  gte(creatorClaimedDeck.claimedAt, job.updatedAt),
                ),
              )
              .orderBy(asc(deck.id))
              .for('update', { of: deck });
            if (moved.length) {
              // Establish the trusted worker links before scoped publication
              // validation; both the links and publication commit together.
              await tx
                .insert(creationReference)
                .values(
                  moved.map(row => ({
                    creationId: inserted.id,
                    entityType: 'deck',
                    entityId: row.id,
                  })),
                );
              for (const row of moved) allowedDecks.add(row.id);
            }
          }
          for (const id of deckIds)
            if (!allowedDecks.has(id))
              issues.push({
                code: 'deck_changed_before_publication',
                deckId: id,
                ...sourcesByDeck.get(id),
              });
          finalDocument = {
            ...document,
            references: document.references.filter(
              r => r.type !== 'deck' || allowedDecks.has(r.id),
            ),
          };
          await tx
            .update(creation)
            .set({ draft: finalDocument })
            .where(eq(creation.id, inserted.id));
        }
        await tx
          .insert(creationRevision)
          .values({ creationId: inserted.id, revision: 1, document: finalDocument });
        if (autoPublish)
          await writeCreatorPublication(tx, {
            ...inserted,
            draft: finalDocument,
            publishedAt: claimed.metadata?.publishedAt ?? null,
          });
        const status = autoPublish ? 'published' : 'review';
        await tx
          .update(jobs)
          .set({
            status,
            creationId: inserted.id,
            issues,
            claimId: null,
            leaseUntil: null,
            lastError: null,
            updatedAt: now(),
          })
          .where(ownedClaim(job));
        return status as JobStatus;
      });
    },
  };
}
