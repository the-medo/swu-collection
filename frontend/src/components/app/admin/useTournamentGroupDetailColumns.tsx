import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { TournamentGroupTournament } from '../../../../types/TournamentGroup';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface UseTournamentGroupDetailColumnsProps {
  onUpdatePosition: (tournament: TournamentGroupTournament, newPosition: number) => void;
  onRemove: (tournament: TournamentGroupTournament) => void;
}

export function useTournamentGroupDetailColumns({
  onUpdatePosition,
  onRemove,
}: UseTournamentGroupDetailColumnsProps) {
  const columns: ColumnDef<TournamentGroupTournament>[] = [
    {
      accessorKey: 'position',
      header: 'Position',
      cell: ({ row }) => {
        const [editing, setEditing] = useState(false);
        const [position, setPosition] = useState(row.original.position);

        const handleBlur = () => {
          if (position !== row.original.position) {
            onUpdatePosition(row.original, position);
          }
          setEditing(false);
        };

        return editing ? (
          <Input
            type="number"
            value={position}
            onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleBlur();
              }
            }}
            className="w-20"
            autoFocus
          />
        ) : (
          <div
            className="cursor-pointer hover:underline"
            onClick={() => setEditing(true)}
          >
            {row.original.position}
          </div>
        );
      },
    },
    {
      accessorKey: 'tournament.name',
      header: 'Tournament Name',
      cell: ({ row }) => <div>{row.original.tournament.name}</div>,
    },
    {
      accessorKey: 'tournament.date',
      header: 'Date',
      cell: ({ row }) => (
        <div>
          {new Date(row.original.tournament.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: 'tournament.location',
      header: 'Location',
      cell: ({ row }) => <div>{row.original.tournament.location}</div>,
    },
    {
      accessorKey: 'tournament.attendance',
      header: 'Attendance',
      cell: ({ row }) => <div>{row.original.tournament.attendance}</div>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(row.original)}
              title="Remove Tournament"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return columns;
}