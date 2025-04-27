import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { isBasicBase } from '@/lib/cards/isBasicBase.ts';
import { useLabel } from '../TournamentMeta/useLabel.tsx';
import MetaInfoSelector, { MetaInfo } from '../TournamentMeta/MetaInfoSelector.tsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import { cn } from '@/lib/utils.ts';

// Define the match filter type
export type MatchFilter = 'all' | 'day2' | 'custom';

// Define the display mode type
export type MatchupDisplayMode = 'winLoss' | 'winrate';

export type MatchupData = Record<string, Record<string, { wins: number; losses: number }>>;

// Utility function to get the appropriate color class based on winrate percentage
const getWinrateColorClass = (winrate: number): string => {
  if (winrate >= 58) {
    return 'bg-green-300 dark:bg-green-950'; // Extremely good
  } else if (winrate >= 54) {
    return 'bg-green-200 dark:bg-green-900'; // Very good
  } else if (winrate >= 52) {
    return 'bg-green-100 dark:bg-green-800'; // Good
  } else if (winrate >= 50) {
    return 'bg-green-50 dark:bg-green-950/30'; // Neutral with very light background
  } else if (winrate >= 48) {
    return 'bg-red-50 dark:bg-red-950/30'; // Neutral with very light background
  } else if (winrate >= 46) {
    return 'bg-red-100 dark:bg-red-900'; // Bad
  } else if (winrate >= 42) {
    return 'bg-red-200 dark:bg-red-800'; // Very bad
  } else {
    return 'bg-red-300 dark:bg-red-950'; // Extremely bad
  }
};

interface MatchFilterSelectorProps {
  value: MatchFilter;
  onChange: (value: MatchFilter) => void;
  minRound: number;
  onMinRoundChange: (value: number) => void;
  minPoints: number;
  onMinPointsChange: (value: number) => void;
}

const MatchFilterSelector: React.FC<MatchFilterSelectorProps> = ({
  value,
  onChange,
  minRound,
  onMinRoundChange,
  minPoints,
  onMinPointsChange,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onChange(v as MatchFilter);
      }
    },
    [onChange],
  );

  const handleMinRoundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      onMinRoundChange(value);
    }
  };

  const handleMinPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onMinPointsChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onValueChange}
        className="justify-start gap-2"
      >
        <ToggleGroupItem value="all">All matches</ToggleGroupItem>
        <ToggleGroupItem value="day2">Day 2 player matches</ToggleGroupItem>
        <ToggleGroupItem value="custom">Custom filter</ToggleGroupItem>
      </ToggleGroup>

      {value === 'custom' && (
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="minRound">Minimum round</Label>
            <Input
              id="minRound"
              type="number"
              min={1}
              value={minRound}
              onChange={handleMinRoundChange}
              className="w-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minPoints">Minimum points</Label>
            <Input
              id="minPoints"
              type="number"
              min={0}
              value={minPoints}
              onChange={handleMinPointsChange}
              className="w-24"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface DisplayModeSelectorProps {
  value: MatchupDisplayMode;
  onChange: (value: MatchupDisplayMode) => void;
}

const DisplayModeSelector: React.FC<DisplayModeSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onChange(v as MatchupDisplayMode);
      }
    },
    [onChange],
  );

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="winLoss">Win/Loss Count</ToggleGroupItem>
      <ToggleGroupItem value="winrate">Winrate %</ToggleGroupItem>
    </ToggleGroup>
  );
};

interface TournamentMatchupsProps {
  decks: TournamentDeckResponse[];
  tournaments: TournamentInfoMap;
  matches: TournamentMatch[];
}

const TournamentMatchups: React.FC<TournamentMatchupsProps> = ({ decks, tournaments, matches }) => {
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const [minRound, setMinRound] = useState<number>(1);
  const [minPoints, setMinPoints] = useState<number>(0);
  const [metaInfo, setMetaInfo] = useState<MetaInfo>('leaders');
  const [displayMode, setDisplayMode] = useState<MatchupDisplayMode>('winLoss');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const { data: cardListData } = useCardList();
  const labelRenderer = useLabel();

  // Get filtered matches based on match filter
  const filteredMatches = useMemo(() => {
    if (!matches.length) return [];

    switch (matchFilter) {
      case 'all':
        return matches;
      case 'day2':
        return matches.filter(match => {
          const tournamentId = match.tournamentId;
          const tournament = tournaments[tournamentId];

          // If we don't have day two player count, we can't filter for day 2
          if (!tournament?.tournament.dayTwoPlayerCount) return false;

          // For day 2 filtering, we need to find matches where at least one player
          // made it to day 2 (has placement <= dayTwoPlayerCount)
          const p1Deck = decks.find(d => d.deck?.id === match.p1DeckId);
          const p2Deck = match.p2DeckId ? decks.find(d => d.deck?.id === match.p2DeckId) : null;

          const p1InDay2 =
            p1Deck?.tournamentDeck.placement &&
            p1Deck?.tournamentDeck.placement <= tournament.tournament.dayTwoPlayerCount;

          const p2InDay2 =
            p2Deck?.tournamentDeck.placement &&
            p2Deck?.tournamentDeck.placement <= tournament.tournament.dayTwoPlayerCount;

          return p1InDay2 || p2InDay2;
        });
      case 'custom':
        return matches.filter(match => {
          const hasMinRound = match.round >= minRound;

          // Check if either player has the minimum points
          // This is a simplification - adjust as needed
          const hasMinPoints =
            match.p1Points >= minPoints || (match.p2Points !== null && match.p2Points >= minPoints);

          return hasMinRound && hasMinPoints;
        });
      default:
        return matches;
    }
  }, [matches, matchFilter, minRound, minPoints, tournaments, decks]);

  // We still need filtered decks for display purposes
  const filteredDecks = useMemo(() => {
    if (!decks.length) return [];

    // Get unique deck IDs from filtered matches
    const deckIds = new Set<string>();
    filteredMatches.forEach(match => {
      deckIds.add(match.p1DeckId);
      if (match.p2DeckId) deckIds.add(match.p2DeckId);
    });

    return decks.filter(deck => deckIds.has(deck.deck?.id || ''));
  }, [decks, filteredMatches]);

  // Helper function to get key for a deck based on meta info
  const getDeckKey = useCallback(
    (deck: TournamentDeckResponse) => {
      if (!deck.deck || !cardListData) return '';

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
            // For 'aspects', we'll just use the first aspect as the key
            key = aspects[0] || 'no-aspect';
          } else {
            key = aspects.sort().join('-') || 'no-aspect';
          }
          break;
      }

      return key;
    },
    [cardListData, metaInfo],
  );

  // Helper function to get base key
  const getBaseKey = useCallback(
    (baseCardId: string | undefined | null, baseAspect: string | undefined | null) => {
      const baseCard = baseCardId ? cardListData?.cards[baseCardId] : undefined;
      return (isBasicBase(baseCard) ? baseAspect : baseCardId) ?? '';
    },
    [cardListData],
  );

  // Analyze matchups using actual match data
  const matchupData = useMemo(() => {
    if (!filteredMatches.length || !cardListData) return { keys: [], matchups: {} as MatchupData };

    // Get all unique deck keys
    const deckKeys = new Set<string>();
    const deckMap = new Map<string, TournamentDeckResponse>(); // Map deck ID to deck object

    // Build a map of deck IDs to deck objects for quick lookup
    filteredDecks.forEach(deck => {
      if (deck.deck?.id) {
        deckMap.set(deck.deck.id, deck);
      }
    });

    // Get all unique deck keys from the filtered matches
    filteredMatches.forEach(match => {
      const p1Deck = deckMap.get(match.p1DeckId);
      const p2Deck = match.p2DeckId ? deckMap.get(match.p2DeckId) : undefined;

      if (p1Deck) {
        const key = getDeckKey(p1Deck);
        if (key) deckKeys.add(key);
      }

      if (p2Deck) {
        const key = getDeckKey(p2Deck);
        if (key) deckKeys.add(key);
      }
    });

    // Create a map to store matchup data
    const matchups: MatchupData = {};

    // Initialize matchup data
    Array.from(deckKeys).forEach(key1 => {
      matchups[key1] = {};
      Array.from(deckKeys).forEach(key2 => {
        if (key1 !== key2) {
          // Ignore mirror matches
          matchups[key1][key2] = { wins: 0, losses: 0 };
        }
      });
    });

    // Analyze each match to count wins and losses between deck types
    filteredMatches.forEach(match => {
      // Skip BYE matches
      if (match.isBye || !match.p2DeckId) return;

      const p1Deck = deckMap.get(match.p1DeckId);
      const p2Deck = deckMap.get(match.p2DeckId);

      if (!p1Deck || !p2Deck) return;

      const p1Key = getDeckKey(p1Deck);
      const p2Key = getDeckKey(p2Deck);

      if (!p1Key || !p2Key || p1Key === p2Key) return; // Skip if keys are missing or it's a mirror match

      // Determine the winner based on the result
      // result: 0 if lose, 1 if draw, 3 if win
      if (match.result === 3) {
        // Player 1 won
        matchups[p1Key][p2Key].wins += 1;
        matchups[p2Key][p1Key].losses += 1;
      } else if (match.result === 0) {
        // Player 1 lost
        matchups[p1Key][p2Key].losses += 1;
        matchups[p2Key][p1Key].wins += 1;
      }
      // Draws are not counted in win/loss
    });

    // Calculate total match count and win/loss stats for each deck type
    const matchCounts = new Map<string, number>();
    const totalStats = new Map<string, { totalWins: number; totalLosses: number }>();

    // Count total matches and calculate total wins/losses for each deck type
    Array.from(deckKeys).forEach(key => {
      let totalMatches = 0;
      let totalWins = 0;
      let totalLosses = 0;

      // Sum up all wins and losses for this deck type
      Array.from(deckKeys).forEach(otherKey => {
        if (key !== otherKey) {
          const winsLosses = matchups[key][otherKey];
          totalMatches += winsLosses.wins + winsLosses.losses;
          totalWins += winsLosses.wins;
          totalLosses += winsLosses.losses;
        }
      });

      matchCounts.set(key, totalMatches);
      totalStats.set(key, { totalWins, totalLosses });
    });

    // Sort keys by total match count (descending)
    const sortedKeys = Array.from(deckKeys).sort((a, b) => {
      return (matchCounts.get(b) || 0) - (matchCounts.get(a) || 0);
    });

    return {
      keys: sortedKeys,
      matchups,
      totalStats,
    };
  }, [filteredMatches, filteredDecks, cardListData, getDeckKey]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold mb-4">Tournament Matchups</h2>
        <DisplayModeSelector value={displayMode} onChange={setDisplayMode} />
      </div>

      <div className="flex flex-row gap-4 flex-wrap justify-between">
        <MatchFilterSelector
          value={matchFilter}
          onChange={setMatchFilter}
          minRound={minRound}
          onMinRoundChange={setMinRound}
          minPoints={minPoints}
          onMinPointsChange={setMinPoints}
        />
        <MetaInfoSelector value={metaInfo} onChange={setMetaInfo} />
      </div>

      <h3 className="text-lg font-semibold mb-4">
        Total matches analyzed: {filteredMatches.length}
      </h3>

      {matchupData.keys.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <td className="p-2 border text-center font-semibold align-bottom min-w-[80px]">
                  Total
                </td>
                <td className="p-2 border"></td>
                {matchupData.keys.map(key => (
                  <td
                    key={key}
                    className={cn(
                      'p-2 border w-[40px] max-w-[40px]',
                      hoveredCol === key && 'opacity-90 bg-accent',
                    )}
                  >
                    <div className="transform -rotate-90 origin-bottom-left whitespace-nowrap h-[250px] flex items-end translate-x-1/2 ml-[20px]  transform-gpu">
                      {labelRenderer(key, metaInfo, 'compact')}
                    </div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchupData.keys.map(rowKey => (
                <tr
                  key={rowKey}
                  className={cn('h-[20px] text-sm', hoveredRow === rowKey && 'bg-accent')}
                >
                  <td
                    className={(() => {
                      const stats = matchupData.totalStats?.get(rowKey);
                      if (!stats)
                        return cn(
                          'p-2 border text-center w-[70px] text-xs font-semibold',
                          hoveredRow === rowKey && 'bg-accent',
                        );
                      const { totalWins, totalLosses } = stats;
                      const total = totalWins + totalLosses;

                      if (total === 0)
                        return cn(
                          'p-2 border text-center w-[70px] text-xs font-semibold',
                          hoveredRow === rowKey && 'bg-accent',
                        );

                      // Calculate winrate and color class
                      const winrate = (totalWins / total) * 100;
                      const colorClass = getWinrateColorClass(winrate);

                      return cn(
                        'p-2 border text-center w-[70px] text-xs font-semibold',
                        colorClass,
                        hoveredRow === rowKey && 'bg-accent',
                      );
                    })()}
                  >
                    {(() => {
                      const stats = matchupData.totalStats?.get(rowKey);
                      if (!stats) return '-';
                      const { totalWins, totalLosses } = stats;
                      const total = totalWins + totalLosses;

                      if (total === 0) return '-';

                      const winrate = (totalWins / total) * 100;
                      return displayMode === 'winLoss'
                        ? `${Math.round(totalWins)}/${Math.round(totalLosses)}`
                        : `${winrate.toFixed(1)}%`;
                    })()}
                  </td>
                  <td
                    className={cn(
                      'p-1 border w-[250px] min-w-[250px]',
                      hoveredRow === rowKey && 'bg-accent font-semibold',
                    )}
                  >
                    {labelRenderer(rowKey, metaInfo, 'compact')}
                  </td>
                  {matchupData.keys.map(colKey => (
                    <td
                      key={colKey}
                      className={cn(
                        'p-2 border text-center w-[50px] text-xs',
                        (() => {
                          if (rowKey === colKey) return ''; // No color for mirror matches

                          const wins = matchupData.matchups[rowKey]?.[colKey]?.wins || 0;
                          const losses = matchupData.matchups[rowKey]?.[colKey]?.losses || 0;
                          const total = wins + losses;

                          if (total === 0) return '';

                          const winrate = (wins / total) * 100;
                          return getWinrateColorClass(winrate);
                        })(),
                        // Highlight cell when it's in the hovered row or column
                        (hoveredRow === rowKey || hoveredCol === colKey) &&
                          rowKey !== colKey &&
                          'opacity-90',
                      )}
                      onMouseEnter={() => {
                        setHoveredRow(rowKey);
                        setHoveredCol(colKey);
                      }}
                      onMouseLeave={() => {
                        setHoveredRow(null);
                        setHoveredCol(null);
                      }}
                    >
                      {rowKey === colKey
                        ? '-'
                        : displayMode === 'winLoss'
                          ? (() => {
                              const wins = matchupData.matchups[rowKey]?.[colKey].wins;
                              const losses = matchupData.matchups[rowKey]?.[colKey].losses;
                              const total = wins + losses;
                              return total > 0 ? (
                                <>
                                  {Math.round(wins)}/{Math.round(losses)}
                                </>
                              ) : (
                                '-'
                              );
                            })()
                          : (() => {
                              const wins = matchupData.matchups[rowKey][colKey].wins;
                              const losses = matchupData.matchups[rowKey][colKey].losses;
                              const total = wins + losses;
                              return total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '-';
                            })()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground">No data available for the selected filters.</p>
      )}
    </div>
  );
};

export default TournamentMatchups;
