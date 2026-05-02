import { Loader2 } from 'lucide-react';
import { useGetTournamentWeekends } from '@/api/tournament-weekends';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { TournamentWeekendRow } from './TournamentWeekendsPage/TournamentWeekendRow.tsx';
import { TournamentWeekendsCreateForm } from './TournamentWeekendsPage/TournamentWeekendsCreateForm.tsx';

export function TournamentWeekendsPage() {
  const { data, isLoading, isError, error } = useGetTournamentWeekends();
  const weekends = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Tournament Weekends</h2>
        <p className="text-sm text-muted-foreground">
          Prepare live weekends, attach tournament groups, sync tournaments, run live checks, and
          approve stream links.
        </p>
      </div>

      <TournamentWeekendsCreateForm />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Weekend</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status counters</TableHead>
              <TableHead className="w-36">Live</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading tournament weekends...
                  </span>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-destructive">
                  {error?.message ?? 'Failed to load tournament weekends.'}
                </TableCell>
              </TableRow>
            ) : weekends.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No tournament weekends created yet.
                </TableCell>
              </TableRow>
            ) : (
              weekends.map(weekend => <TournamentWeekendRow key={weekend.id} weekend={weekend} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
