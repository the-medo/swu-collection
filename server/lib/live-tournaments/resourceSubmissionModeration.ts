import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import {
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { extractMeleeTournamentId } from './resourceUrls.ts';
import {
  createLiveResourcesPatchEvent,
  createLiveTournamentSummaryPatchEvent,
} from './liveTournamentHomeCache.ts';
import { runTournamentStreamDiscordAfterApproval } from '../discord/tournamentStreams.ts';

export class ResourceSubmissionError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

async function moderateResourceSubmission(
  resourceId: string,
  approved: boolean | undefined,
  weekendId?: string,
) {
  const result = await db.transaction(async tx => {
    const [existing] = await tx
      .select({ resource: tournamentWeekendResource, tournament })
      .from(tournamentWeekendResource)
      .innerJoin(tournament, eq(tournament.id, tournamentWeekendResource.tournamentId))
      .where(eq(tournamentWeekendResource.id, resourceId))
      .limit(1)
      .for('update');
    if (!existing) throw new ResourceSubmissionError('Resource submission not found', 404);
    const weekends = await tx
      .select({ id: tournamentWeekendTournament.tournamentWeekendId })
      .from(tournamentWeekendTournament)
      .where(eq(tournamentWeekendTournament.tournamentId, existing.tournament.id));
    if (weekendId && !weekends.some(weekend => weekend.id === weekendId)) {
      throw new ResourceSubmissionError('Tournament weekend resource not found', 404);
    }

    const isMelee = existing.resource.resourceType === 'melee';
    const meleeId = isMelee ? extractMeleeTournamentId(existing.resource.resourceUrl) : null;
    if (approved && isMelee) {
      if (!meleeId) throw new ResourceSubmissionError('Stored Melee resource URL is invalid', 400);
      if (existing.tournament.meleeId && existing.tournament.meleeId !== meleeId) {
        throw new ResourceSubmissionError(
          `Tournament already has a different Melee ID (${existing.tournament.meleeId})`,
          409,
        );
      }
    }
    const deleting = approved === undefined;
    if (
      meleeId &&
      (approved ||
        ((!deleting || existing.resource.approved) && existing.tournament.meleeId === meleeId))
    ) {
      await tx
        .update(tournament)
        .set({ meleeId: approved ? meleeId : null, updatedAt: sql`NOW()` })
        .where(eq(tournament.id, existing.tournament.id));
    }
    let resource = existing.resource;
    if (deleting) {
      await tx
        .delete(tournamentWeekendResource)
        .where(eq(tournamentWeekendResource.id, resourceId));
    } else {
      [resource] = await tx
        .update(tournamentWeekendResource)
        .set({ approved, updatedAt: sql`NOW()` })
        .where(eq(tournamentWeekendResource.id, resourceId))
        .returning();
    }
    return { resource, previous: existing.resource, weekends, isMelee };
  });

  // The resource belongs to its tournament, not to a single weekend. Publish
  // only after commit and update every weekend that currently contains it.
  const liveUpdates = await Promise.allSettled(
    result.weekends.map(async weekend => {
      if (approved || result.previous.approved) {
        await createLiveResourcesPatchEvent(
          approved === undefined ? 'live_resource.deleted' : 'live_resource.upserted',
          weekend.id,
          approved === undefined ? [resourceId] : undefined,
        );
      }
      if (result.isMelee) {
        await createLiveTournamentSummaryPatchEvent(
          'live_tournament.updated',
          weekend.id,
          result.resource.tournamentId,
        );
      }
    }),
  );
  liveUpdates.forEach((update, index) => {
    if (update.status === 'rejected') {
      console.error(
        `[resource submissions] Could not publish saved resource ${resourceId} to weekend ${result.weekends[index].id}:`,
        update.reason,
      );
    }
  });
  if (approved && !result.previous.approved && result.resource.resourceType === 'stream') {
    await runTournamentStreamDiscordAfterApproval(resourceId);
  }
  return result.resource;
}

export const updateResourceSubmission = (
  resourceId: string,
  approved: boolean,
  weekendId?: string,
) => moderateResourceSubmission(resourceId, approved, weekendId);

export const deleteResourceSubmission = (resourceId: string, weekendId?: string) =>
  moderateResourceSubmission(resourceId, undefined, weekendId);
