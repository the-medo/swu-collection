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
import { MoreHorizontal, ChartColumn } from 'lucide-react';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import { MetaData } from '@/api/meta/useGetMetas.ts';
import { formatDataById } from '../../../../../types/Format.ts';
import { SwuSet } from '../../../../../types/enums.ts';
import { useComputeCardStats } from '@/api/card-stats/useComputeCardStats.ts';
import { toast } from '@/hooks/use-toast.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';

interface MetaTableColumnsProps {
  onEdit?: (meta: MetaData['meta']) => void;
  onDelete?: (meta: MetaData['meta']) => void;
}

export function useMetaTableColumns({
  onEdit,
  onDelete,
}: MetaTableColumnsProps = {}): ExtendedColumnDef<MetaData>[] {
  const computeCardStats = useComputeCardStats();
  const hasPermission = usePermissions();
  const canComputeStats = hasPermission('statistics', 'compute');

  const handleComputeStats = async (metaId: number) => {
    try {
      await computeCardStats.mutateAsync({ metaId });
      toast({
        title: 'Statistics computed',
        description: 'Meta card statistics have been recomputed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to compute meta card statistics.',
        variant: 'destructive',
      });
    }
  };

  return useMemo(() => {
    const definitions: ExtendedColumnDef<MetaData>[] = [];

    // ID column
    definitions.push({
      id: 'id',
      accessorKey: 'meta.id',
      header: 'ID',
      cell: ({ getValue }) => {
        const id = getValue() as number;
        return <div className="text-muted-foreground">{id}</div>;
      },
    });

    // Name column
    definitions.push({
      id: 'name',
      accessorKey: 'meta.name',
      header: 'Name',
      cell: ({ getValue }) => {
        const name = getValue() as string;
        return <div className="font-medium">{name}</div>;
      },
    });

    // Set column
    definitions.push({
      id: 'set',
      accessorKey: 'meta.set',
      header: 'Set',
      cell: ({ getValue }) => {
        const set = getValue() as keyof typeof SwuSet;
        // Convert set code to display name (e.g., 'sor' to 'SOR')
        return <div>{set.toUpperCase()}</div>;
      },
    });

    // Format column
    definitions.push({
      id: 'format',
      accessorKey: 'meta.format',
      header: 'Format',
      cell: ({ getValue, row }) => {
        const formatId = getValue() as number;
        const formatName = row.original.format?.name || formatDataById[formatId]?.name || 'Unknown';
        return <div>{formatName}</div>;
      },
    });

    // Date column
    definitions.push({
      id: 'date',
      accessorKey: 'meta.date',
      header: 'Date',
      cell: ({ getValue }) => {
        const date = getValue() as string;
        return <div>{dateRenderer(date)}</div>;
      },
    });

    // Season column
    definitions.push({
      id: 'season',
      accessorKey: 'meta.season',
      header: 'Season',
      cell: ({ getValue }) => {
        const season = getValue() as number;
        return <div>{season}</div>;
      },
    });

    // Actions column
    definitions.push({
      id: 'actions',
      cell: ({ row }) => {
        const meta = row.original.meta;

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

              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(meta)}>Edit meta</DropdownMenuItem>
              )}

              {canComputeStats && (
                <DropdownMenuItem
                  onClick={() => handleComputeStats(meta.id)}
                  disabled={computeCardStats.isPending}
                >
                  <ChartColumn className="h-4 w-4 mr-2" />
                  {computeCardStats.isPending ? 'Computing...' : 'Recompute card statistics'}
                </DropdownMenuItem>
              )}

              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(meta)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete meta
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return definitions;
  }, [onEdit, onDelete, canComputeStats, handleComputeStats, computeCardStats.isPending]);
}
