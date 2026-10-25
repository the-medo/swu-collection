import { areGameAndMatchRecordsEqual } from '@/components/app/statistics/lib/resultStatistics';
import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { useCardList, type CardListResponse } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { basicBaseForAspect } from '../../../../../../../shared/lib/basicBases.ts';
import { StatisticsDeckArtwork } from '@/components/app/statistics/common/StatisticsDeckArtwork.tsx';
import { ChevronDown } from 'lucide-react';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { Link } from '@tanstack/react-router';
import DeckInfoThumbnailCompact from '@/components/app/statistics/StatisticsDecks/StatisticsDeckLists/DeckInfoThumbnailCompact.tsx';
import { StatSection, StatSectionProps } from '@/components/app/statistics/common/StatSection.tsx';
import { getTeamUrlPrefix } from '@/components/app/teams/lib/getTeamUrlPrefix.ts';
import { getStatisticsTimestampMs } from '@/components/app/statistics/lib/date.ts';
import { useGetBulkDecks } from '@/api/decks/useGetBulkDecks.ts';
import { useQueryClient } from '@tanstack/react-query';
import type { DeckData } from '../../../../../../../types/Deck.ts';
import { useUser } from '@/hooks/useUser.ts';
import { deckKeys } from '@/api/decks/queryKeys.ts';

export interface LeaderBaseInfoThumbnailProps {
  teamId?: string;
  statistics: DeckStatistics;
  deckStatistics: Record<string, DeckStatistics | undefined>;
  statSectionVariant?: StatSectionProps['variant'];
}

const getCardIdFromKey = (
  key: string | undefined,
  cards: CardListResponse['cards'] | undefined,
) => {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
};

const LeaderBaseInfoThumbnail: React.FC<LeaderBaseInfoThumbnailProps> = ({
  teamId,
  statistics,
  deckStatistics,
  statSectionVariant = 'vertical',
}) => {
  const {
    leaderCardId,
    baseCardKey,
    matchWinrate,
    gameWinrate,
    matchWins,
    matchLosses,
    matchDraws,
    totalMatches,
    totalGames,
    gameWins,
    gameLosses,
    gameDraws,
    matches,
  } = statistics;

  const { data: cardListData } = useCardList();

  const recentDecks = useMemo(() => {
    const recentDecksMap: Record<
      string,
      {
        deckId: string;
        deckName?: string;
        lastPlayed?: string;
      }
    > = {};
    matches.forEach(m => {
      const deckId = m.deckId;
      if (!deckId) return;

      const deckName = m.games[0]?.otherData?.deckInfo?.name;
      const playedAt = m.firstGameCreatedAt;

      if (!recentDecksMap[deckId]) {
        recentDecksMap[deckId] = {
          deckId,
          deckName,
          lastPlayed: playedAt,
        };
      } else {
        if (!recentDecksMap[deckId].lastPlayed || recentDecksMap[deckId].lastPlayed < playedAt) {
          recentDecksMap[deckId].lastPlayed = playedAt;
        }
      }
    });

    return Object.values(recentDecksMap)
      .sort((a, b) => {
        if (!a.lastPlayed || !b.lastPlayed) return 0;
        return getStatisticsTimestampMs(b.lastPlayed) - getStatisticsTimestampMs(a.lastPlayed);
      })
      .slice(0, 3);
  }, [matches]);

  const missingDeckNameIds = useMemo(
    () =>
      recentDecks
        .filter(deck => !deck.deckName && !deckStatistics[deck.deckId]?.deckName)
        .map(deck => deck.deckId),
    [deckStatistics, recentDecks],
  );
  const { data: bulkDecksLoaded } = useGetBulkDecks(
    missingDeckNameIds.length > 0 ? missingDeckNameIds : undefined,
  );
  const queryClient = useQueryClient();
  const viewer = useUser();

  const hydratedDeckStatistics = useMemo(() => {
    if (missingDeckNameIds.length > 0 && !bulkDecksLoaded) return deckStatistics;

    const result = { ...deckStatistics };
    recentDecks.forEach(deck => {
      const statistics = result[deck.deckId];
      if (!statistics || statistics.deckName) return;

      const cachedDeck = queryClient.getQueryData<DeckData>(
        deckKeys.detail(deck.deckId, viewer?.id),
      );
      const deckName = deck.deckName ?? cachedDeck?.deck.name;
      if (deckName) result[deck.deckId] = { ...statistics, deckName };
    });
    return result;
  }, [
    bulkDecksLoaded,
    deckStatistics,
    missingDeckNameIds.length,
    queryClient,
    recentDecks,
    viewer?.id,
  ]);

  const { leaderCard, baseCard } = useMemo(() => {
    const leader = leaderCardId ? cardListData?.cards[leaderCardId] : undefined;
    const baseId = getCardIdFromKey(baseCardKey, cardListData?.cards);
    const base = baseId ? cardListData?.cards[baseId] : undefined;

    return {
      leaderCard: leader,
      baseCard: base,
    };
  }, [leaderCardId, baseCardKey, cardListData]);
  const artworkLabel = `${leaderCard?.name ?? 'Unknown leader'} / ${baseCard?.name ?? baseCardKey ?? 'Unknown base'}`;

  return (
    <article className={statisticsStyles.leaderEntry}>
      <div className={statisticsStyles.leaderMain}>
        <Link
          to={`${getTeamUrlPrefix(teamId)}/statistics/leader-and-base`}
          params={{ teamId }}
          search={(prev: Record<string, unknown>) => ({
            ...prev,
            sLeaderCardId: leaderCardId,
            sBaseCardKey: baseCardKey,
          })}
          className={cn(
            'group/deck-row flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-primary',
            statisticsStyles.leaderLink,
          )}
          aria-label={`Statistics for ${artworkLabel}`}
          title={artworkLabel}
        >
          <StatisticsDeckArtwork leaderId={leaderCardId} baseKey={baseCardKey} />
        </Link>
        <div className={statisticsStyles.deckRecords}>
          <StatSection
            label="Games"
            total={totalGames}
            wins={gameWins}
            losses={gameLosses}
            draws={gameDraws}
            winrate={gameWinrate}
            variant={statSectionVariant}
          />
          {!areGameAndMatchRecordsEqual(statistics) && (
            <StatSection
              label="Matches"
              total={totalMatches}
              wins={matchWins}
              losses={matchLosses}
              draws={matchDraws}
              winrate={matchWinrate}
              variant={statSectionVariant}
            />
          )}
        </div>
      </div>
      {recentDecks.length > 0 && (
        <details className={statisticsStyles.recentDecks}>
          <summary>
            <ChevronDown size={13} aria-hidden="true" />
            {recentDecks.length} recent {recentDecks.length === 1 ? 'deck' : 'decks'}
          </summary>
          <div>
            {recentDecks.map(deck => (
              <DeckInfoThumbnailCompact
                key={deck.deckId}
                teamId={teamId}
                statistics={hydratedDeckStatistics[deck.deckId]}
              />
            ))}
          </div>
        </details>
      )}
    </article>
  );
};

export default LeaderBaseInfoThumbnail;
