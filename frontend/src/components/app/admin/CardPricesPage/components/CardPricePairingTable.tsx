import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import CardRow from './CardRow';
import { ParsedCardData } from '../lib/parseCardmarketHtml';

type CardPricePairingTableProps = {
  parsedData: ParsedCardData[];
};

const CardPricePairingTable: React.FC<CardPricePairingTableProps> = ({ parsedData }) => {
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
              <CardRow key={card.productId} card={card} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CardPricePairingTable;
