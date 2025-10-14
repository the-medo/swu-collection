import React from 'react';
import { useCheckDeletedVariants } from '@/api/admin/useCheckDeletedVariants';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const VariantCheckerTable: React.FC = () => {
  const { data, isLoading, isError, error } = useCheckDeletedVariants();

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading missing variants…</div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load data{error?.message ? `: ${error.message}` : ''}
      </div>
    );
  }

  const map = data?.data ?? {};
  const rows = Object.entries(map).flatMap(([cardId, variants]) => {
    const vids = Object.keys(variants || {});
    if (vids.length === 0) return [] as { cardId: string; variantId: string }[];
    return vids.map(variantId => ({ cardId, variantId }));
  });

  if (rows.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No missing variants found.</div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableCaption>List of card variants present in DB references but missing from the current card list</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Card ID</TableHead>
            <TableHead>Variant ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={`${r.cardId}-${r.variantId}-${idx}`}>
              <TableCell className="font-mono text-xs">{r.cardId}</TableCell>
              <TableCell className="font-mono text-xs">{r.variantId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
