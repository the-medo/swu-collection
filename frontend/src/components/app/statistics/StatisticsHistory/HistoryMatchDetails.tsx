import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { ReplayButton } from '@/components/app/crossfire/ReplayButton.tsx';
import MatchResultBox from '../components/MatchResultBox/MatchResultBox.tsx';
import { statisticsStyles as styles } from '../statisticsStyles.ts';
import { parseStatisticsTimestamp } from '../lib/date.ts';
import type { MatchResult } from '../lib/MatchResult.ts';

export default function HistoryMatchDetails({ match }: { match: MatchResult }) {
  const deckName = match.games.find(game => game.otherData?.deckInfo?.name)?.otherData.deckInfo
    ?.name;
  return (
    <div className="statistics-history-details">
      <div className="px-4 pb-2 text-xs text-muted-foreground">
        <time dateTime={parseStatisticsTimestamp(match.firstGameCreatedAt).toISOString()}>
          {format(parseStatisticsTimestamp(match.firstGameCreatedAt), 'EEEE, MMM d, yyyy · HH:mm')}
        </time>
        <div className="mt-1 flex flex-wrap gap-x-2">
          <span>{match.type}</span>
          {match.format && <span>{match.format}</span>}
          <span>
            {match.gameSource === 'crossfire'
              ? 'Crossfire'
              : match.gameSource === 'karabast'
                ? 'Karabast'
                : match.gameSource === 'manual'
                  ? 'Manual entry'
                  : match.gameSource}
          </span>
        </div>
      </div>
      <MatchResultBox
        match={match}
        artworkVariant="portrait"
        showMetadata={false}
        showGames={false}
      />
      {(match.deckId || deckName) && (
        <div className="border-t px-4 py-3">
          <span className="block text-[10px] text-muted-foreground">Deck played</span>
          {match.deckId ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto max-w-full justify-start p-0 text-left whitespace-normal"
              asChild
            >
              <Link to="/decks/$deckId" params={{ deckId: match.deckId }}>
                {deckName || 'View deck'}
                <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <span className="text-sm font-medium">{deckName}</span>
          )}
        </div>
      )}
      <section className="border-t p-4" aria-label="Game-by-game results">
        <h3 className={styles.sectionTitle}>Game by game</h3>
        <div className="mt-3 divide-y">
          {match.games.map((game, index) => {
            const result =
              game.isWinner === true ? 'Win' : game.isWinner === false ? 'Loss' : 'Draw';
            const resultClass =
              game.isWinner === true
                ? styles.recordWins
                : game.isWinner === false
                  ? styles.recordLosses
                  : styles.recordDraws;
            return (
              <div key={game.id ?? game.gameId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium">Game {game.gameNumber ?? index + 1}</span>
                  <span className={resultClass}>{result}</span>
                  {game.gameSource === 'crossfire' && game.otherData?.crossfire?.lobbyId && (
                    <span className="ml-auto">
                      <ReplayButton
                        lobbyId={game.otherData.crossfire.lobbyId}
                        label={`Replay game ${game.gameNumber ?? index + 1}`}
                      />
                    </span>
                  )}
                </div>
                {(typeof game.hasInitiative === 'boolean' ||
                  typeof game.hasMulligan === 'boolean') && (
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {typeof game.hasInitiative === 'boolean' && (
                      <div className="flex gap-1">
                        <dt>Initiative:</dt>
                        <dd className="text-foreground">{game.hasInitiative ? 'Yes' : 'No'}</dd>
                      </div>
                    )}
                    {typeof game.hasMulligan === 'boolean' && (
                      <div className="flex gap-1">
                        <dt>Opening hand:</dt>
                        <dd className="text-foreground">
                          {game.hasMulligan ? 'Mulligan' : 'Kept'}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
                {game.note?.trim() && (
                  <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs whitespace-pre-wrap wrap-anywhere">
                    {game.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
