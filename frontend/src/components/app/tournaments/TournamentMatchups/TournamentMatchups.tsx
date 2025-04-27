import * as React from 'react';
import { useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useLabel } from '../TournamentMeta/useLabel.tsx';
import MetaInfoSelector, { MetaInfo } from '../TournamentMeta/MetaInfoSelector.tsx';
import { MatchFilter, MatchupDisplayMode } from './types';
import MatchFilterSelector from './components/MatchFilterSelector';
import DisplayModeSelector from './components/DisplayModeSelector';
import MatchupTable from './components/MatchupTable';
import { useFilteredMatches } from './hooks/useFilteredMatches';
import { useMatchupData } from './hooks/useMatchupData';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';

export interface TournamentMatchupsProps {
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
  const { data: cardListData } = useCardList();
  const labelRenderer = useLabel();

  const { filteredMatches, filteredDecks } = useFilteredMatches(
    matches,
    matchFilter,
    minRound,
    minPoints,
    tournaments,
    decks,
  );

  const matchupData = useMatchupData(filteredMatches, filteredDecks, cardListData, metaInfo);

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
        <MatchupTable
          matchupData={matchupData}
          displayMode={displayMode}
          metaInfo={metaInfo}
          labelRenderer={labelRenderer}
        />
      ) : (
        <p className="text-muted-foreground">No data available for the selected filters.</p>
      )}
    </div>
  );
};

export default TournamentMatchups;
