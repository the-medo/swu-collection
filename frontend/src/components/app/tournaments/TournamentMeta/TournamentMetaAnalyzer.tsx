import * as React from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import MetaPartSelector, { MetaPart } from './MetaPartSelector';
import MetaInfoSelector, { MetaInfo } from './MetaInfoSelector';
import { useCardList } from '@/api/lists/useCardList.ts';
import { isBasicBase } from '@/lib/cards/isBasicBase.ts';
import { useCallback, useMemo, useState } from 'react';
import TournamentMetaTable from './TournamentMetaTable';
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

  // Filter decks based on selected meta part
  const filteredDecks = useMemo(() => {
    if (!decks.length) return [];

    switch (metaPart) {
      case 'top8':
        return decks.filter(
          deck => deck.tournamentDeck.placement !== null && deck.tournamentDeck.placement <= 8,
        );
      case 'day2':
        // Filter decks that are in day 2 tournaments
        return decks.filter(deck => {
          const tournamentId = deck.tournamentDeck.tournamentId;
          const tournament = tournaments[tournamentId];
          return (
            tournament?.tournament.dayTwoPlayerCount !== null &&
            deck.tournamentDeck.placement !== null &&
            deck.tournamentDeck.placement <= tournament.tournament.dayTwoPlayerCount
          );
        });
      case 'top64':
        return decks.filter(
          deck => deck.tournamentDeck.placement !== null && deck.tournamentDeck.placement <= 64,
        );
      case 'all':
      default:
        return decks;
    }
  }, [decks, metaPart, tournaments]);

  const getBaseKey = useCallback(
    (baseCardId: string | undefined | null, baseAspect: string | undefined | null) => {
      const baseCard = baseCardId ? cardListData?.cards[baseCardId] : undefined;
      return (isBasicBase(baseCard) ? baseAspect : baseCardId) ?? '';
    },
    [cardListData],
  );

  // Analyze decks based on selected meta info
  const analysisData = useMemo(() => {
    if (!filteredDecks.length) return [];
    if (!cardListData) return [];

    const countMap = new Map<string, number>();

    filteredDecks.forEach(deck => {
      if (!deck.deck) return;

      let key = '';

      switch (metaInfo) {
        case 'leaders':
          // Use leader card IDs as key
          key = [deck.deck.leaderCardId1, deck.deck.leaderCardId2].filter(Boolean).sort().join('-');
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
          if (metaInfo === 'aspects') {
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
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredDecks, metaInfo, cardListData, getBaseKey]);

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
          totalDecks={filteredDecks.length} 
        />
      ) : (
        <TournamentMetaTable 
          analysisData={analysisData} 
          metaInfo={metaInfo} 
          totalDecks={filteredDecks.length} 
        />
      )}
    </div>
  );
};

export default TournamentMetaAnalyzer;
