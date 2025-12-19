import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { priceFormatterUsd, TcgPlayerPriceData } from '../../../../../types/CardPrices.ts';

interface PriceBadgeTooltipBaseProps {
  data: string | null;
  sourceLink?: string;
  updatedAt?: Date | null;
  fetchedAt?: Date;
  displaySubtype?: boolean;
  customMessages?: string[];
  warningMessages?: string[];
}

export const PriceBadgeTooltipTcgplayer: React.FC<PriceBadgeTooltipBaseProps> = ({
  data,
  sourceLink,
  updatedAt,
  fetchedAt,
  displaySubtype,
  customMessages,
  warningMessages,
}) => {
  if (!data) return null;

  let parsedData: TcgPlayerPriceData | null = null;
  try {
    parsedData = JSON.parse(data) as TcgPlayerPriceData;
  } catch (error) {
    console.error('Failed to parse TCGplayer data:', error);
    return null;
  }

  if (!parsedData) return null;

  return (
    <div className="space-y-2 z-10">
      <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
        {updatedAt && (
          <div>Data from TCGplayer: {formatDistanceToNow(updatedAt, { addSuffix: true })}</div>
        )}
        {fetchedAt && (
          <div>Last time checked: {formatDistanceToNow(fetchedAt, { addSuffix: true })}</div>
        )}
        {customMessages && customMessages.length > 0 && (
          <>
            {customMessages.map((message, index) => (
              <div key={index}>{message}</div>
            ))}
          </>
        )}
      </div>

      <div>
        <Table>
          <TableBody className="border-t">
            <TableRow>
              <TableCell>High</TableCell>
              <TableCell className="text-right">
                {priceFormatterUsd(parsedData.highPrice)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mid</TableCell>
              <TableCell className="text-right">{priceFormatterUsd(parsedData.midPrice)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Low</TableCell>
              <TableCell className="text-right">{priceFormatterUsd(parsedData.lowPrice)}</TableCell>
            </TableRow>
            <TableRow className="border-b-0">
              <TableCell className="font-bold pt-4">Market</TableCell>
              <TableCell className="text-right font-bold pt-4">
                {priceFormatterUsd(parsedData.marketPrice)}
              </TableCell>
            </TableRow>
            {displaySubtype && parsedData.subTypeName && (
              <TableRow>
                <TableCell className="font-bold pt-4">Subtype</TableCell>
                <TableCell className="text-right font-bold pt-4">
                  {parsedData.subTypeName}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {warningMessages && warningMessages.length > 0 && (
        <div className="text-[10px] text-yellow-800 dark:text-yellow-200 text-center">
          {warningMessages.map((message, index) => (
            <div key={index}>{message}</div>
          ))}
        </div>
      )}

      {sourceLink && (
        <div className="pt-1 flex items-center justify-center">
          <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="inline-block">
            <Badge variant="outline" className="flex items-center gap-1 hover:bg-muted">
              <img
                src="https://images.swubase.com/price-source-thumbnails/price-source-tcgplayer.svg"
                alt="TCGplayer"
                className="size-3"
              />
              <span>View on TCGplayer</span>
            </Badge>
          </a>
        </div>
      )}
    </div>
  );
};

export default PriceBadgeTooltipTcgplayer;
