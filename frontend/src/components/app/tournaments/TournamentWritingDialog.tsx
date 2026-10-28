import { useId, useState } from 'react';
import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Check,
  ExternalLink,
  FileText,
  LayoutTemplate,
  Link2,
  LoaderCircle,
  PenLine,
  Trophy,
} from 'lucide-react';
import { useMeleeConnection } from '@/api/integration/melee/useMeleeConnection.ts';
import { useTournamentReport } from '@/api/user/useTournamentReport.ts';
import { useRefreshUserTournaments } from '@/api/user/useRefreshUserTournaments.ts';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { cn } from '@/lib/utils.ts';
import type { TournamentStringDate } from '../../../../../types/Tournament.ts';
import type { CreationDocument } from '../../../../../shared/creators/contracts.ts';
import { createTournamentReportDraft } from './lib/createTournamentReportDraft.ts';

export function TournamentWritingDialog({
  tournament,
  draftSaved,
  onOpenDraft,
  onClose,
  onReturnFocus,
}: {
  tournament: TournamentStringDate;
  draftSaved: boolean;
  onOpenDraft: (document: CreationDocument) => Promise<void>;
  onClose: () => void;
  onReturnFocus: () => void;
}) {
  const viewer = useUser();
  const id = useId();
  const [kind, setKind] = useState<'report' | 'article'>('report');
  const [useTemplate, setUseTemplate] = useState(true);
  const [skipResults, setSkipResults] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();
  const connectionQuery = useMeleeConnection();
  const refresh = useRefreshUserTournaments(viewer?.id ?? '');
  const connection = connectionQuery.data?.connection;
  const upcoming = tournament.date.slice(0, 10) > format(new Date(), 'yyyy-MM-dd');
  const wantsTemplate = kind === 'report' && useTemplate;
  const wantsResults = wantsTemplate && !skipResults && !draftSaved && !upcoming;
  const report = useTournamentReport(
    wantsResults && connection && !connectionQuery.isError && !connectionQuery.isFetching
      ? tournament.id
      : undefined,
    connection?.meleeUserId,
  );
  const checkingConnection = !!viewer && (connectionQuery.isPending || connectionQuery.isFetching);
  const noResults = report.isError && report.error.status === 404;
  const waitingForResults =
    wantsResults &&
    !!viewer &&
    (refresh.isPending ||
      checkingConnection ||
      connectionQuery.isError ||
      (!!connection && (report.isPending || report.isFetching || (report.isError && !noResults))));
  const locked = opening || draftSaved;

  async function startWriting() {
    if (!viewer || opening || (!draftSaved && waitingForResults)) return;
    setOpening(true);
    setError(undefined);
    try {
      await onOpenDraft(
        createTournamentReportDraft(
          tournament,
          kind === 'article'
            ? { kind: 'article' }
            : {
                kind: 'report',
                useTemplate,
                report: wantsResults && connection && !report.isError ? report.data : undefined,
              },
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open your draft. Try again.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !opening) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl p-0"
        onCloseAutoFocus={event => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <DialogHeader className="border-b bg-primary/5 px-5 pb-5 pt-6 sm:px-6">
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <PenLine className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle>Share your tournament story</DialogTitle>
          <DialogDescription className="break-words">{tournament.name}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="space-y-3">
            <p id={`${id}-kind`} className="text-sm font-semibold">
              What would you like to write?
            </p>
            <RadioGroup
              aria-labelledby={`${id}-kind`}
              value={kind}
              disabled={locked}
              onValueChange={value => {
                setKind(value as typeof kind);
                setError(undefined);
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              {(
                [
                  {
                    value: 'report',
                    title: 'Tournament report',
                    detail: 'Your deck, your matches, your experience.',
                    icon: Trophy,
                  },
                  {
                    value: 'article',
                    title: 'Article',
                    detail: 'Analysis, event coverage, or a story of your own.',
                    icon: FileText,
                  },
                ] as const
              ).map(option => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    kind === option.value ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/40',
                    locked && 'cursor-default',
                  )}
                >
                  <RadioGroupItem
                    id={`${id}-${option.value}`}
                    value={option.value}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0 space-y-2">
                    <option.icon className="size-5 text-primary" aria-hidden="true" />
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {option.detail}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
          {kind === 'report' ? (
            <div className="space-y-3">
              <p id={`${id}-template-heading`} className="text-sm font-semibold">
                Start with a template?
              </p>
              <RadioGroup
                aria-labelledby={`${id}-template-heading`}
                value={useTemplate ? 'template' : 'blank'}
                disabled={locked}
                onValueChange={value => {
                  setUseTemplate(value === 'template');
                  setError(undefined);
                }}
              >
                {[
                  {
                    value: 'template',
                    title: 'Use the report template',
                    detail: 'Preparation, deck choice, rounds, and what you learned.',
                    icon: LayoutTemplate,
                  },
                  {
                    value: 'blank',
                    title: 'Start with a blank page',
                    detail: 'Tell the story in your own format.',
                    icon: FileText,
                  },
                ].map(option => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary/30 has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem
                      id={`${id}-${option.value}`}
                      value={option.value}
                      className="shrink-0"
                    />
                    <option.icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{option.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          ) : (
            <p className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed! text-muted-foreground">
              Your article starts with a blank page and stays linked to this tournament.
            </p>
          )}
          {!draftSaved && wantsTemplate && (
            <section
              aria-label="Melee report setup"
              className="space-y-3 rounded-xl border bg-muted/20 p-4 text-sm"
            >
              {!viewer ? (
                <p className="leading-relaxed! text-muted-foreground">
                  Sign in to save a draft. Connect Melee to fill the template with your available
                  deck, opponents, and results.
                </p>
              ) : checkingConnection ? (
                <p role="status" className="flex items-center gap-2 text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" /> Checking your Melee connection…
                </p>
              ) : connectionQuery.isError ? (
                <div role="alert" className="space-y-2">
                  <p>Could not check your Melee connection.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void connectionQuery.refetch()}
                  >
                    Retry connection
                  </Button>
                </div>
              ) : !connection ? (
                <>
                  <p className="flex items-center gap-2 font-semibold">
                    <Link2 className="size-4 text-primary" aria-hidden="true" /> Make the template
                    yours
                  </p>
                  <p className="text-xs leading-relaxed! text-muted-foreground">
                    Connect Melee to add your available deck, rounds, and results automatically. You
                    can also continue with the template and fill it in yourself.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" className="text-foreground" asChild>
                      <Link
                        to="/settings"
                        search={{ page: 'integrations' }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Connect Melee <ExternalLink className="size-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSkipResults(false);
                        void connectionQuery.refetch();
                      }}
                    >
                      Check connection
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Settings opens in a new tab. Return here when you’re connected.
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-start gap-2 font-semibold">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="break-all">Connected as @{connection.username}</span>
                  </p>
                  {upcoming ? (
                    <p className="text-xs leading-relaxed! text-muted-foreground">
                      Start with event details and preparation prompts. Add your results after the
                      tournament.
                    </p>
                  ) : !skipResults && noResults ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed! text-muted-foreground">
                        No results for this event were found in your Melee history. Refresh to check
                        for recent events, or create the template with event details and writing
                        prompts for you to fill in.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={refresh.isPending || opening}
                        onClick={() => refresh.mutate()}
                      >
                        {refresh.isPending ? 'Refreshing tournaments…' : 'Refresh from Melee'}
                      </Button>
                    </div>
                  ) : !skipResults && (report.isPending || report.isFetching) ? (
                    <p
                      role="status"
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <LoaderCircle className="size-3.5 animate-spin" /> Finding your results for
                      this event…
                    </p>
                  ) : !skipResults && report.isError ? (
                    <div role="alert" className="space-y-2">
                      <p className="text-xs leading-relaxed!">{report.error.message}</p>
                      <Button size="sm" variant="outline" onClick={() => void report.refetch()}>
                        Retry results
                      </Button>
                    </div>
                  ) : !skipResults && report.data ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed! text-muted-foreground">
                        Your template will include the available details below. Everything stays
                        editable.
                      </p>
                      <div className="flex flex-wrap gap-2" aria-label="Details to include">
                        {[
                          report.data.tournament.completed && report.data.tournament.placement
                            ? `Finished #${report.data.tournament.placement}`
                            : null,
                          report.data.tournament.record
                            ? `Record ${report.data.tournament.record}`
                            : null,
                          report.data.deck?.hasDecklist ? 'Your decklist' : null,
                          `${report.data.rounds.length} ${report.data.rounds.length === 1 ? 'round' : 'rounds'}`,
                        ]
                          .filter(Boolean)
                          .map(fact => (
                            <span
                              key={fact}
                              className="rounded-md border bg-background px-2 py-1 text-xs"
                            >
                              {fact}
                            </span>
                          ))}
                      </div>
                      {!report.data.rounds.length && (
                        <p className="text-xs text-muted-foreground">
                          No round details are available yet. Add your matches as you write.
                        </p>
                      )}
                      {report.data.roundsWarning && (
                        <p role="alert" className="text-xs leading-relaxed!">
                          {report.data.roundsWarning}
                        </p>
                      )}
                    </div>
                  ) : null}
                </>
              )}
              {skipResults ? (
                <p className="text-xs leading-relaxed! text-muted-foreground">
                  The template will include event details and writing prompts. Add your results
                  yourself.
                </p>
              ) : !!viewer &&
                (connectionQuery.isError || (!!connection && report.isError && !noResults)) ? (
                <Button size="sm" variant="ghost" onClick={() => setSkipResults(true)}>
                  Use template without my results
                </Button>
              ) : null}
            </section>
          )}
          {wantsTemplate && refresh.isError && (
            <p role="alert" className="text-xs leading-relaxed! text-destructive">
              {refresh.error.message}
            </p>
          )}
          {draftSaved && (
            <p role="status" className="text-sm text-muted-foreground">
              Your draft is saved. Open it to continue writing.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm leading-relaxed! text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            A private draft. Publish when you’re ready.
          </p>
          {viewer ? (
            <Button
              disabled={opening || (!draftSaved && waitingForResults)}
              onClick={() => void startWriting()}
            >
              {opening ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="size-4" aria-hidden="true" />
              )}
              {opening ? 'Opening your draft…' : draftSaved ? 'Open saved draft' : 'Create draft'}
            </Button>
          ) : (
            <SignIn
              trigger={
                <Button>
                  Sign in to write <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
