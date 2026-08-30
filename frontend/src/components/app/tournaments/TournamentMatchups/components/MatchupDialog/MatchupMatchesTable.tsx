import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { useCardList, type CardListResponse } from '@/api/lists/useCardList.ts';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import {
  getDeckLeadersAndBaseKey,
  type TournamentInfoMap,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { cn } from '@/lib/utils.ts';
import type { MatchupMatch } from '../../utils/getMatchesForMatchup.ts';

const MATCHES_BATCH_SIZE = 30;
const LOAD_MORE_THRESHOLD_PX = 200;

interface MatchupMatchesTableProps {
  matches: MatchupMatch[];
  tournaments: TournamentInfoMap;
  roundCountsByTournament: ReadonlyMap<string, number>;
  rowKey: string;
  colKey: string;
  metaInfo: MetaInfo;
  onDeckClick: (deckId: string) => void;
}

interface PlayerDeckProps {
  playerName: string | null;
  deck: TournamentDeckResponse;
  points: number | null;
  cardListData: CardListResponse | undefined;
  labelRenderer: ReturnType<typeof useLabel>;
  onClick: (deckId: string) => void;
}

const PlayerDeck: React.FC<PlayerDeckProps> = ({
  playerName,
  deck,
  points,
  cardListData,
  labelRenderer,
  onClick,
}) => {
  const deckId = deck.deck?.id;
  const deckKey = getDeckLeadersAndBaseKey(deck.deck, cardListData);
  const playerInfo = [
    points !== null ? `${points} pts` : undefined,
    `Final ${deck.tournamentDeck.recordWin}-${deck.tournamentDeck.recordLose}-${deck.tournamentDeck.recordDraw} (${deck.tournamentDeck.points} pts)`,
    playerName ?? 'Unknown player',
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {deckId && deckKey ? (
        <button
          type="button"
          className="w-full truncate rounded-sm px-1 py-0.5 text-left text-xs transition-colors hover:bg-background/60 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          onClick={() => onClick(deckId)}
        >
          {labelRenderer(deckKey, 'leadersAndBase', 'compact')}
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">Deck unavailable</span>
      )}
      <span className="block truncate text-[11px] text-muted-foreground" title={playerInfo}>
        {playerInfo}
      </span>
    </div>
  );
};

const formatTournamentDate = (value: string) => {
  // Tournament dates are usually stored as YYYY-MM-DD, but imported data may
  // already include a time and timezone. Only add a local midnight to date-only
  // values; appending it to a complete timestamp creates an invalid date.
  const date = new Date(value.includes('T') || value.includes(' ') ? value : `${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(date);
};

const MatchupMatchesTable: React.FC<MatchupMatchesTableProps> = ({
  matches,
  tournaments,
  roundCountsByTournament,
  rowKey,
  colKey,
  metaInfo,
  onDeckClick,
}) => {
  const { data: cardListData } = useCardList();
  const labelRenderer = useLabel();
  const [visibleMatchCount, setVisibleMatchCount] = React.useState(MATCHES_BATCH_SIZE);

  React.useEffect(() => {
    setVisibleMatchCount(MATCHES_BATCH_SIZE);
  }, [matches]);

  const visibleMatches = matches.slice(0, visibleMatchCount);
  const hasMoreMatches = visibleMatchCount < matches.length;

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMoreMatches) return;

      const scrollContainer = event.currentTarget;
      const distanceFromBottom =
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;

      if (distanceFromBottom <= LOAD_MORE_THRESHOLD_PX) {
        setVisibleMatchCount(currentCount =>
          Math.min(currentCount + MATCHES_BATCH_SIZE, matches.length),
        );
      }
    },
    [hasMoreMatches, matches.length],
  );

  if (!matches.length) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center rounded-md border p-6 text-sm text-muted-foreground">
        No matches are available for this matchup.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-md border" onScroll={handleScroll}>
      <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-background shadow-xs">
          <tr>
            <th scope="col" className="w-[180px] border-b p-2 text-left text-xs font-semibold">
              Tournament
            </th>
            <th scope="col" className="w-[68px] border-b p-2 text-left text-xs font-semibold">
              Match
            </th>
            <th scope="col" className="w-[250px] border-b p-2 text-left text-xs font-semibold">
              {labelRenderer(rowKey, metaInfo, 'compact')}
            </th>
            <th scope="col" className="w-[64px] border-b p-2 text-center text-xs font-semibold">
              Score
            </th>
            <th scope="col" className="w-[250px] border-b p-2 text-left text-xs font-semibold">
              {labelRenderer(colKey, metaInfo, 'compact')}
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleMatches.map(
            ({ match, rowPlayer, colPlayer, rowGameWins, colGameWins, gameDraws, rowResult }) => {
              const tournament = tournaments[match.tournamentId]?.tournament;
              const rowPlayerWon = rowResult === 3;
              const colPlayerWon = rowResult === 0;
              const isDraw = rowResult === 1;
              const totalRounds = roundCountsByTournament.get(match.tournamentId);
              const score =
                gameDraws > 0
                  ? `${rowGameWins}-${colGameWins}-${gameDraws}`
                  : `${rowGameWins}-${colGameWins}`;

              return (
                <tr key={match.id} className="border-b last:border-b-0 hover:bg-accent/40">
                  <td className="p-2 align-top">
                    <Link
                      to="/tournaments/$tournamentId"
                      params={{ tournamentId: match.tournamentId }}
                      className="flex items-start gap-1 text-xs hover:underline"
                    >
                      <ExternalLink className="mt-0.5 size-3 shrink-0" />
                      <span className="truncate">{tournament?.name ?? 'Unknown tournament'}</span>
                    </Link>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">
                      {tournament?.date && formatTournamentDate(tournament.date)}
                      {tournament?.attendance !== undefined &&
                        ` (${tournament.attendance} players)`}
                    </div>
                  </td>
                  <td className="whitespace-nowrap p-2 align-top text-xs">
                    <strong>R{match.round}</strong>
                    {totalRounds ? ` of ${totalRounds}` : ''}
                  </td>
                  <td
                    className={cn('p-2 align-top', {
                      'bg-green-100/60 dark:bg-green-900/40': rowPlayerWon,
                      'bg-red-100/60 dark:bg-red-900/40': colPlayerWon,
                      'bg-amber-100/60 dark:bg-amber-900/40': isDraw,
                    })}
                  >
                    <PlayerDeck
                      playerName={rowPlayer.username}
                      deck={rowPlayer.deck}
                      points={rowPlayer.points}
                      cardListData={cardListData}
                      labelRenderer={labelRenderer}
                      onClick={onDeckClick}
                    />
                  </td>
                  <td className="p-2 text-center align-middle">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-1 text-xs font-bold tabular-nums',
                        {
                          'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300':
                            rowPlayerWon,
                          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300':
                            colPlayerWon,
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300':
                            isDraw,
                        },
                      )}
                      aria-label={`Row deck to column deck game score: ${score}`}
                    >
                      {score}
                    </span>
                    {gameDraws > 0 && (
                      <div className="mt-1 text-[10px] text-muted-foreground">W-L-D</div>
                    )}
                  </td>
                  <td
                    className={cn('p-2 align-top', {
                      'bg-red-100/60 dark:bg-red-900/40': rowPlayerWon,
                      'bg-green-100/60 dark:bg-green-900/40': colPlayerWon,
                      'bg-amber-100/60 dark:bg-amber-900/40': isDraw,
                    })}
                  >
                    <PlayerDeck
                      playerName={colPlayer.username}
                      deck={colPlayer.deck}
                      points={colPlayer.points}
                      cardListData={cardListData}
                      labelRenderer={labelRenderer}
                      onClick={onDeckClick}
                    />
                  </td>
                </tr>
              );
            },
          )}
          {hasMoreMatches && (
            <tr>
              <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground">
                Showing {visibleMatches.length} of {matches.length} matches. Scroll to load more.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MatchupMatchesTable;
