import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { CardMarketPriceData, priceFormatterEur } from '../../../../../types/CardPrices.ts';

interface PriceBadgeTooltipBaseProps {
  data: string | null;
  sourceLink: string;
  updatedAt: Date | null;
  fetchedAt: Date;
}

export const PriceBadgeTooltipCardmarket: React.FC<PriceBadgeTooltipBaseProps> = ({
  data,
  sourceLink,
  updatedAt,
  fetchedAt,
}) => {
  if (!data) return null;

  let parsedData: CardMarketPriceData | null = null;
  try {
    parsedData = JSON.parse(data) as CardMarketPriceData;
  } catch (error) {
    console.error('Failed to parse CardMarket data:', error);
    return null;
  }

  if (!parsedData) return null;

  return (
    <div className="space-y-2 z-10">
      <div className="text-[10px] text-gray-500 text-center">
        {updatedAt && (
          <div>Data from CardMarket: {formatDistanceToNow(updatedAt, { addSuffix: true })}</div>
        )}
        <div>Last time checked: {formatDistanceToNow(fetchedAt, { addSuffix: true })}</div>
      </div>

      <div>
        <Table>
          <TableBody className="border-t">
            <TableRow>
              <TableCell>Average Price 30 Days</TableCell>
              <TableCell className="text-right">
                {priceFormatterEur(parsedData.averagePrice30Days)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Average Price 7 Days</TableCell>
              <TableCell className="text-right">
                {priceFormatterEur(parsedData.averagePrice7Days)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Average Price 1 Day</TableCell>
              <TableCell className="text-right">
                {priceFormatterEur(parsedData.averagePrice1Day)}
              </TableCell>
            </TableRow>
            <TableRow className="border-b-0">
              <TableCell>Price trend</TableCell>
              <TableCell className="text-right">
                {priceFormatterEur(parsedData.priceTrend)}
              </TableCell>
            </TableRow>
            <TableRow className="">
              <TableCell className="font-bold pt-4">From</TableCell>
              <TableCell className="text-right font-bold pt-4">
                {priceFormatterEur(parsedData.fromPrice)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="pt-1 flex items-center justify-center">
        <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="inline-block">
          <Badge variant="outline" className="flex items-center gap-1 hover:bg-muted">
            <img src="https://images.swubase.com/cm-logo.png" alt="CardMarket" className="size-3" />
            <span>View on CardMarket</span>
          </Badge>
        </a>
      </div>
    </div>
  );
};

export default PriceBadgeTooltipCardmarket;
