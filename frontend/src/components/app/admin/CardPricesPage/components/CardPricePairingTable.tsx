import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import CardRow from './CardRow';
import { ParsedCardData } from '../lib/parseCardmarketHtml';
import { CardPriceSourceType } from '../../../../../../../types/CardPrices.ts';

type CardPricePairingTableProps = {
  parsedData: ParsedCardData[];
  sourceType: CardPriceSourceType;
};

const CardPricePairingTable: React.FC<CardPricePairingTableProps> = ({
  parsedData,
  sourceType,
}) => {
  if (!parsedData || parsedData.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-2">Parsed Data ({parsedData.length} cards)</h3>
      <div className="border rounded-md overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Product ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Submit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedData.map(card => (
              <CardRow key={card.productId} card={card} sourceType={sourceType} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CardPricePairingTable;
