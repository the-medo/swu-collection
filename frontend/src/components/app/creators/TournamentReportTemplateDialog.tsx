import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Trophy,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useUserTournaments } from '@/api/user/useUserTournaments.ts';
import { useRefreshUserTournaments } from '@/api/user/useRefreshUserTournaments.ts';
import { useTournamentReport } from '@/api/user/useTournamentReport.ts';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { cn } from '@/lib/utils.ts';
import type { TournamentReport } from '../../../../../shared/types/TournamentReport.ts';
import { reportRoundResult } from '../../../../../shared/posts/templates.ts';

export function TournamentReportTemplateDialog({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (report?: TournamentReport) => void;
}) {
  const user = useUser();
  const history = useUserTournaments(user?.id ?? '', { refetchOnWindowFocus: 'always' });
  const refresh = useRefreshUserTournaments(user?.id ?? '');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>();
  const report = useTournamentReport(selected);
  const [now, setNow] = useState(Date.now);
  const nextRefreshAt = history.data?.nextRefreshAt ? Date.parse(history.data.nextRefreshAt) : 0;
  useEffect(() => {
    if (nextRefreshAt <= now) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextRefreshAt - Date.now()) + 50,
    );
    return () => window.clearTimeout(timer);
  }, [nextRefreshAt, now]);
  const events =
    history.data?.tournaments.filter(
      event =>
        event.tournamentId &&
        `${event.name} ${event.format ?? ''} ${event.date}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  const connected = history.data?.connected;
  const ready =
    connected && report.data && !report.isFetching && !report.isError && !refresh.isPending;
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b bg-muted/30 px-5 pb-5 pt-6 text-left sm:px-6">
          <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Trophy className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle className="m-0! border-0! p-0! text-2xl! leading-tight!">
            Tournament report
          </DialogTitle>
          <DialogDescription className="m-0! text-sm! leading-relaxed!">
            Choose an event from your Melee history. We’ll fill in your deck, opponents, and round
            results so you can focus on the story.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
          {!user ? (
            <p className="text-sm text-muted-foreground">
              Sign in and connect Melee to use your tournament history, or start with a blank
              report.
            </p>
          ) : history.isPending ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading your tournaments…
            </p>
          ) : history.isError ? (
            <div role="alert" className="space-y-3 text-sm">
              <p>{history.error.message}</p>
              <Button variant="outline" onClick={() => void history.refetch()}>
                Retry tournaments
              </Button>
            </div>
          ) : !connected ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm">
              <strong>Bring your tournament history with you</strong>
              <p className="mt-2 text-muted-foreground">
                Connect your Melee account to find the events you attended and build a report from
                your results.
              </p>
              <Button className="mt-4" variant="outline" asChild>
                <Link
                  to="/settings"
                  search={{ page: 'integrations' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Connect Melee
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">Your tournaments</strong>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={refresh.isPending || nextRefreshAt > now}
                  onClick={() => refresh.mutate()}
                >
                  <RefreshCw
                    className={cn('mr-2 size-3.5', refresh.isPending && 'animate-spin')}
                    aria-hidden="true"
                  />
                  {refresh.isPending
                    ? 'Refreshing…'
                    : nextRefreshAt > now
                      ? 'Refresh available soon'
                      : 'Refresh from Melee'}
                </Button>
              </div>
              {refresh.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {refresh.error.message}
                </p>
              )}
              {!!history.data?.tournaments.length && (
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Search your tournaments"
                    placeholder="Find an event…"
                    className="pl-9"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>
              )}
              <div
                aria-label="Your tournaments"
                className="max-h-64 overflow-y-auto rounded-xl border divide-y"
              >
                {events.length ? (
                  events.map(event => (
                    <button
                      key={event.tournamentId}
                      type="button"
                      aria-pressed={selected === event.tournamentId}
                      onClick={() => setSelected(event.tournamentId!)}
                      className={cn(
                        'flex w-full items-start gap-3 p-3 text-left outline-offset-[-2px] transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring sm:p-4',
                        selected === event.tournamentId && 'bg-primary/5',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
                          selected === event.tournamentId && 'bg-primary/10 text-primary',
                        )}
                      >
                        <CalendarDays className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-medium [overflow-wrap:anywhere]">
                          {event.name}
                        </strong>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          <time dateTime={event.date}>
                            {new Date(`${event.date}T12:00:00`).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </time>
                          {event.format && ` · ${event.format}`}
                          {` · ${event.attendance} players`}
                        </span>
                        <span className="mt-1 block text-xs font-medium">
                          {[event.placement ? `#${event.placement}` : null, event.record]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      {selected === event.tournamentId ? (
                        <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))
                ) : (
                  <p className="p-5 text-sm text-muted-foreground">
                    {search
                      ? 'No tournaments match your search.'
                      : 'No tournaments found yet. Refresh from Melee to find events in the SWUBASE catalog.'}
                  </p>
                )}
              </div>
              {selected &&
                (report.isPending ? (
                  <p role="status" className="flex items-center gap-2 text-sm">
                    <LoaderCircle className="size-4 animate-spin" />
                    Preparing your rounds…
                  </p>
                ) : report.isError ? (
                  <div role="alert" className="space-y-2 text-sm">
                    <p>{report.error.message}</p>
                    <Button variant="outline" onClick={() => void report.refetch()}>
                      Retry report
                    </Button>
                  </div>
                ) : (
                  report.data && (
                    <section
                      aria-label="Report preview"
                      className="overflow-hidden rounded-xl border bg-muted/20"
                    >
                      <div className="flex items-center gap-3 border-b p-4">
                        <FileText className="size-4 text-primary" aria-hidden="true" />
                        <strong className="flex-1 text-sm">Your report will include</strong>
                        <span className="text-xs text-muted-foreground">
                          {report.data.rounds.length}{' '}
                          {report.data.rounds.length === 1 ? 'round' : 'rounds'}
                        </span>
                      </div>
                      <div className="space-y-3 p-4">
                        <p className="text-xs text-muted-foreground">
                          Intro · Pre-tournament & preparation ·{' '}
                          {report.data.deck?.hasDecklist ? 'Decklist' : 'Deck choice'} · Rounds ·
                          Meta · What I learned
                        </p>
                        {report.data.deck && (
                          <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                            <DeckArtwork
                              size="compact"
                              leaderId={report.data.deck.leaderId}
                              baseId={report.data.deck.baseId}
                            />
                            <div className="min-w-0">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Your deck
                              </span>
                              <strong className="block text-sm [overflow-wrap:anywhere]">
                                {report.data.deck.name || 'Tournament deck'}
                              </strong>
                              <span className="text-xs text-muted-foreground">
                                {report.data.deck.hasDecklist
                                  ? 'Decklist included'
                                  : 'Leader and base available; decklist unavailable'}
                              </span>
                            </div>
                          </div>
                        )}
                        {report.data.rounds.length ? (
                          <ol className="divide-y">
                            {report.data.rounds.map(round => (
                              <li key={round.round} className="flex items-center gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                  <strong className="block text-sm [overflow-wrap:anywhere]">
                                    Round {round.round} ·{' '}
                                    {round.outcome === 'bye'
                                      ? 'Bye'
                                      : round.opponentName || 'Opponent unavailable'}
                                  </strong>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {reportRoundResult(round)}
                                  </span>
                                </div>
                                {round.opponentDeck && (
                                  <DeckArtwork
                                    size="compact"
                                    leaderId={round.opponentDeck.leaderId}
                                    baseId={round.opponentDeck.baseId}
                                  />
                                )}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Round details aren’t available for this event yet. You can add your
                            matchups manually.
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {report.data.hasMetaDecks
                            ? 'Tournament meta included. '
                            : 'Tournament decklists are not available for meta analysis yet. '}
                          Everything stays editable. Add your notes inside each matchup.
                        </p>
                      </div>
                    </section>
                  )
                ))}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4 sm:px-6">
          <Button variant="ghost" onClick={() => onApply()}>
            Use blank report
          </Button>
          <Button
            disabled={!ready}
            onClick={() => {
              if (ready) onApply(report.data);
            }}
          >
            Use tournament report
            <ChevronRight className="ml-2 size-4" aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
