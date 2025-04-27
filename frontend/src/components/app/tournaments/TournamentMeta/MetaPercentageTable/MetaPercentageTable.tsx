import * as React from 'react';
import { MetaPercentageTableRow } from './MetaPercentageTableRow.tsx';

interface MetaPercentageTableProps {
  data: {
    all: number;
    top8: number;
    day2: number;
    top64: number;
    percentageAll: string;
    percentageTop8: string;
    percentageDay2: string;
    percentageTop64: string;
    conversionTop8: string;
    conversionDay2: string;
    conversionTop64: string;
  };
  totalDecks: number;
  day2Decks: number;
}

export const MetaPercentageTable: React.FC<MetaPercentageTableProps> = ({
  data,
  totalDecks,
  day2Decks,
}) => {
  return (
    <div className="text-xs space-y-1 mt-2">
      <table>
        <thead>
          <tr className="bg-accent font-bold">
            <td></td>
            <td className="px-2 py-1">Count</td>
            <td className="px-2 py-1">Percentage</td>
            <td className="px-2 py-1 flex flex-col gap-0 items-center">
              <span>Conversion rate</span>
              <span className="text-[10px]">(from all decks)</span>
            </td>
          </tr>
        </thead>
        <tbody>
          <MetaPercentageTableRow
            title={`All (${totalDecks} decks)`}
            count={data.all}
            percentage={data.percentageAll}
            conversion="-"
          />
          <MetaPercentageTableRow
            title="Top 64"
            count={data.top64}
            percentage={data.percentageTop64}
            conversion={data.conversionTop64}
          />
          <MetaPercentageTableRow
            title={`Day 2 (${day2Decks} decks)`}
            count={data.day2}
            percentage={data.percentageDay2}
            conversion={data.conversionDay2}
          />
          <MetaPercentageTableRow
            title="Top 8"
            count={data.top8}
            percentage={data.percentageTop8}
            conversion={data.conversionTop8}
          />
        </tbody>
      </table>
    </div>
  );
};

export default MetaPercentageTable;
