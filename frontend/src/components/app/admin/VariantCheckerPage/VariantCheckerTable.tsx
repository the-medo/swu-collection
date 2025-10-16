import React from 'react';
import { useCheckDeletedVariants } from '@/api/admin/useCheckDeletedVariants';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useVariantCheckerTableColumns, VariantCheckerRow } from './useVariantCheckerTableColumns';
import { useSidebar } from '@/components/ui/sidebar.tsx';

export const VariantCheckerTable: React.FC = () => {
  const { data, isLoading, isError, error } = useCheckDeletedVariants();
  const navigate = useNavigate({ from: Route.fullPath });
  const { isMobile } = useSidebar();
  const view = isMobile ? 'box' : 'table';

  const handleViewCard = (cardId: string) => {
    navigate({
      search: prev => ({ ...prev, modalCardId: cardId }),
    });
  };

  const columns = useVariantCheckerTableColumns({ onCardClick: handleViewCard });

  if (isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load data{error?.message ? `: ${error.message}` : ''}
      </div>
    );
  }

  const map = data?.data ?? {};
  const rows: VariantCheckerRow[] = Object.entries(map).flatMap(([cardId, variants]) => {
    const vids = Object.keys(variants || {});
    if (vids.length === 0) return [] as VariantCheckerRow[];
    return vids.map(variantId => ({ cardId, variantId }));
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="px-2 py-2 text-sm text-muted-foreground">
        List of card variants present in DB references but missing from the current card list
      </div>
      <DataTable columns={columns} data={rows} loading={isLoading} view={view} />
    </div>
  );
};
