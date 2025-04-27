import * as React from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import MetaPartSelector, { MetaPart } from './MetaPartSelector';
import MetaInfoSelector, { MetaInfo } from './MetaInfoSelector';
import { useCardList } from '@/api/lists/useCardList.ts';
import { isBasicBase } from '@/lib/cards/isBasicBase.ts';
import { useCallback, useMemo, useState } from 'react';
import TournamentMetaDataTable from './TournamentMetaDataTable';
import TournamentMetaChart from './TournamentMetaChart';
import { Button } from '@/components/ui/button';
import { BarChart, TableIcon } from 'lucide-react';

interface TournamentMetaAnalyzerProps {
  decks: TournamentDeckResponse[];
  tournaments: TournamentInfoMap;
}

const TournamentMetaAnalyzer: React.FC<TournamentMetaAnalyzerProps> = ({ decks, tournaments }) => {
  const [metaPart, setMetaPart] = useState<MetaPart>('all');
  const [metaInfo, setMetaInfo] = useState<MetaInfo>('leaders');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
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

      decksToAnalyze.forEach(deck => {
        if (!deck.deck) return;

        let key = '';

        switch (metaInfoType) {
          case 'leaders':
            // Use leader card IDs as key
            key = [deck.deck.leaderCardId1, deck.deck.leaderCardId2]
              .filter(Boolean)
              .sort()
              .join('-');
            break;
          case 'leadersAndBase':
            // Use leader card IDs and base card ID as key
            const leaderKey = [deck.deck.leaderCardId1, deck.deck.leaderCardId2]
              .filter(Boolean)
              .sort()
              .join('-');
            const baseKey = getBaseKey(deck.deck.baseCardId, deck.deckInformation?.baseAspect);
            key = `${leaderKey}|${baseKey}`;
            break;
          case 'bases':
            key = getBaseKey(deck.deck.baseCardId, deck.deckInformation?.baseAspect);
            break;
          case 'aspectsBase':
            // Use base aspect as key
            if (deck.deckInformation?.baseAspect) {
              key = deck.deckInformation.baseAspect;
            } else {
              key = 'no-aspect';
            }
            break;
          case 'aspects':
          case 'aspectsDetailed':
            // Create a key based on which aspects are used
            const aspects: string[] = [];
            if (deck.deckInformation?.aspectCommand)
              Array.from({ length: deck.deckInformation?.aspectCommand }).forEach(() =>
                aspects.push('Command'),
              );
            if (deck.deckInformation?.aspectVigilance)
              Array.from({ length: deck.deckInformation?.aspectVigilance }).forEach(() =>
                aspects.push('Vigilance'),
              );
            if (deck.deckInformation?.aspectAggression)
              Array.from({ length: deck.deckInformation?.aspectAggression }).forEach(() =>
                aspects.push('Aggression'),
              );
            if (deck.deckInformation?.aspectCunning)
              Array.from({ length: deck.deckInformation?.aspectCunning }).forEach(() =>
                aspects.push('Cunning'),
              );
            if (deck.deckInformation?.aspectHeroism)
              Array.from({ length: deck.deckInformation?.aspectHeroism }).forEach(() =>
                aspects.push('Heroism'),
              );
            if (deck.deckInformation?.aspectVillainy)
              Array.from({ length: deck.deckInformation?.aspectVillainy }).forEach(() =>
                aspects.push('Villainy'),
              );
            if (metaInfoType === 'aspects') {
              aspects.forEach(a => {
                countMap.set(a, (countMap.get(a) || 0) + 1);
              });
            } else {
              key = aspects.sort().join('-');
            }

            break;
        }

        if (key) {
          countMap.set(key, (countMap.get(key) || 0) + 1);
        }
      });

      // Convert map to array and sort by count
      return Array.from(countMap.entries())
        .map(([key, count]) => ({
          key,
          count,
          percentage: parseFloat(((count / decksToAnalyze.length) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count);
    },
    [cardListData, getBaseKey],
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
        percentageTop8: inTop8 > 0 ? ((inTop8 / 8) * 100).toFixed(1) : '0',
        percentageDay2: inDay2 > 0 ? ((inDay2 / day2DeckCount) * 100).toFixed(1) : '0',
        percentageTop64: inTop64 > 0 ? ((inTop64 / 64) * 100).toFixed(1) : '0',
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
  }, [allMetaPartsAnalysis, metaPart, filteredDecks.length]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold mb-4">Tournament Meta Analysis</h2>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('chart')}
          >
            <BarChart className="h-4 w-4 mr-2" />
            Chart
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <TableIcon className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      <div className="flex flex-row gap-4 flex-wrap justify-between">
        <MetaPartSelector value={metaPart} onChange={setMetaPart} />
        <MetaInfoSelector value={metaInfo} onChange={setMetaInfo} />
      </div>

      <h3 className="text-lg font-semibold mb-4">Total decks analyzed: {filteredDecks.length}</h3>

      {viewMode === 'chart' ? (
        <TournamentMetaChart
          analysisData={analysisData}
          metaInfo={metaInfo}
          metaPart={metaPart}
          totalDecks={totalDeckCount}
          day2Decks={day2DeckCount}
        />
      ) : (
        <TournamentMetaDataTable
          analysisData={analysisData}
          metaInfo={metaInfo}
          metaPart={metaPart}
          totalDecks={totalDeckCount}
          day2Decks={day2DeckCount}
          metaPartsData={allMetaPartsAnalysis}
        />
      )}
    </div>
  );
};

export default TournamentMetaAnalyzer;
