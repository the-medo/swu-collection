import * as React from 'react';
import { useMemo, useState } from 'react';
import type { CardListResponse } from '@/api/lists/useCardList.ts';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import type { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import type { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import type { TournamentMatch } from '../../../../../../../../server/db/schema/tournament_match.ts';
import MatchResultBox from '@/components/app/statistics/components/MatchResultBox/MatchResultBox.tsx';
import { createMatchupResult } from '../../utils/createMatchupResult.ts';
import { getMatchesForMatchup } from '../../utils/getMatchesForMatchup.ts';
import MatchupDeckViewer from './MatchupDeckViewer.tsx';
import MatchupMatchesTable from './MatchupMatchesTable.tsx';

interface MatchupDialogProps {
  rowKey: string;
  colKey: string;
  matches: TournamentMatch[];
  decks: TournamentDeckResponse[];
  tournaments: TournamentInfoMap;
  metaInfo: MetaInfo;
  cardListData: CardListResponse | undefined;
  labelRenderer: ReturnType<typeof useLabel>;
  onClose: () => void;
}

const getLabelText = (
  labelRenderer: ReturnType<typeof useLabel>,
  key: string,
  metaInfo: MetaInfo,
) => {
  const label = labelRenderer(key, metaInfo, 'text');
  return typeof label === 'string' ? label : key;
};

const MatchupDialog: React.FC<MatchupDialogProps> = ({
  rowKey,
  colKey,
  matches,
  decks,
  tournaments,
  metaInfo,
  cardListData,
  labelRenderer,
  onClose,
}) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>();
  const matchupMatches = useMemo(
    () =>
      getMatchesForMatchup({
        matches,
        decks,
        tournaments,
        rowKey,
        colKey,
        metaInfo,
        cardListData,
      }),
    [cardListData, colKey, decks, matches, metaInfo, rowKey, tournaments],
  );
  const roundCountsByTournament = useMemo(() => {
    const roundCounts = new Map<string, number>();

    matches.forEach(match => {
      const currentMaxRound = roundCounts.get(match.tournamentId) ?? 0;
      roundCounts.set(match.tournamentId, Math.max(currentMaxRound, match.round));
    });

    return roundCounts;
  }, [matches]);

  const rowLabel = getLabelText(labelRenderer, rowKey, metaInfo);
  const colLabel = getLabelText(labelRenderer, colKey, metaInfo);
  const matchCountLabel = `${matchupMatches.length} ${
    matchupMatches.length === 1 ? 'match' : 'matches'
  }`;
  const matchupResult = useMemo(
    () =>
      createMatchupResult({
        matches: matchupMatches,
        tournaments,
        rowKey,
        colKey,
        metaInfo,
        rowLabel,
        colLabel,
      }),
    [colKey, colLabel, matchupMatches, metaInfo, rowKey, rowLabel, tournaments],
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDeckId(undefined);
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-3 overflow-hidden p-3 sm:h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-3rem)] sm:w-[calc(100vw-3rem)] sm:p-4">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base sm:text-lg">
            Matchup: {rowLabel} vs {colLabel}
          </DialogTitle>
          <DialogDescription>
            {matchCountLabel} matching the current matchup filters.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)] xl:overflow-hidden">
          <section
            className="flex min-h-[360px] flex-col gap-2 overflow-hidden xl:min-h-0"
            aria-label="Matchup matches"
          >
            {matchupResult && (
              <MatchResultBox
                match={matchupResult}
                showGames={false}
                showMetadata={false}
                className="shrink-0"
                cardClassName="w-full"
              />
            )}
            <div className="min-h-0 flex-1">
              <MatchupMatchesTable
                matches={matchupMatches}
                tournaments={tournaments}
                roundCountsByTournament={roundCountsByTournament}
                rowKey={rowKey}
                colKey={colKey}
                metaInfo={metaInfo}
                onDeckClick={deckId => setSelectedDeckId(deckId)}
              />
            </div>
          </section>
          <section
            className="min-h-[360px] overflow-hidden rounded-md border xl:min-h-0"
            aria-label="Deck details"
          >
            {selectedDeckId ? (
              <MatchupDeckViewer
                deckId={selectedDeckId}
                onClose={() => setSelectedDeckId(undefined)}
              />
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center p-6 text-center text-sm text-muted-foreground xl:min-h-0">
                Select a player deck to view its decklist.
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchupDialog;
