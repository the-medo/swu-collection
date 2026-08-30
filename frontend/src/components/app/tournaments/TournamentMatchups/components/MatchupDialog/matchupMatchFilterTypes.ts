export type DeckAResultFilter = 'any' | 'win' | 'loss';

export type MatchupMatchFilterState = {
  minPlayerCount?: number;
  minRound?: number;
  topCutRoundsOnly: boolean;
  deckAResult: DeckAResultFilter;
  maxPlacementPercentile?: number;
};

export const createDefaultMatchupMatchFilters = (): MatchupMatchFilterState => ({
  topCutRoundsOnly: false,
  deckAResult: 'any',
});
