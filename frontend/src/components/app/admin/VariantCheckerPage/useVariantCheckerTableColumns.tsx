import React from 'react';
import type { ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import { VariantReplacer } from './VariantReplacer';

export interface VariantCheckerRow {
  cardId: string;
  variantId: string;
}

interface UseVariantCheckerTableColumnsArgs {
  onCardClick: (cardId: string) => void;
}

export const useVariantCheckerTableColumns = (
  { onCardClick }: UseVariantCheckerTableColumnsArgs,
): ExtendedColumnDef<VariantCheckerRow, any>[] => {
  const columns = React.useMemo<ExtendedColumnDef<VariantCheckerRow, any>[]>(
    () => [
      {
        header: 'Card ID',
        accessorKey: 'cardId',
        cell: ({ row }) => {
          const cid = row.original.cardId;
          return (
            <button
              type="button"
              className="underline text-primary hover:opacity-80 font-mono text-xs"
              onClick={() => onCardClick(cid)}
            >
              {cid}
            </button>
          );
        },
      },
      {
        header: 'Variant ID',
        accessorKey: 'variantId',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.variantId}</span>
        ),
      },
      {
        id: 'replace',
        header: 'Replace',
        cell: ({ row }) => (
          <VariantReplacer cardId={row.original.cardId} oldVariantId={row.original.variantId} />
        ),
      },
    ],
    [onCardClick],
  );

  return columns;
};
