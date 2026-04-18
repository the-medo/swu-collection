import { Radio } from 'lucide-react';
import { LiveSectionHeader } from '../components.tsx';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';
import { getHostName } from '../liveTournamentUtils.ts';

export function StreamsSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const tournamentsById = new Map(detail.tournaments.map(entry => [entry.tournament.id, entry]));
  const preparedResources = detail.resources.filter(resource => {
    const status = tournamentsById.get(resource.tournamentId)?.weekendTournament.status;
    return status === 'running' || status === 'upcoming' || status === 'unknown';
  });
  const resources = preparedResources.length > 0 ? preparedResources : detail.resources;

  return (
    <section className="flex h-full w-full flex-col gap-3">
      <LiveSectionHeader title="Streams" count={resources.length} />
      {resources.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No approved stream links yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {resources.map(resource => {
            const tournament = tournamentsById.get(resource.tournamentId)?.tournament;
            return (
              <a
                key={resource.id}
                href={resource.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {resource.title || getHostName(resource.resourceUrl)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tournament?.name ?? 'Tournament stream'}
                  </span>
                </span>
                <Radio className="h-4 w-4 shrink-0 text-primary" />
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
