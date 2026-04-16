import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { formatDate, formatDateTime, getMeleeUrl } from './utils.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../../../../../../types/TournamentWeekend.ts';

export function WeekendTournamentsTable({
  tournaments,
}: {
  tournaments: LiveTournamentWeekendTournamentEntry[];
}) {
  return (
    <section className="space-y-3 rounded-md border bg-background p-3">
      <div>
        <h3 className="text-sm font-medium">Weekend tournaments</h3>
        <p className="text-xs text-muted-foreground">
          Status, live round, match progress, and Melee links.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tournament</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Players</TableHead>
            <TableHead>Round</TableHead>
            <TableHead>Matches</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-16">Melee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-16 text-center text-muted-foreground">
                No tournaments synced yet.
              </TableCell>
            </TableRow>
          ) : (
            tournaments.map(row => {
              const meleeUrl = getMeleeUrl(row.tournament.meleeId);

              return (
                <TableRow key={row.tournament.id}>
                  <TableCell>
                    <div className="font-medium">{row.tournament.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(row.tournament.date)} - {row.tournament.location} -{' '}
                      {row.tournamentType.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.weekendTournament.status} />
                  </TableCell>
                  <TableCell>{row.tournament.attendance}</TableCell>
                  <TableCell>
                    {row.weekendTournament.roundName ??
                      (row.weekendTournament.roundNumber
                        ? `Round ${row.weekendTournament.roundNumber}`
                        : '-')}
                  </TableCell>
                  <TableCell>
                    {row.weekendTournament.matchesRemaining ?? '-'}
                    {row.weekendTournament.matchesTotal !== null &&
                      row.weekendTournament.matchesTotal !== undefined &&
                      ` / ${row.weekendTournament.matchesTotal}`}
                  </TableCell>
                  <TableCell>{formatDateTime(row.weekendTournament.exactStart)}</TableCell>
                  <TableCell>{formatDateTime(row.weekendTournament.lastUpdatedAt)}</TableCell>
                  <TableCell>
                    {meleeUrl ? (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={meleeUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}
