import { MatchResult } from '@/components/app/statistics/useGameResults.ts';
import { useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import { calculateDeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import DeckInfoThumbnail from '@/components/app/statistics/StatisticsDecks/StatisticsDeckLists/DeckInfoThumbnail.tsx';
import * as React from 'react';
import StatisticsSubpageTabs from '@/components/app/statistics/components/StatisticsSubpageTabs/StatisticsSubpageTabs.tsx';
import SubpageMatches from '@/components/app/statistics/components/SubpageMatches/SubpageMatches.tsx';
import SubpageCardStats from '@/components/app/statistics/components/SubpageCardStats/SubpageCardStats.tsx';
import SubpageMatchups from '@/components/app/statistics/components/SubpageMatchups/SubpageMatchups.tsx';
import SubpageDecklist from '@/components/app/statistics/components/SubpageDecklist/SubpageDecklist.tsx';

interface StatisticsDeckDetailProps {
  matches: MatchResult[];
}

const StatisticsDeckDetail: React.FC<StatisticsDeckDetailProps> = ({ matches = [] }) => {
  const { sDeckId, sSubpage } = useSearch({ strict: false });

  const deck = useMemo(() => {
    if (!sDeckId) return;
    return calculateDeckStatistics(sDeckId, matches);
  }, [sDeckId, matches]);

  if (!deck) {
    return <>Unknown deck</>;
  }

  return (
    <>
      <DeckInfoThumbnail statistics={deck} statSectionVariant="horizontal" />
      <StatisticsSubpageTabs className="mt-4" type="deck" />
      <div className="mt-4">
        {sSubpage === 'matches' && <SubpageMatches matches={matches} />}
        {sSubpage === 'card-stats' && <SubpageCardStats matches={matches} />}
        {sSubpage === 'matchups' && <SubpageMatchups matches={matches} />}
        {sSubpage === 'decklist' && <SubpageDecklist deckStatistics={deck} />}
        {!sSubpage && <SubpageMatches matches={matches} />}
      </div>
    </>
  );
};

export default StatisticsDeckDetail;
