import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

interface PriceBadgeTooltipProps {
  data: string | null;
  sourceType: string;
  sourceLink: string;
  updatedAt: Date | null;
  fetchedAt: Date;
}

interface CardMarketData {
  availableItems: number;
  fromPrice: number;
  priceTrend: number;
  averagePrice30Days: number;
  averagePrice7Days: number;
  averagePrice1Day: number;
  topListings: Array<{
    price: number;
    quantity: number;
  }>;
}

/**
 * PriceBadgeTooltip component
 *
 * Displays a detailed price tooltip with pricing information and lowest listings.
 * Currently supports CardMarket as source type.
 *
 * @param props - Component props
 * @param props.data - JSON string containing price data
 * @param props.sourceType - The source type for the price data (currently only 'cardmarket')
 * @param props.sourceLink - Link to the source, opens in new tab
 */
export const PriceBadgeTooltip: React.FC<PriceBadgeTooltipProps> = ({
  data,
  sourceType,
  sourceLink,
  updatedAt,
  fetchedAt,
}) => {
  if (!data) return null;

  let parsedData: CardMarketData | null = null;

  if (sourceType === 'cardmarket') {
    try {
      parsedData = JSON.parse(data) as CardMarketData;
    } catch (error) {
      console.error('Failed to parse CardMarket data:', error);
      return null;
    }
  }

  if (!parsedData) {
    return null;
  }

  const formatPrice = (price: number | undefined) => `${price?.toFixed(2)} €`;

  return (
    <div className="space-y-2">
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
                {formatPrice(parsedData.averagePrice30Days)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Average Price 7 Days</TableCell>
              <TableCell className="text-right">
                {formatPrice(parsedData.averagePrice7Days)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Average Price 1 Day</TableCell>
              <TableCell className="text-right">
                {formatPrice(parsedData.averagePrice1Day)}
              </TableCell>
            </TableRow>
            <TableRow className="border-b-0">
              <TableCell>Price trend</TableCell>
              <TableCell className="text-right">{formatPrice(parsedData.priceTrend)}</TableCell>
            </TableRow>
            <TableRow className="">
              <TableCell className="font-bold pt-4">From</TableCell>
              <TableCell className="text-right font-bold pt-4">
                {formatPrice(parsedData.fromPrice)}
              </TableCell>
            </TableRow>
            {parsedData.topListings.map((listing, index) => (
              <TableRow key={index} className="text-xs border-b-0 p-0">
                <TableCell className="text-right pr-2">{listing.quantity}x</TableCell>
                <TableCell className="text-right">{formatPrice(listing.price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Source link badge */}
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
