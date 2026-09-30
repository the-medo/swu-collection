import { useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import { hasMapCoordinates } from './mapData.ts';
import type { SavedTournament } from '../../../../../../../types/UserTournamentSave.ts';

const statuses = {
  saved: { label: 'Saved', variant: 'secondary' },
  maybe: { label: 'Maybe', variant: 'warning' },
  going: { label: 'Going', variant: 'success' },
} as const;

export function YourTournamentsOverlay({
  tournaments,
  isLoading,
  isError,
  onRetry,
  onFocus,
}: {
  tournaments?: SavedTournament[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onFocus: (tournament: MapTournament) => void;
}) {
  const [open, setOpen] = useState(true);
  const isMobile = useIsMobile();
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <aside
      aria-label="Your tournaments"
      className="pointer-events-none absolute inset-y-3 left-3 z-10 flex w-56 max-w-[calc(100%-4.5rem)] flex-col sm:w-64"
    >
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card/95 text-card-foreground shadow-lg backdrop-blur-sm"
      >
        <CollapsibleTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className="group flex w-full shrink-0 items-center gap-2 rounded-lg p-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Star className="size-4 shrink-0" aria-hidden="true" />
            <span>Your tournaments</span>
            {tournaments && (
              <span className="text-xs font-normal text-muted-foreground">
                {tournaments.length}
              </span>
            )}
            <ChevronDown
              aria-hidden="true"
              className="ml-auto size-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="min-h-0 data-[state=open]:flex data-[state=open]:flex-col">
          <div className="flex min-h-0 flex-col border-t p-2">
            {isLoading ? (
              <p role="status" className="p-2 text-xs text-muted-foreground">
                Loading your tournaments…
              </p>
            ) : (
              <>
                {isError && (
                  <div role="alert" className="p-2 text-xs text-destructive">
                    Could not load your saved tournaments.{' '}
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={onRetry}
                    >
                      Retry
                    </Button>
                  </div>
                )}
                {tournaments?.length ? (
                  <ul className="min-h-0 divide-y overflow-y-auto overscroll-contain">
                    {tournaments.map(saved => (
                      <li key={saved.tournamentId} className="relative">
                        <button
                          type="button"
                          aria-label={`Zoom to ${saved.tournament.name}`}
                          title={
                            hasMapCoordinates(saved.tournament)
                              ? 'Show on map'
                              : 'Coordinates are not available for this tournament'
                          }
                          disabled={!hasMapCoordinates(saved.tournament)}
                          onClick={() => {
                            onFocus(saved.tournament);
                            if (isMobile) {
                              setOpen(false);
                              requestAnimationFrame(() => trigger.current?.focus());
                            }
                          }}
                          className="block w-full space-y-1 rounded-md p-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-60"
                        >
                          <div className="line-clamp-2 break-words pr-6 text-xs font-medium leading-snug">
                            {saved.tournament.name}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <time
                              dateTime={saved.tournament.date}
                              className="text-xs text-muted-foreground"
                            >
                              {format(parseISO(saved.tournament.date), 'MMM d, yyyy')}
                            </time>
                            <Badge
                              variant={statuses[saved.status].variant}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {statuses[saved.status].label}
                            </Badge>
                          </div>
                          {!hasMapCoordinates(saved.tournament) && (
                            <p className="text-[10px] text-muted-foreground">
                              No coordinates available
                            </p>
                          )}
                        </button>
                        <Link
                          to="/tournaments/$tournamentId"
                          params={{ tournamentId: saved.tournamentId }}
                          aria-label={`Open ${saved.tournament.name} details`}
                          title="Open tournament details"
                          className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !isError && (
                    <p className="p-2 text-xs text-muted-foreground">
                      No saved tournaments yet. Select a tournament on the map to save it.
                    </p>
                  )
                )}
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-7 w-full shrink-0 text-xs"
                  asChild
                >
                  <Link to="/tournaments/calendar">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    Open calendar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
