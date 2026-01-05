import * as React from 'react';
import { cn } from '@/lib/utils';
import DeckAvatar from '@/components/app/global/DeckAvatar/DeckAvatar.tsx';
import Flag from '@/components/app/global/Flag.tsx';
import { Users, X } from 'lucide-react';
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
  onRowClick?: (
    e: React.MouseEvent<HTMLTableRowElement | HTMLDivElement, MouseEvent>,
    tournamentId: string,
  ) => void;
}

const TournamentOverviewTable: React.FC<TournamentOverviewTableProps> = ({ rows, onRowClick }) => {
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

          const name = t.name.replace('PQ - ', '').split(', ')[0];

          const isSelected = String(selectedTournamentId ?? '') === String(t.id);

          return (
            <tr
              key={t.id}
              className={cn(
                'border-b border-gray-100 dark:border-gray-800 cursor-pointer',
                isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50',
              )}
              onMouseDown={e => handleRowClick(e, t.id)}
            >
              <td className="py-1 px-1 w-[100px]">
                <DeckAvatar deck={row.item.deck} size="50" />
              </td>
              <td className="py-1 px-1">
                <div className="flex flex-col gap-2 min-w-[130px]">
                  <span className="font-semibold">{name}</span>
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
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TournamentOverviewTable;
