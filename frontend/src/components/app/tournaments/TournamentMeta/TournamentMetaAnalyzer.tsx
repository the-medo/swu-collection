import * as React from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import {
  getDeckKeys,
  TournamentInfoMap,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import MetaPartSelector, { MetaPart } from './MetaPartSelector';
import MetaInfoSelector, { MetaInfo } from './MetaInfoSelector';
import ViewModeSelector, { ViewMode } from './ViewModeSelector';
import { useCardList } from '@/api/lists/useCardList.ts';
import { isBasicBase } from '../../../../../../shared/lib/isBasicBase.ts';
import { useCallback, useMemo, useState } from 'react';
import TournamentMetaDataTable from './TournamentMetaDataTable';
import TournamentMetaChart from './TournamentMetaChart';
import TournamentMetaPieChart from './TournamentMetaPieChart';
import { Alert } from '@/components/ui/alert.tsx';
import { InfoIcon } from 'lucide-react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import MobileCard from '@/components/ui/mobile-card.tsx';
import { Input } from '@/components/ui/input.tsx';

interface TournamentMetaAnalyzerProps {
  decks: TournamentDeckResponse[];
  tournaments: TournamentInfoMap;
}

const TournamentMetaAnalyzer: React.FC<TournamentMetaAnalyzerProps> = ({ decks, tournaments }) => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  // Use URL parameters with fallbacks to default values
  const metaPart = (search.maMetaPart as MetaPart) || 'all';
  const metaInfo = (search.maMetaInfo as MetaInfo) || 'leaders';
  const viewMode = (search.maViewMode as ViewMode) || 'chart';

  // State for minimum deck count filter
  const [minDeckCount, setMinDeckCount] = useState<number | undefined>(undefined);

  // Functions to update URL parameters
  const setMetaPart = (value: MetaPart) => {
    navigate({
      search: prev => ({ ...prev, maMetaPart: value }),
    });
  };

  const setMetaInfo = (value: MetaInfo) => {
    navigate({
      search: prev => ({ ...prev, maMetaInfo: value }),
    });
  };

  const setViewMode = (value: ViewMode) => {
    navigate({
      search: prev => ({ ...prev, maViewMode: value }),
    });
  };

  const { data: cardListData } = useCardList();

  // Compute filtered decks for all meta parts
  const metaPartsDecks = useMemo(() => {
    if (!decks.length) return { all: [], top8: [], day2: [], top64: [] };

    const top8Decks = decks.filter(
      deck => deck.tournamentDeck.placement !== null && deck.tournamentDeck.placement <= 8,
    );

    const day2Decks = decks.filter(deck => {
      const tournamentId = deck.tournamentDeck.tournamentId;
      const tournament = tournaments[tournamentId];
      return (
        tournament?.tournament.dayTwoPlayerCount !== null &&
        deck.tournamentDeck.placement !== null &&
        deck.tournamentDeck.placement <= tournament.tournament.dayTwoPlayerCount
      );
    });

    const top64Decks = decks.filter(
      deck => deck.tournamentDeck.placement !== null && deck.tournamentDeck.placement <= 64,
    );

    return {
      all: decks,
      top8: top8Decks,
      day2: day2Decks,
      top64: top64Decks,
    };
  }, [decks, tournaments]);

  // Get filtered decks based on selected meta part
  const filteredDecks = useMemo(() => {
    return metaPartsDecks[metaPart] || [];
  }, [metaPartsDecks, metaPart]);

  const getBaseKey = useCallback(
    (baseCardId: string | undefined | null, baseAspect: string | undefined | null) => {
      const baseCard = baseCardId ? cardListData?.cards[baseCardId] : undefined;
      return (isBasicBase(baseCard) ? baseAspect : baseCardId) ?? '';
    },
    [cardListData],
  );

  // Helper function to analyze decks based on meta info
  const analyzeDecks = useCallback(
    (decksToAnalyze: TournamentDeckResponse[], metaInfoType: MetaInfo) => {
      if (!decksToAnalyze.length || !cardListData) return [];

      const countMap = new Map<string, number>();
      const winsMap = new Map<string, number>();
      const lossesMap = new Map<string, number>();

      decksToAnalyze.forEach(deck => {
        if (!deck.deck) return;

        let keys = getDeckKeys(deck, metaInfoType, cardListData);

        keys.forEach(key => {
          countMap.set(key, (countMap.get(key) || 0) + 1);
          winsMap.set(key, (winsMap.get(key) || 0) + (deck.tournamentDeck.recordWin || 0));
          lossesMap.set(key, (lossesMap.get(key) || 0) + (deck.tournamentDeck.recordLose || 0));
        });
      });

      // Convert map to array and sort by count
      return Array.from(countMap.entries())
        .map(([key, count]) => {
          const wins = winsMap.get(key) || 0;
          const losses = lossesMap.get(key) || 0;
          const totalGames = wins + losses;
          const winrate = totalGames > 0 ? parseFloat(((wins / totalGames) * 100).toFixed(1)) : 0;

          return {
            key,
            count,
            wins,
            losses,
            winrate,
            percentage: parseFloat(((count / decksToAnalyze.length) * 100).toFixed(1)),
          };
        })
        .sort((a, b) => b.count - a.count);
    },
    [cardListData, getBaseKey, metaInfo],
  );

  // Analyze all meta parts
  const allMetaPartsAnalysis = useMemo(() => {
    if (!cardListData) return { all: [], top8: [], day2: [], top64: [] };

    return {
      all: analyzeDecks(metaPartsDecks.all, metaInfo),
      top8: analyzeDecks(metaPartsDecks.top8, metaInfo),
      day2: analyzeDecks(metaPartsDecks.day2, metaInfo),
      top64: analyzeDecks(metaPartsDecks.top64, metaInfo),
    };
  }, [metaPartsDecks, metaInfo, analyzeDecks, cardListData]);

  const totalDeckCount = metaPartsDecks.all.length;
  const top8DeckCount = metaPartsDecks.top8.length;
  const top64DeckCount = metaPartsDecks.top64.length;
  const day2DeckCount = metaPartsDecks.day2.length;

  // Enhanced analysis data with additional meta information
  const analysisData = useMemo(() => {
    const currentMetaPartData = allMetaPartsAnalysis[metaPart] || [];

    // Add additional meta information to each item
    return currentMetaPartData.map(item => {
      // Find this item in other meta parts
      const inAll = allMetaPartsAnalysis.all.find(i => i.key === item.key)?.count || 0;
      const inTop8 = allMetaPartsAnalysis.top8.find(i => i.key === item.key)?.count || 0;
      const inDay2 = allMetaPartsAnalysis.day2.find(i => i.key === item.key)?.count || 0;
      const inTop64 = allMetaPartsAnalysis.top64.find(i => i.key === item.key)?.count || 0;

      // Calculate conversion rates
      const data = {
        all: inAll,
        top8: inTop8,
        day2: inDay2,
        top64: inTop64,
        // Percantages
        percentageAll: inAll > 0 ? ((inAll / totalDeckCount) * 100).toFixed(1) : '0',
        percentageTop8: inTop8 > 0 ? ((inTop8 / top8DeckCount) * 100).toFixed(1) : '0',
        percentageDay2: inDay2 > 0 ? ((inDay2 / day2DeckCount) * 100).toFixed(1) : '0',
        percentageTop64: inTop64 > 0 ? ((inTop64 / top64DeckCount) * 100).toFixed(1) : '0',
        // Conversion rates (as percentages)
        conversionTop8: inAll > 0 ? ((inTop8 / inAll) * 100).toFixed(1) : '0',
        conversionDay2: inAll > 0 ? ((inDay2 / inAll) * 100).toFixed(1) : '0',
        conversionTop64: inAll > 0 ? ((inTop64 / inAll) * 100).toFixed(1) : '0',
      };

      return {
        ...item,
        data,
        percentage: parseFloat(((item.count / filteredDecks.length) * 100).toFixed(1)),
      };
    });
  }, [
    allMetaPartsAnalysis,
    metaPart,
    filteredDecks.length,
    top8DeckCount,
    totalDeckCount,
    day2DeckCount,
    top64DeckCount,
  ]);

  return (
    <div className="space-y-2">
      <div className="flex flex-row gap-2 flex-wrap justify-between">
        <MobileCard>
          <ViewModeSelector value={viewMode} onChange={setViewMode} />
        </MobileCard>
        <MobileCard>
          <MetaPartSelector value={metaPart} onChange={setMetaPart} />
        </MobileCard>
        <MobileCard>
          <MetaInfoSelector value={metaInfo} onChange={setMetaInfo} />
        </MobileCard>
      </div>

      <div className="flex items-center gap-4 flex-wrap justify-between">
        <span className="text-[10px] w-auto">Total decks analyzed: {filteredDecks.length}</span>
        {viewMode === 'table' && (
          <div className="flex items-center gap-2">
            <label htmlFor="minDeckCount" className="text-[10px] w-[130px]">
              Min. deck count:
            </label>
            <Input
              id="minDeckCount"
              type="number"
              className="h-6 w-20 text-xs"
              min={1}
              value={minDeckCount || ''}
              onChange={e => setMinDeckCount(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        )}
        <Alert variant="info" size="xs" className="w-auto">
          <InfoIcon className="size-4 top-0 left-0" />{' '}
          <ul className="">
            <li>
              Winrates are computed from filtered decks, so decks in top 8 will have naturally
              higher winrates than others. Mirror matches are not cleared from this view.
            </li>
            {metaInfo === 'aspects' && (
              <li>
                In case of double aspect decks, aspect is counted twice. Percentages can be skewed
                because of this.
              </li>
            )}
          </ul>
        </Alert>
      </div>

      {viewMode === 'chart' ? (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3">
            <TournamentMetaPieChart
              analysisData={analysisData}
              metaInfo={metaInfo}
              metaPart={metaPart}
              totalDecks={totalDeckCount}
              day2Decks={day2DeckCount}
              top8Decks={top8DeckCount}
              top64Decks={top64DeckCount}
            />
          </div>
          <div className="w-full md:w-2/3">
            <TournamentMetaChart
              analysisData={analysisData}
              metaInfo={metaInfo}
              metaPart={metaPart}
              totalDecks={totalDeckCount}
              day2Decks={day2DeckCount}
              top8Decks={top8DeckCount}
              top64Decks={top64DeckCount}
            />
          </div>
        </div>
      ) : (
        <TournamentMetaDataTable
          analysisData={analysisData}
          metaInfo={metaInfo}
          metaPart={metaPart}
          totalDecks={totalDeckCount}
          day2Decks={day2DeckCount}
          top8Decks={top8DeckCount}
          top64Decks={top64DeckCount}
          metaPartsData={allMetaPartsAnalysis}
          minDeckCount={minDeckCount}
        />
      )}
    </div>
  );
};

export default TournamentMetaAnalyzer;
