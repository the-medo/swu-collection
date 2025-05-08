import { useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { MoreHorizontal, Trophy } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { DataTableViewMode, ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import {
  TournamentStringDate,
  TournamentData,
  tournamentTypesInfo,
} from '../../../../../../types/Tournament.ts';
import { formatDataById } from '../../../../../../types/Format.ts';

export interface TournamentTableColumnsProps {
  view?: DataTableViewMode;
  onEdit?: (tournament: TournamentStringDate) => void;
  onDelete?: (tournament: TournamentStringDate) => void;
}

export function useTournamentTableColumns({
  // view = 'table',
  onEdit,
  onDelete,
}: TournamentTableColumnsProps): ExtendedColumnDef<TournamentData>[] {
  const hasPermission = usePermissions();

  const canUpdate = hasPermission('tournament', 'update');
  const canDelete = hasPermission('tournament', 'delete');

  return useMemo(() => {
    const definitions: ExtendedColumnDef<TournamentData>[] = [];

    // Name column
    definitions.push({
      id: 'name',
      accessorKey: 'tournament.name',
      header: 'Name',
      displayBoxHeader: false,
      cell: ({ getValue, row }) => {
        const name = getValue() as string;
        const tournamentId = row.original.tournament.id as string;

        return (
          <Link to={'/tournaments/' + tournamentId} className="font-bold">
            <Button
              variant="link"
              className="flex flex-col gap-0 p-0 w-full items-start justify-center"
            >
              {name}
            </Button>
          </Link>
        );
      },
    });

    // Date column
    definitions.push({
      id: 'date',
      accessorKey: 'tournament.date',
      header: 'Date',
      displayBoxHeader: false,
      cell: ({ getValue }) => {
        const date = getValue() as string;

        return (
          <Button
            variant="link"
            className="flex flex-col gap-0 p-0 w-full items-start justify-center"
          >
            {dateRenderer(date)}
          </Button>
        );
      },
    });

    // Type column
    definitions.push({
      id: 'type',
      accessorKey: 'tournament.type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as keyof typeof tournamentTypesInfo;
        const typeInfo = tournamentTypesInfo[type];

        return (
          <div className="flex items-center gap-2">
            {typeInfo?.major === 1 && <Trophy className="h-4 w-4 text-amber-500" />}
            <span>{typeInfo?.name || type}</span>
          </div>
        );
      },
    });

    // Format column
    definitions.push({
      id: 'format',
      accessorKey: 'tournament.format',
      header: 'Format',
      cell: ({ getValue }) => {
        const format = getValue() as number;
        return <div>{formatDataById[format]?.name || 'Unknown'}</div>;
      },
    });

    // Location column
    definitions.push({
      id: 'location',
      accessorKey: 'tournament.location',
      header: 'Location',
      cell: ({ getValue, row }) => {
        const location = getValue() as string;
        const continent = row.original.tournament.continent;
        return (
          <div className="flex flex-col">
            <span>{location}</span>
            <span className="text-xs text-muted-foreground">{continent}</span>
          </div>
        );
      },
    });

    // Players column
    definitions.push({
      id: 'attendance',
      accessorKey: 'tournament.attendance',
      header: 'Players',
      cell: ({ getValue }) => {
        const attendance = getValue() as number;
        return <div className="text-center">{attendance}</div>;
      },
    });

    // Actions column
    definitions.push({
      id: 'actions',
      cell: ({ row }) => {
        const tournament = row.original.tournament;

        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconMedium" className="p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(
                    window.location.origin + '/tournaments/' + tournament.id,
                  )
                }
              >
                Copy link
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {canUpdate && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(tournament)}>
                  Edit tournament
                </DropdownMenuItem>
              )}

              {canDelete && onDelete && (
                <DropdownMenuItem onClick={() => onDelete(tournament)}>
                  Delete tournament
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return definitions;
  }, [canUpdate, canDelete, onEdit, onDelete]);
}
