import { useId, useState } from 'react';
import { ArrowUpRight, ChevronDown, Medal, Trophy } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { cn } from '@/lib/utils';
import { placementLabel } from '../bracketModel';
import type { BracketInteractionProps } from './BracketMatchCard';

export default function TournamentPlacements({
  topDecks,
  hasTopCut,
  selectedDeckId,
  ...interaction
}: BracketInteractionProps & {
  topDecks: TournamentDeckResponse[];
  hasTopCut: boolean;
  selectedDeckId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const groups: { finish: string; decks: TournamentDeckResponse[] }[] = [];
  for (const deck of topDecks) {
    const placement = deck.tournamentDeck.placement;
    const finish = hasTopCut ? placementLabel(placement) : 'Standings';
    const previous = groups.at(-1);
    if (previous?.finish === finish) previous.decks.push(deck);
    else groups.push({ finish, decks: [deck] });
  }
  return (
    <section aria-label="Final standings" className="min-w-0 rounded-xl border bg-muted/20 p-2.5">
      <div className="hidden items-center justify-between px-1 pb-3 pt-1 @[900px]/bracket:flex">
        <h3 className={workspaceStyles.heading}>Final standings</h3>
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {topDecks.length} players
        </span>
      </div>
      <h3 className={cn(workspaceStyles.heading, '@[900px]/bracket:hidden')}>
        <button
          type="button"
          aria-label="Final standings"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded(value => !value)}
          className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Trophy className="size-4 text-primary" aria-hidden="true" />
          <span className="flex-1 text-sm font-semibold">
            Final standings{' '}
            <span className="ml-1 font-normal text-muted-foreground">({topDecks.length})</span>
          </span>
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform motion-reduce:transition-none',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={contentId}
        className={cn(
          'space-y-5 pt-4 @[900px]/bracket:pt-1',
          !expanded && 'hidden @[900px]/bracket:block',
        )}
      >
        {groups.map(({ finish, decks }, groupIndex) => (
          <div
            key={finish}
            role="group"
            aria-labelledby={hasTopCut ? `${contentId}-${groupIndex}` : undefined}
            aria-label={hasTopCut ? undefined : finish}
            className="flex flex-col gap-2"
          >
            {hasTopCut && (
              <h4
                id={`${contentId}-${groupIndex}`}
                className={cn(
                  workspaceStyles.heading,
                  'flex items-center gap-2 px-1! text-[length:0.6875rem]! uppercase tracking-[0.14em]!',
                  finish === 'Champion'
                    ? 'text-primary'
                    : finish === 'Finalist'
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {finish === 'Champion' && <Trophy className="size-3.5" aria-hidden="true" />}
                {finish === 'Finalist' && <Medal className="size-3.5" aria-hidden="true" />}
                {finish}
                <span className="h-px flex-1 bg-current opacity-20" aria-hidden="true" />
              </h4>
            )}
            <ol role="list" className="list-none space-y-1.5">
              {decks.map(deck => {
                const { deckId, placement, meleePlayerUsername: username } = deck.tournamentDeck;
                const champion = placement === 1;
                const playerFinish =
                  hasTopCut || champion ? placementLabel(placement) : `Place ${placement}`;
                const highlighted =
                  (!!username && interaction.highlightedPlayer === username) ||
                  selectedDeckId === deckId;
                return (
                  <li
                    key={deckId}
                    className={cn(
                      'relative flex min-w-0 items-center rounded-lg border',
                      champion
                        ? 'border-primary/25 bg-primary/10'
                        : placement === 2
                          ? 'border-border bg-card'
                          : 'border-transparent bg-card/70',
                      highlighted && 'border-primary/40 bg-primary/15',
                    )}
                    data-screenshot-target="top-placement-deck"
                    data-deck-id={deckId}
                    data-placement={placement ?? undefined}
                    data-player-username={username ?? undefined}
                  >
                    <button
                      type="button"
                      data-bracket-deck-trigger={`${deckId}:standing`}
                      disabled={!deck.deck}
                      onClick={() => deck.deck && interaction.setSelectedDeckId(deck.deck.id)}
                      onMouseEnter={() => interaction.setHighlightedPlayer(username)}
                      onMouseLeave={() => interaction.setHighlightedPlayer(null)}
                      onFocus={() => interaction.setHighlightedPlayer(username)}
                      onBlur={() => interaction.setHighlightedPlayer(null)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left enabled:hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
                      aria-label={`${username ?? 'Unknown player'}, ${playerFinish}. ${deck.deck ? 'View deck' : 'Deck unavailable'}`}
                    >
                      <LeaderBaseArtwork
                        leaderId={deck.deck?.leaderCardId1}
                        baseKey={deck.deck?.baseCardId}
                        size="compact"
                      />
                      <span
                        className="min-w-0 flex-1 truncate text-xs font-semibold"
                        title={username ?? undefined}
                      >
                        {username ?? 'Unknown player'}
                      </span>
                    </button>
                    {deck.deck && (
                      <Link
                        to="/decks/$deckId"
                        params={{ deckId: deck.deck.id }}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${username ?? 'player'} deck in new tab`}
                        className="mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <ArrowUpRight className="size-3" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
