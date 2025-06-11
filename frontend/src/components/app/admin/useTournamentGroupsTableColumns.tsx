import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import { TournamentGroupWithMeta } from '../../../../types/TournamentGroup';
import { Badge } from '@/components/ui/badge';

interface UseTournamentGroupsTableColumnsProps {
  onEdit: (group: TournamentGroupWithMeta) => void;
  onDelete: (group: TournamentGroupWithMeta) => void;
  onManageTournaments: (group: TournamentGroupWithMeta) => void;
  onRecompute: (group: TournamentGroupWithMeta) => void;
}

export function useTournamentGroupsTableColumns({
  onEdit,
  onDelete,
  onManageTournaments,
  onRecompute,
}: UseTournamentGroupsTableColumnsProps) {
  const columns: ColumnDef<TournamentGroupWithMeta>[] = [
    {
      accessorKey: 'group.name',
      header: 'Name',
      cell: ({ row }) => <div>{row.original.group.name}</div>,
    },
    {
      accessorKey: 'meta.name',
      header: 'Meta',
      cell: ({ row }) => (
        <div>
          {row.original.meta ? (
            <Badge variant="outline">
              {row.original.meta.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground">No Meta</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'group.position',
      header: 'Position',
      cell: ({ row }) => <div>{row.original.group.position}</div>,
    },
    {
      accessorKey: 'tournaments',
      header: 'Tournaments',
      cell: ({ row }) => <div>{row.original.tournaments.length}</div>,
    },
    {
      accessorKey: 'group.visible',
      header: 'Visible',
      cell: ({ row }) => (
        <div>
          {row.original.group.visible ? (
            <Badge variant="default" className="bg-green-500">Yes</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">No</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onManageTournaments(row.original)}
              title="Manage Tournaments"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRecompute(row.original)}
              title="Recompute Statistics"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(row.original)}
              title="Edit Group"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(row.original)}
              title="Delete Group"
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
