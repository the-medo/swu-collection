import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { db } from '@/dexie/db.ts';
import { cardStatsKeys } from '@/api/card-stats/queryKeys.ts';
import { tournamentWeekendQueryKeys } from '@/api/tournament-weekends/queryKeys.ts';
import { tournamentMapKeys } from './mapQueryKeys.ts';
import { calendarSharingKeys } from './calendarSharingKeys.ts';
import type { PQMetaReassignmentApplyRequest } from '../../../../types/PQMetaReassignment.ts';

export function useApplyPQMetaReassignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (request: PQMetaReassignmentApplyRequest) => {
      const response = await api.tournament.bulk['pq-reassign-metas'].apply.$post({
        json: request,
      });
      if (!response.ok) throw await createApiError(response, 'Could not reassign PQ metas.');
      return (await response.json()).data;
    },
    onSuccess: async result => {
      try {
        await Promise.all([
          db.tournamentDecks.bulkDelete(result.tournamentIds),
          db.tournamentMatches.bulkDelete(result.tournamentIds),
        ]);
      } catch (error) {
        // updatedAt also protects persisted-cache freshness on the next read.
        console.warn('Could not clear the local tournament cache after reassignment', error);
      }
      await Promise.all(
        [
          ['tournament'],
          ['tournaments'],
          ['tournament-groups'],
          ['tournament-group'],
          ['tournament-group-tournaments'],
          ['tournaments-bulk'],
          ['tournament-decks'],
          ['tournament-matches'],
          ['tournament-locations'],
          cardStatsKeys.all,
          tournamentWeekendQueryKeys.all,
          tournamentMapKeys.all,
          calendarSharingKeys.all,
        ].map(queryKey => client.invalidateQueries({ queryKey })),
      );
    },
  });
}
