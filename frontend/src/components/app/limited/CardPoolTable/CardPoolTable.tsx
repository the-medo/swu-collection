import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import React from 'react';
import { DataTable, DataTableViewMode } from '@/components/ui/data-table.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { useCardPoolTableColumns } from './useCardPoolTableColumns.tsx';
import type { CardPool } from '../../../../../../server/db/schema/card_pool.ts';

interface CardPoolTableProps {
  pools: CardPool[];
  loading?: boolean;
}

export const CardPoolTable: React.FC<CardPoolTableProps> = ({ pools, loading = false }) => {
  const { isMobile } = useSidebar();
  const view: DataTableViewMode = isMobile ? 'box' : 'table';

  const columns = useCardPoolTableColumns({ view, isCompactBoxView: false });

  return (
    <div className={cn('min-w-0', limitedStyles.poolTable)}>
      <DataTable
        columns={columns}
        data={pools}
        loading={loading}
        view={view}
        tableBorder={false}
        cellClassName="px-3 py-1"
        headerCellClassName="h-8 px-3 text-xs"
      />
    </div>
  );
};

export default CardPoolTable;
