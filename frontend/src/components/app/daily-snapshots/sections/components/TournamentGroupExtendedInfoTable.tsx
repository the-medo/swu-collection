import * as React from 'react';
import type { TournamentGroupExtendedInfo } from '../../../../../../../types/DailySnapshots.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';

export interface TournamentGroupExtendedInfoTableProps {
  items: TournamentGroupExtendedInfo[];
  className?: string;
}

const TournamentGroupExtendedInfoTable: React.FC<TournamentGroupExtendedInfoTableProps> = ({ items, className }) => {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">Name</TableHead>
            <TableHead className="w-1/4 text-right">Tournaments with data</TableHead>
            <TableHead className="w-1/4 text-right">Decks analyzed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            safeItems.map((item, idx) => {
              const tg = item.tournamentGroup;
              const stats = item.tournamentGroupStats;

              const name: string = tg?.name ?? 'Unknown';
              const twd: number | undefined = stats?.tournamentsWithData;
              const totalTournaments: number | undefined = stats?.totalTournaments;
              const totalDecks: number | undefined = stats?.totalDecks;

              const key = `${name}-${idx}`;

              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-right">
                    {typeof twd === 'number' && typeof totalTournaments === 'number'
                      ? `${twd}/${totalTournaments}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {typeof totalDecks === 'number' ? totalDecks : '—'}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TournamentGroupExtendedInfoTable;
