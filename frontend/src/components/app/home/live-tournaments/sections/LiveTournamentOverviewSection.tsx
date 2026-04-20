import { cn } from '@/lib/utils.ts';
import { TournamentCard } from '../components.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';

type StatusTileTone = 'running' | 'finished' | 'upcoming';

const statusTileToneClass: Record<StatusTileTone, string> = {
  running: 'from-emerald-600/45 via-emerald-500/35 to-emerald-400/15',
  finished: 'from-amber-600/45 via-amber-500/35 to-amber-400/15',
  upcoming: 'from-sky-600/15 via-sky-500/15 to-sky-400/15',
};

function StatusCountTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: StatusTileTone;
}) {
  return (
    <div className="relative isolate flex min-h-16 items-center gap-3 overflow-hidden rounded-md border px-4 py-3 text-left text-white shadow-xs">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center opacity-45 grayscale"
        style={{ backgroundImage: 'url(https://images.swubase.com/button-bg.webp)' }}
      />
      <div className={cn('absolute inset-0 -z-10 bg-gradient-to-r', statusTileToneClass[tone])} />
      <div className="absolute inset-0 -z-10 bg-black/20" />
      <span className="text-4xl font-bold leading-none tracking-normal">{value}</span>
      <span className="text-sm font-semibold uppercase tracking-normal">{label}</span>
    </div>
  );
}

export function LiveTournamentStatusTilesSection({
  runningCount,
  finishedCount,
  upcomingCount,
}: {
  runningCount: number;
  finishedCount: number;
  upcomingCount: number;
}) {
  return (
    <section className="grid h-full w-full gap-3 sm:grid-cols-3">
      <StatusCountTile label="In Progress" value={runningCount} tone="running" />
      <StatusCountTile label="Finished" value={finishedCount} tone="finished" />
      <StatusCountTile label="Upcoming" value={upcomingCount} tone="upcoming" />
    </section>
  );
}

function TournamentColumn({
  title,
  tournaments,
  weekendId,
  promptForStream = false,
}: {
  title: string;
  tournaments: LiveTournamentWeekendTournamentEntry[];
  weekendId: string;
  promptForStream?: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b pb-1">
        <h4 className="text-base font-semibold">{title}</h4>
        <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
          {tournaments.length}
        </span>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nothing here right now.
        </div>
      ) : (
        <div className="grid gap-3">
          {tournaments.map(entry => (
            <TournamentCard
              key={entry.tournament.id}
              entry={entry}
              weekendId={weekendId}
              promptForStream={promptForStream}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function LiveTournamentOverviewSection({
  running,
  finished,
  upcoming,
  weekendId,
}: {
  running: LiveTournamentWeekendTournamentEntry[];
  finished: LiveTournamentWeekendTournamentEntry[];
  upcoming: LiveTournamentWeekendTournamentEntry[];
  weekendId: string;
}) {
  return (
    <section className="grid h-full min-h-[40rem] w-full gap-4 lg:grid-cols-2">
      <TournamentColumn
        title="Running"
        tournaments={running}
        weekendId={weekendId}
        promptForStream
      />

      <div className="grid content-start gap-4">
        <TournamentColumn title="Recently Finished" tournaments={finished} weekendId={weekendId} />
        <TournamentColumn
          title="Upcoming"
          tournaments={upcoming}
          weekendId={weekendId}
          promptForStream
        />
      </div>
    </section>
  );
}
