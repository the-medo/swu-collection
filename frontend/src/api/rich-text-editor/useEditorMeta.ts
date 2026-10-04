import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { TournamentStringDate } from '../../../../types/Tournament.ts';
import type { TournamentDeckResponse } from '../tournaments/useGetTournamentDecks.ts';
import type { Widget } from '@/components/app/rich-text-editor/shared/model.ts';

type Scope = Pick<Extract<Widget, { kind: 'meta-analysis' }>, 'scope' | 'id'>;
export function useEditorMeta({ scope, id }: Scope) {
  return useQuery({
    queryKey: ['editor-meta', scope, id],
    enabled: !!id,
    staleTime: 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const init = { init: { signal } };
      const readTournament = async (tournamentId: string) => {
        const result = await api.tournament[':id'].$get({ param: { id: tournamentId } }, init);
        if (!result.ok) throw new Error('Tournament not found or unavailable.');
        return result.json();
      };
      let name: string;
      let tournaments: {
        tournament: Pick<TournamentStringDate, 'id' | 'days' | 'dayTwoPlayerCount' | 'imported'>;
      }[];
      if (scope === 'tournament') {
        const tournament = await readTournament(id);
        tournaments = [tournament];
        name = tournament.tournament.name;
      } else {
        const [groupResult, listResult] = await Promise.all([
          api['tournament-groups'][':id'].$get({ param: { id } }, init),
          api['tournament-groups'][':id'].tournaments.$get({ param: { id } }, init),
        ]);
        if (!groupResult.ok || !listResult.ok)
          throw new Error('Tournament group not found or unavailable.');
        const group = await groupResult.json();
        const list = await listResult.json();
        name = group.data.group.name;
        tournaments = list.data.map(({ tournament }) => ({ tournament }));
      }
      const decks: TournamentDeckResponse[] = [];
      const imported = tournaments.filter(t => t.tournament.imported);
      // Fail the chart if any tournament fails, rather than silently showing partial totals.
      for (let offset = 0; offset < imported.length; offset += 6) {
        const results = await Promise.all(
          imported.slice(offset, offset + 6).map(async t => {
            const result = await api.tournament[':id'].decks.$get(
              { param: { id: t.tournament.id } },
              init,
            );
            if (!result.ok) throw new Error('Could not load tournament decks.');
            return (await result.json()).data as TournamentDeckResponse[];
          }),
        );
        decks.push(...results.flat());
      }
      return {
        name,
        decks,
        tournaments: Object.fromEntries(tournaments.map(t => [t.tournament.id, t])),
      };
    },
  });
}
