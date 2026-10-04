import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { formatDate } from '@/lib/locale.ts';
import { cn } from '@/lib/utils.ts';
import type { UserMeleeTournament } from '../../../../../../shared/types/UserMeleeTournaments.ts';

export function UserTournamentTable({ tournaments }: { tournaments: UserMeleeTournament[] }) {
  const { itemsToShow, observerTarget, hasMore } = useInfiniteScroll({
    totalItems: tournaments.length,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 200,
  });
  return (
    <>
      <div
        className="overflow-x-auto rounded-lg border"
        role="region"
        aria-label="Tournament results"
        tabIndex={0}
      >
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              {['Tournament', 'Deck', 'Type', 'Date', 'Format', 'Attendance', 'Placement'].map(
                label => (
                  <TableHead key={label} scope="col">
                    {label}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournaments.slice(0, itemsToShow).map(row => (
              <TableRow key={row.meleeId}>
                <TableCell className="max-w-80 py-3">
                  <Link
                    to="/tournaments/$tournamentId"
                    params={{ tournamentId: row.tournamentId! }}
                    className="font-medium text-amber-800 hover:underline underline-offset-2 dark:text-primary"
                  >
                    {row.name}
                  </Link>
                  {!row.completed && <p className="text-xs text-muted-foreground">Not finalized</p>}
                </TableCell>
                <TableCell className="max-w-96">
                  {row.deck ? (
                    <Link
                      to="/decks/$deckId"
                      params={{ deckId: row.deck.id }}
                      className="text-amber-800 hover:underline underline-offset-2 dark:text-primary"
                    >
                      {row.deck.name || 'View deck'}
                    </Link>
                  ) : row.meleeDecklistId ? (
                    <a
                      href={`https://melee.gg/Decklist/View/${row.meleeDecklistId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-800 hover:underline underline-offset-2 dark:text-primary"
                    >
                      {row.meleeDecklistName || 'Melee deck'}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{row.typeName ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(`${row.date}T12:00:00`)}
                </TableCell>
                <TableCell>{row.format ?? '—'}</TableCell>
                <TableCell className="tabular-nums">{row.attendance}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={cn(
                        'tabular-nums',
                        (row.topEight || row.dayTwo) &&
                          'font-bold text-amber-800 dark:text-primary',
                      )}
                    >
                      {row.placement ? `#${row.placement}` : '—'}
                    </span>
                    {row.dayTwo && <Badge variant="secondary">Day 2</Badge>}
                    {row.topEight && <Badge variant="secondary">Top 8</Badge>}
                  </div>
                  {row.record && <p className="text-xs text-muted-foreground">{row.record}</p>}
                </TableCell>
              </TableRow>
            ))}
            {tournaments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  No tournaments match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div ref={observerTarget} className="min-h-8 text-sm text-muted-foreground" role="status">
        Showing {Math.min(itemsToShow, tournaments.length)} of {tournaments.length} tournaments
        {hasMore ? ' · Scroll for more' : ''}
      </div>
    </>
  );
}
