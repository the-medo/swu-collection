import * as React from 'react';
import { MetaPercentageTableRow } from './MetaPercentageTableRow.tsx';

interface MetaPercentageTableProps {
  data: {
    all: number;
    top8: number;
    day2: number;
    top64: number;
    champions: number;
    percentageAll: string;
    percentageTop8: string;
    percentageDay2: string;
    percentageTop64: string;
    percentageChampions: string;
    conversionTop8: string;
    conversionDay2: string;
    conversionTop64: string;
    conversionChampions: string;
  };
  totalDecks: number;
  day2Decks: number;
  top8Decks?: number;
  top64Decks?: number;
  championsDecks?: number;
}

export const MetaPercentageTable: React.FC<MetaPercentageTableProps> = ({
  data,
  totalDecks,
  day2Decks,
  top8Decks,
  top64Decks,
  championsDecks,
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
              <span className="text-[10px]">(from {data.all} decks)</span>
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
            title={`Top 64 ${top64Decks !== 64 ? `(${top64Decks} decks)` : ''}`}
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
            title={`Top 8 ${top8Decks !== 8 ? `(${top8Decks} decks)` : ''}`}
            count={data.top8}
            percentage={data.percentageTop8}
            conversion={data.conversionTop8}
          />
          <MetaPercentageTableRow
            title={`Champions ${championsDecks !== 1 ? `(${championsDecks} decks)` : ''}`}
            count={data.champions}
            percentage={data.percentageChampions}
            conversion={data.conversionChampions}
          />
        </tbody>
      </table>
    </div>
  );
};

export default MetaPercentageTable;
