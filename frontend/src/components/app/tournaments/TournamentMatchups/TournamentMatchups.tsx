import * as React from 'react';
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
import { useSearch, useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import MobileCard from '@/components/ui/mobile-card.tsx';
import { useMemo } from 'react';

export interface TournamentMatchupsProps {
  decks: TournamentDeckResponse[];
  tournaments: TournamentInfoMap;
  matches: TournamentMatch[];
}

const TournamentMatchups: React.FC<TournamentMatchupsProps> = ({ decks, tournaments, matches }) => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  // Use URL parameters with fallbacks to default values
  const matchFilter = (search.maMatchFilter as MatchFilter) || 'all';
  const minRound = search.maMinRound as number | undefined;
  const minPoints = search.maMinPoints as number | undefined;
  const metaInfo = (search.maMetaInfo as MetaInfo) || 'leaders';
  const displayMode = (search.maDisplayMode as MatchupDisplayMode) || 'winLoss';

  const hasDayTwo = useMemo(
    () => Object.values(tournaments).some(t => t.tournament.days > 1),
    [tournaments],
  );

  // Functions to update URL parameters
  const setMatchFilter = (value: MatchFilter) => {
    navigate({
      search: prev => ({ ...prev, maMatchFilter: value }),
    });
  };

  const setMinRound = (value: number | undefined) => {
    navigate({
      search: prev => ({ ...prev, maMinRound: value }),
    });
  };

  const setMinPoints = (value: number | undefined) => {
    navigate({
      search: prev => ({ ...prev, maMinPoints: value }),
    });
  };

  const setMetaInfo = (value: MetaInfo) => {
    navigate({
      search: prev => ({ ...prev, maMetaInfo: value }),
    });
  };

  const setDisplayMode = (value: MatchupDisplayMode) => {
    navigate({
      search: prev => ({ ...prev, maDisplayMode: value }),
    });
  };

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
    <div className="space-y-2">
      <div className="flex flex-row gap-2 flex-wrap items-start justify-between">
        <MobileCard>
          <DisplayModeSelector value={displayMode} onChange={setDisplayMode} />
        </MobileCard>
        <MobileCard>
          <MatchFilterSelector
            value={matchFilter}
            displayAdvancingPlayers={hasDayTwo}
            onChange={setMatchFilter}
            minRound={minRound}
            onMinRoundChange={setMinRound}
            minPoints={minPoints}
            onMinPointsChange={setMinPoints}
          />
        </MobileCard>
        <MobileCard>
          <MetaInfoSelector value={metaInfo} onChange={setMetaInfo} />
        </MobileCard>
      </div>

      {matchupData.keys.length > 0 ? (
        <MatchupTable
          matchupData={matchupData}
          displayMode={displayMode}
          metaInfo={metaInfo}
          labelRenderer={labelRenderer}
          totalMatchesAnalyzed={filteredMatches.length}
        />
      ) : (
        <p className="text-muted-foreground">No data available for the selected filters.</p>
      )}
    </div>
  );
};

export default TournamentMatchups;
