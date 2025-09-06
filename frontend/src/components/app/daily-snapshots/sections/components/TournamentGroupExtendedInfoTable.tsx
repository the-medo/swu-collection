import * as React from 'react';
import type { TournamentGroupExtendedInfo } from '../../../../../../../types/DailySnapshots.ts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { Link } from '@tanstack/react-router';
import { Link as LinkIcon, TriangleAlert } from 'lucide-react';
import { INCOMPLETE_DATA_PERCENTAGE } from '@/components/app/daily-snapshots/sections/components/SectionInfoTooltip.tsx';

export interface TournamentGroupExtendedInfoTableProps {
  items: TournamentGroupExtendedInfo[];
  className?: string;
  sectionDataWarning?: boolean;
}

const TournamentGroupExtendedInfoTable: React.FC<TournamentGroupExtendedInfoTableProps> = ({
  items,
  className,
  sectionDataWarning,
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className={className}>
      <Table className="border">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-1/2"></TableHead>
            <TableHead className="w-1/4 text-right">Tournaments</TableHead>
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
              const incompleteDataWarning =
                sectionDataWarning &&
                typeof twd === 'number' &&
                typeof totalTournaments === 'number' &&
                totalTournaments !== 0 &&
                twd / totalTournaments < INCOMPLETE_DATA_PERCENTAGE;

              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">
                    <Link
                      to="/meta"
                      search={prev => ({
                        ...prev,
                        maTournamentGroupId: tg.id,
                      })}
                      className="flex items-center gap-1"
                    >
                      <LinkIcon className="size-2" />
                      {name}
                    </Link>
                  </TableCell>
                  <TableCell
                    className={[
                      'flex flex-row gap-2 justify-end items-center',
                      incompleteDataWarning
                        ? 'text-yellow-600 dark:text-yellow-300 font-semibold'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {incompleteDataWarning ? (
                      <TriangleAlert className="size-4 text-yellow-600 dark:text-yellow-300" />
                    ) : null}
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
