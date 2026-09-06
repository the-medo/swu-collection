import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import type { UnmatchedCardPriceVariant } from './findUnmatchedCardPriceVariants.ts';

const PAGE_SIZE = 100;

type Props = {
  rows: UnmatchedCardPriceVariant[];
};

const UnmatchedCardPriceTable: React.FC<Props> = ({ rows }) => {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-lg font-medium">Unmatched variants ({rows.length})</h3>
      <div className="max-h-[600px] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Card</TableHead>
              <TableHead>Card ID</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Variant ID</TableHead>
              <TableHead>Set</TableHead>
              <TableHead>Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map(({ card, cardId, variant }) => (
              <TableRow key={`${cardId}|${variant.variantId}`}>
                <TableCell>{card.name}</TableCell>
                <TableCell className="font-mono text-xs">{cardId}</TableCell>
                <TableCell>{variant.variantName}</TableCell>
                <TableCell className="font-mono text-xs">{variant.variantId}</TableCell>
                <TableCell>{variant.set.toUpperCase()}</TableCell>
                <TableCell>{variant.cardNo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {pageCount} · showing up to {PAGE_SIZE} variants per page
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(value => value - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(value => value + 1)}
            disabled={page >= pageCount - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnmatchedCardPriceTable;
