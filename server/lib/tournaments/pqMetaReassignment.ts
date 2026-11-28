import { and, eq, gte, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { meta } from '../../db/schema/meta.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentGroup } from '../../db/schema/tournament_group.ts';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournament,
  tournamentWeekendTournamentGroup,
} from '../../db/schema/tournament_weekend.ts';
import { computeAndSaveMetaStatistics } from '../card-statistics/meta-statistics.ts';
import { createLiveWeekendReplacePatchEvent } from '../live-tournaments/liveTournamentHomeCache.ts';
import {
  buildPQMetaReassignmentPlan,
  PQMetaReassignmentError,
  type PQMetaSnapshot,
} from './pqMetaReassignmentPlan.ts';
import type {
  PQMetaReassignmentApplyRequest,
  PQMetaReassignmentRequest,
  PQMetaReassignmentResult,
} from '../../../types/PQMetaReassignment.ts';

const tournamentSelection = {
  id: tournament.id,
  name: tournament.name,
  type: tournament.type,
  format: tournament.format,
  meta: tournament.meta,
  date: sql<string>`${tournament.date}::text`,
  imported: tournament.imported,
  updatedAt: sql<string>`${tournament.updatedAt}::text`,
};

async function loadSnapshot(
  database: Pick<typeof db, 'select'>,
  request: PQMetaReassignmentRequest,
): Promise<PQMetaSnapshot> {
  const upcoming = and(eq(tournament.type, 'pq'), gte(tournament.date, new Date(request.fromDate)));
  const selectedGroupIds = database
    .select({ id: tournamentGroupTournament.groupId })
    .from(tournamentGroupTournament)
    .innerJoin(tournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
    .where(
      and(
        upcoming,
        inArray(
          tournament.format,
          request.targets.map(t => t.formatId),
        ),
      ),
    );
  const groups = await database
    .select({ id: tournamentGroup.id, name: tournamentGroup.name, metaId: tournamentGroup.metaId })
    .from(tournamentGroup)
    .where(
      and(
        like(tournamentGroup.name, 'PQ Week %'),
        or(
          inArray(tournamentGroup.id, selectedGroupIds),
          inArray(
            tournamentGroup.metaId,
            request.targets.map(target => target.metaId),
          ),
        ),
      ),
    );
  const groupIds = groups.map(g => g.id);
  const members = groupIds.length
    ? await database
        .select({ groupId: tournamentGroupTournament.groupId, tournament: tournamentSelection })
        .from(tournamentGroupTournament)
        .innerJoin(tournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
        .where(inArray(tournamentGroupTournament.groupId, groupIds))
    : [];
  const weekendGroups = groupIds.length
    ? await database
        .select({
          tournamentGroupId: tournamentWeekendTournamentGroup.tournamentGroupId,
          tournamentWeekendId: tournamentWeekendTournamentGroup.tournamentWeekendId,
          formatId: tournamentWeekendTournamentGroup.formatId,
          metaId: tournamentWeekendTournamentGroup.metaId,
          date: tournamentWeekend.date,
          name: tournamentWeekend.name,
        })
        .from(tournamentWeekendTournamentGroup)
        .innerJoin(
          tournamentWeekend,
          eq(tournamentWeekendTournamentGroup.tournamentWeekendId, tournamentWeekend.id),
        )
        .where(inArray(tournamentWeekendTournamentGroup.tournamentGroupId, groupIds))
    : [];
  return {
    metas: await database
      .select({ id: meta.id, name: meta.name, format: meta.format, date: meta.date, set: meta.set })
      .from(meta),
    tournaments: await database.select(tournamentSelection).from(tournament).where(upcoming),
    groups,
    members,
    weekendGroups,
  };
}

const defaultEffects = {
  recomputeMeta: computeAndSaveMetaStatistics,
  refreshWeekend: createLiveWeekendReplacePatchEvent,
};

export function createPQMetaReassignmentService(
  database = db,
  effects: {
    recomputeMeta: (id: number) => Promise<unknown>;
    refreshWeekend: (id: string) => Promise<unknown>;
  } = defaultEffects,
) {
  return {
    preview: (request: PQMetaReassignmentRequest) =>
      database.transaction(
        async tx => buildPQMetaReassignmentPlan(request, await loadSnapshot(tx, request)).preview,
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      ),

    apply: async (request: PQMetaReassignmentApplyRequest): Promise<PQMetaReassignmentResult> => {
      const committed = await database
        .transaction(
          async tx => {
            const plan = buildPQMetaReassignmentPlan(request, await loadSnapshot(tx, request));
            const { preview } = plan;
            if (preview.previewToken !== request.previewToken)
              throw new PQMetaReassignmentError(
                'The PQ data or selected metas changed. Preview again before applying.',
                409,
              );
            if (preview.conflicts.length)
              throw new PQMetaReassignmentError(
                'Resolve the conflicting PQ Week groups before applying.',
                409,
              );

            const tournamentIds = preview.tournaments.map(t => t.id);
            for (const target of request.targets) {
              const ids = preview.tournaments
                .filter(t => t.formatId === target.formatId)
                .map(t => t.id);
              if (ids.length)
                await tx
                  .update(tournament)
                  .set({ meta: target.metaId, updatedAt: sql`NOW()` })
                  .where(inArray(tournament.id, ids));
              const groupIds = preview.groups
                .filter(g => g.formatId === target.formatId)
                .map(g => g.id);
              if (groupIds.length)
                await tx
                  .update(tournamentGroup)
                  .set({ metaId: target.metaId })
                  .where(inArray(tournamentGroup.id, groupIds));
            }
            for (const group of preview.weekendGroups) {
              await tx
                .update(tournamentWeekendTournamentGroup)
                .set({ metaId: group.toMetaId, formatId: group.formatId })
                .where(
                  and(
                    eq(tournamentWeekendTournamentGroup.tournamentGroupId, group.id),
                    eq(tournamentWeekendTournamentGroup.tournamentWeekendId, group.weekendId),
                  ),
                );
            }
            const memberships = tournamentIds.length
              ? await tx
                  .select({ id: tournamentWeekendTournament.tournamentWeekendId })
                  .from(tournamentWeekendTournament)
                  .where(inArray(tournamentWeekendTournament.tournamentId, tournamentIds))
              : [];
            // Group metadata can change even when a weekend override already has the target meta.
            const changedGroupIds = preview.groups.map(g => g.id);
            const groupMemberships = changedGroupIds.length
              ? await tx
                  .select({ id: tournamentWeekendTournamentGroup.tournamentWeekendId })
                  .from(tournamentWeekendTournamentGroup)
                  .where(
                    inArray(tournamentWeekendTournamentGroup.tournamentGroupId, changedGroupIds),
                  )
              : [];
            const weekendIds = [
              ...new Set([
                ...memberships.map(m => m.id),
                ...groupMemberships.map(m => m.id),
                ...preview.weekendGroups.map(g => g.weekendId),
              ]),
            ];
            if (weekendIds.length)
              await tx
                .update(tournamentWeekend)
                .set({ updatedAt: sql`NOW()` })
                .where(inArray(tournamentWeekend.id, weekendIds));
            return { ...plan, weekendIds };
          },
          { isolationLevel: 'serializable' },
        )
        .catch(error => {
          const code = error?.code ?? error?.cause?.code;
          if (code === '40001' || code === '40P01')
            throw new PQMetaReassignmentError(
              'The PQ data changed during the update. Preview again before applying.',
              409,
            );
          throw error;
        });

      // Secondary failures must never report that the committed reassignment failed.
      const warnings: string[] = [];
      for (const id of committed.statisticsMetaIds) {
        try {
          await effects.recomputeMeta(id);
        } catch (error) {
          console.error('PQ reassignment meta statistics refresh failed', error);
          warnings.push(
            `Meta ${id}: statistics could not be refreshed. Recompute them from Admin → Metas.`,
          );
        }
      }
      for (const id of committed.weekendIds) {
        try {
          await effects.refreshWeekend(id);
        } catch (error) {
          console.error('PQ reassignment live weekend refresh failed', error);
          warnings.push(
            `Weekend ${id}: live views could not be refreshed. Reload the weekend page.`,
          );
        }
      }
      return {
        tournamentIds: committed.preview.tournaments.map(t => t.id),
        groupCount: committed.preview.groups.length,
        weekendGroupCount: committed.preview.weekendGroups.length,
        warnings,
      };
    },
  };
}

export const pqMetaReassignmentService = createPQMetaReassignmentService();
