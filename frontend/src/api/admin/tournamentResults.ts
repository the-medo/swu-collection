import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { deleteStoredTournamentDecks, deleteStoredTournamentMatches } from '@/dexie/tournament.ts';
import type { Deck } from '../../../../server/db/schema/deck.ts';
import type { TournamentDeck } from '../../../../server/db/schema/tournament_deck.ts';
import type { TournamentMatch } from '../../../../server/db/schema/tournament_match.ts';

export type AdminTournamentDeckContext = Pick<
  Deck,
  'id' | 'name' | 'leaderCardId1' | 'leaderCardId2' | 'baseCardId'
>;

export interface AdminTournamentStanding {
  tournamentDeck: TournamentDeck;
  deck: AdminTournamentDeckContext | null;
}

export interface TournamentStandingUpdate {
  placement: number | null;
  recordWin: number;
  recordLose: number;
  recordDraw: number;
  points: number;
}

interface AdminTournamentStandingsResponse {
  data: AdminTournamentStanding[];
}

interface AdminTournamentMatchesResponse {
  data: TournamentMatch[];
}

interface AdminTournamentStandingUpdateResponse {
  data: TournamentDeck;
  warnings: string[];
}

export type TournamentStandingMoveDirection = 'up' | 'down';

interface AdminTournamentStandingMoveResponse {
  data: {
    direction: TournamentStandingMoveDirection;
  };
  warnings: string[];
}

interface AdminTournamentRoundApplyMatchesResponse {
  data: {
    matchesApplied: number;
    standingsUpdated: number;
  };
  warnings: string[];
}

function standingsQueryKey(tournamentId: string) {
  return ['admin', 'tournament-results', tournamentId, 'standings'] as const;
}

function matchesQueryKey(tournamentId: string) {
  return ['admin', 'tournament-results', tournamentId, 'matches'] as const;
}

async function invalidateTournamentResultCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  tournamentId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: standingsQueryKey(tournamentId) }),
    queryClient.invalidateQueries({ queryKey: matchesQueryKey(tournamentId) }),
    queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
    queryClient.invalidateQueries({ queryKey: ['tournament-decks', tournamentId] }),
    queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] }),
    queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
    deleteStoredTournamentDecks(tournamentId),
    deleteStoredTournamentMatches(tournamentId),
  ]);
}

async function readApiError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
  return new Error(body?.message || fallback);
}

export function useAdminTournamentStandings(tournamentId: string) {
  return useQuery<AdminTournamentStandingsResponse, Error>({
    queryKey: standingsQueryKey(tournamentId),
    queryFn: async () => {
      const response = await api.admin.tournaments[':tournamentId'].standings.$get({
        param: { tournamentId },
      });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to load tournament standings');
      }

      return (await response.json()) as AdminTournamentStandingsResponse;
    },
  });
}

export function useAdminTournamentMatches(tournamentId: string) {
  return useQuery<AdminTournamentMatchesResponse, Error>({
    queryKey: matchesQueryKey(tournamentId),
    queryFn: async () => {
      const response = await api.admin.tournaments[':tournamentId'].matches.$get({
        param: { tournamentId },
      });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to load tournament matches');
      }

      return (await response.json()) as AdminTournamentMatchesResponse;
    },
  });
}

export function useUpdateAdminTournamentStanding(tournamentId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    AdminTournamentStandingUpdateResponse,
    Error,
    { deckId: string; values: TournamentStandingUpdate }
  >({
    mutationFn: async ({ deckId, values }) => {
      const response = await api.admin.tournaments[':tournamentId'].standings[':deckId'].$patch({
        param: { tournamentId, deckId },
        json: values,
      });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to update tournament standing');
      }

      return (await response.json()) as AdminTournamentStandingUpdateResponse;
    },
    onSuccess: async () => {
      await invalidateTournamentResultCaches(queryClient, tournamentId);
    },
  });
}

export function useMoveAdminTournamentStanding(tournamentId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    AdminTournamentStandingMoveResponse,
    Error,
    { deckId: string; direction: TournamentStandingMoveDirection }
  >({
    mutationFn: async ({ deckId, direction }) => {
      const response = await api.admin.tournaments[':tournamentId'].standings[':deckId'].move.$post(
        {
          param: { tournamentId, deckId },
          json: { direction },
        },
      );

      if (!response.ok) {
        throw await readApiError(response, 'Failed to move tournament standing');
      }

      return (await response.json()) as AdminTournamentStandingMoveResponse;
    },
    onSuccess: async () => {
      await invalidateTournamentResultCaches(queryClient, tournamentId);
    },
  });
}

export function useApplyAdminTournamentRoundMatches(tournamentId: string) {
  const queryClient = useQueryClient();

  return useMutation<AdminTournamentRoundApplyMatchesResponse, Error, { round: number }>({
    mutationFn: async ({ round }) => {
      const response = await api.admin.tournaments[':tournamentId'].rounds[':round'][
        'apply-matches'
      ].$post({
        param: { tournamentId, round: round.toString() },
      });

      if (!response.ok) {
        throw await readApiError(response, 'Failed to apply tournament round matches');
      }

      return (await response.json()) as AdminTournamentRoundApplyMatchesResponse;
    },
    onSuccess: async () => {
      await invalidateTournamentResultCaches(queryClient, tournamentId);
    },
  });
}
