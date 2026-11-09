import { useMemo, type ReactNode } from 'react';
import type { CardStatsParams } from '@/api/card-stats/useCardStats.ts';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { buildCardDeckCounts } from '../../../../../shared/lib/cardDeckCounts.ts';
import { CardStatsDeckCountsContext } from './CardStatsDeckCountsContext.ts';
import { useMetaCardDeckCounts } from '@/api/card-stats/useMetaCardDeckCounts.ts';

interface Props extends CardStatsParams {
  tournamentIds?: string[];
  children: ReactNode;
}

export default function CardStatsDeckCountsProvider({
  metaId,
  tournamentId,
  tournamentGroupId,
  tournamentIds,
  children,
}: Props) {
  const loaded = useTournamentMetaStore();
  const isWholeMeta = tournamentGroupId === undefined && metaId !== undefined;
  const metaCounts = useMetaCardDeckCounts(isWholeMeta ? metaId : undefined);
  const expectedIds =
    tournamentGroupId !== undefined ? tournamentIds : tournamentId ? [tournamentId] : undefined;
  // The store is shared between pages. Never use the previous page's population or error.
  const isMatchingScope =
    expectedIds !== undefined &&
    loaded.tournamentIds.length === expectedIds.length &&
    expectedIds.every(id => loaded.tournamentIds.includes(id));
  const error = isWholeMeta ? metaCounts.error : isMatchingScope ? loaded.error : null;
  const counts = useMemo(() => {
    // Whole-meta card statistics do not share the page's filtered deck population.
    if (isWholeMeta) return metaCounts.data?.data;
    if (!isMatchingScope || !loaded.isLoaded) return undefined;

    return buildCardDeckCounts(
      loaded.decks.map(({ deck }) => ({
        leaderCardId: deck?.leaderCardId1,
        baseCardId: deck?.baseCardId,
      })),
    );
  }, [isWholeMeta, metaCounts.data, isMatchingScope, loaded.isLoaded, loaded.decks]);

  const value = useMemo(
    () => ({
      counts,
      isLoading: isWholeMeta ? metaCounts.isLoading : counts === undefined && !error,
      // Keep displaying cached counts if a background refresh fails.
      error: counts ? null : error,
    }),
    [counts, isWholeMeta, metaCounts.isLoading, error],
  );

  return (
    <CardStatsDeckCountsContext.Provider value={value}>
      {children}
    </CardStatsDeckCountsContext.Provider>
  );
}
