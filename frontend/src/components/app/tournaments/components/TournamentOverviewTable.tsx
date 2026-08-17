import * as React from 'react';
import { cn } from '@/lib/utils';
import DeckAvatar from '@/components/app/global/DeckAvatar/DeckAvatar.tsx';
import Flag from '@/components/app/global/Flag.tsx';
import { Trophy, Users, X } from 'lucide-react';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import { TournamentStringDate } from '../../../../../../types/Tournament.ts';
import { TournamentDeck } from '../../../../../../server/db/schema/tournament_deck.ts';
import { Deck } from '../../../../../../server/db/schema/deck.ts';
import { useSearch } from '@tanstack/react-router';
import { useTournamentOverviewTableRowClick } from '@/components/app/tournaments/lib/useTournamentOverviewTableRowClick.ts';

export type TournamentOverviewTableItem = {
  tournament: TournamentStringDate;
  winningTournamentDeck: TournamentDeck | null;
  deck: Deck | null;
};

export type TournamentOverviewTableRow =
  | { type: 'divider'; label: string }
  | { type: 'item'; item: TournamentOverviewTableItem };

export interface TournamentOverviewTableProps {
  rows: TournamentOverviewTableRow[];
  formatBadgeRenderer?: (formatId: number) => React.ReactNode;
  showChampionName?: boolean;
  nameInFullWidthRow?: boolean;
  nameFormatter?: (tournament: TournamentStringDate) => string;
  onRowClick?: (
    e: React.MouseEvent<HTMLTableRowElement | HTMLDivElement, MouseEvent>,
    tournamentId: string,
  ) => void;
}

const TournamentOverviewTable: React.FC<TournamentOverviewTableProps> = ({
  rows,
  formatBadgeRenderer,
  showChampionName = false,
  nameInFullWidthRow = false,
  nameFormatter,
  onRowClick,
}) => {
  const handleRowClick = useTournamentOverviewTableRowClick(onRowClick);
  const { maTournamentId: selectedTournamentId } = useSearch({ strict: false });

  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row, idx) => {
          if (row.type === 'divider') {
            return (
              <tr key={`div-${idx}`} className="bg-muted/40">
                <td className="py-1 px-2 font-medium" colSpan={3}>
                  {row.label}
                </td>
              </tr>
            );
          }

          const t = row.item.tournament;
          const countryCode = t.location as CountryCode;
          const notImported = !t.imported;

          const name = nameFormatter?.(t) ?? t.name.replace('PQ - ', '').split(', ')[0];
          const championName = row.item.winningTournamentDeck?.meleePlayerUsername?.trim();

          const isSelected = String(selectedTournamentId ?? '') === String(t.id);
          const rowClassName = cn(
            'cursor-pointer',
            isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50',
          );
          const handleMouseDown = (event: React.MouseEvent<HTMLTableRowElement, MouseEvent>) =>
            handleRowClick(event, t.id);
          const nameContent = (
            <div className="flex items-center gap-2">
              <span className="font-semibold">{name}</span>
              {formatBadgeRenderer?.(t.format)}
            </div>
          );
          const championContent = showChampionName ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="h-4 w-4 text-amber-500" aria-label="Champion" />
              <span>{championName || 'Unknown'}</span>
            </div>
          ) : null;
          const tournamentDetails = (
            <>
              <td className="py-1 px-1 w-[100px]">
                {row.item.tournament.imported ? (
                  <DeckAvatar deck={row.item.deck} size="50" />
                ) : (
                  <span className="italic px-4">No data</span>
                )}
              </td>
              <td className="py-1 px-1">
                <div className="flex flex-col gap-2 min-w-[130px]">
                  {!nameInFullWidthRow ? nameContent : null}
                  {championContent}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag countryCode={countryCode} className="w-5 h-3" />
                      {countryCode && <span>{countryCode}</span>}
                      {notImported ? <X className="h-4 w-4 text-red-500 inline-block" /> : null}
                    </div>
                    {t.attendance > 0 ? (
                      <div className="items-center justify-end gap-1 flex">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{t.attendance}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </td>
            </>
          );

          if (nameInFullWidthRow) {
            return (
              <React.Fragment key={t.id}>
                <tr className={rowClassName} onMouseDown={handleMouseDown}>
                  <td className="pt-1 px-1" colSpan={2}>
                    {nameContent}
                  </td>
                </tr>
                <tr
                  className={cn('border-b border-gray-100 dark:border-gray-800', rowClassName)}
                  onMouseDown={handleMouseDown}
                >
                  {tournamentDetails}
                </tr>
              </React.Fragment>
            );
          }

          return (
            <tr
              key={t.id}
              className={cn('border-b border-gray-100 dark:border-gray-800', rowClassName)}
              onMouseDown={handleMouseDown}
            >
              {tournamentDetails}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TournamentOverviewTable;
