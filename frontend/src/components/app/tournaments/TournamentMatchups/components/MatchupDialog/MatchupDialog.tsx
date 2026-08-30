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
import MatchupMatchFilters from './MatchupMatchFilters.tsx';
import MatchupMatchesTable from './MatchupMatchesTable.tsx';
import { createDefaultMatchupMatchFilters } from './matchupMatchFilterTypes.ts';
import { isTopCutRound } from './matchupRound.ts';
import { cn } from '@/lib/utils.ts';

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
  const [mobilePane, setMobilePane] = useState<'matches' | 'deck'>('matches');
  const [matchFilters, setMatchFilters] = useState(createDefaultMatchupMatchFilters);
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

  const filteredMatchupMatches = useMemo(
    () =>
      matchupMatches.filter(matchupMatch => {
        const tournamentId = matchupMatch.match.tournamentId;
        const tournament = tournaments[tournamentId]?.tournament;
        const attendance = tournament?.attendance;

        if (
          matchFilters.minPlayerCount !== undefined &&
          (attendance === undefined || attendance < matchFilters.minPlayerCount)
        ) {
          return false;
        }

        if (
          matchFilters.minRound !== undefined &&
          matchupMatch.match.round < matchFilters.minRound
        ) {
          return false;
        }

        if (matchFilters.topCutRoundsOnly) {
          const totalRounds = roundCountsByTournament.get(tournamentId);
          if (!isTopCutRound(tournament?.bracketInfo, matchupMatch.match.round, totalRounds)) {
            return false;
          }
        }

        if (matchFilters.deckAResult === 'win' && matchupMatch.rowResult !== 3) return false;
        if (matchFilters.deckAResult === 'loss' && matchupMatch.rowResult !== 0) return false;

        if (matchFilters.maxPlacementPercentile !== undefined) {
          const rowPlacement = matchupMatch.rowPlayer.deck.tournamentDeck.placement;
          const colPlacement = matchupMatch.colPlayer.deck.tournamentDeck.placement;

          if (!attendance || rowPlacement === null || colPlacement === null) return false;

          const maxPlacement = (attendance * matchFilters.maxPlacementPercentile) / 100;
          if (rowPlacement > maxPlacement || colPlacement > maxPlacement) return false;
        }

        return true;
      }),
    [matchFilters, matchupMatches, roundCountsByTournament, tournaments],
  );

  const rowLabel = getLabelText(labelRenderer, rowKey, metaInfo);
  const colLabel = getLabelText(labelRenderer, colKey, metaInfo);
  const matchCountLabel =
    filteredMatchupMatches.length === matchupMatches.length
      ? `${matchupMatches.length} ${matchupMatches.length === 1 ? 'match' : 'matches'}`
      : `${filteredMatchupMatches.length} of ${matchupMatches.length} matches`;
  const matchupResult = useMemo(
    () =>
      createMatchupResult({
        matches: filteredMatchupMatches,
        tournaments,
        rowKey,
        colKey,
        metaInfo,
        rowLabel,
        colLabel,
      }),
    [colKey, colLabel, filteredMatchupMatches, metaInfo, rowKey, rowLabel, tournaments],
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

        <div
          aria-label="Matchup dialog view"
          className="grid h-9 w-full grid-cols-2 rounded-md bg-muted p-1 text-muted-foreground xl:hidden"
        >
          <button
            type="button"
            aria-pressed={mobilePane === 'matches'}
            aria-controls="matchup-matches-panel"
            className="rounded-sm px-3 text-sm font-medium transition-all aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => setMobilePane('matches')}
          >
            Matches
          </button>
          <button
            type="button"
            aria-pressed={mobilePane === 'deck'}
            aria-controls="matchup-deck-panel"
            disabled={!selectedDeckId}
            className="rounded-sm px-3 text-sm font-medium transition-all aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
            onClick={() => setMobilePane('deck')}
          >
            Deck details
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)]">
          <section
            id="matchup-matches-panel"
            className={cn(
              'min-h-0 flex-col gap-2 overflow-hidden xl:flex',
              mobilePane === 'matches' ? 'flex' : 'hidden',
            )}
            aria-label="Matchup matches"
          >
            <MatchupMatchFilters value={matchFilters} onChange={setMatchFilters} />
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
                matches={filteredMatchupMatches}
                tournaments={tournaments}
                roundCountsByTournament={roundCountsByTournament}
                rowKey={rowKey}
                colKey={colKey}
                metaInfo={metaInfo}
                onDeckClick={deckId => {
                  setSelectedDeckId(deckId);
                  setMobilePane('deck');
                }}
              />
            </div>
          </section>
          <section
            id="matchup-deck-panel"
            className={cn(
              'min-h-0 overflow-hidden rounded-md border xl:block',
              mobilePane === 'deck' ? 'block' : 'hidden',
            )}
            aria-label="Deck details"
          >
            {selectedDeckId ? (
              <MatchupDeckViewer
                deckId={selectedDeckId}
                onClose={() => {
                  setSelectedDeckId(undefined);
                  setMobilePane('matches');
                }}
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
