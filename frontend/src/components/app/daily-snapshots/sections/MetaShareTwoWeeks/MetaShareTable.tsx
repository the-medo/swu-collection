import * as React from 'react';
import { useMemo } from 'react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import type { DailySnapshotMetaPart } from './MetaPartSelector.tsx';
import type { DailySnapshotMetaView } from './MetaViewSelector.tsx';
import type { ProcessedDataItem } from './MetaSharePieChart.tsx';

interface MetaShareTableProps {
  processedData: ProcessedDataItem[];
  metaPart: DailySnapshotMetaPart;
  metaView: DailySnapshotMetaView;
}

const TOP_DISPLAY_COUNT = 5;

const MetaShareTable: React.FC<MetaShareTableProps> = ({ processedData, metaPart, metaView }) => {
  const labelRenderer = useLabel();

  // Transform processed data for table display
  const tableData = useMemo(() => {
    // Take the top 5 items from already processed and sorted data
    const top5Items = processedData.slice(0, TOP_DISPLAY_COUNT).map(item => ({
      key: item.key,
      sortValue: item.sortValue,
      total: item.total,
      top8: item.top8,
      winners: item.winners,
    }));

    // Calculate the sum of the remaining items (if any) for "Others" row and add at the end
    if (processedData.length > TOP_DISPLAY_COUNT) {
      const remainingItems = processedData.slice(TOP_DISPLAY_COUNT);
      const othersData = remainingItems.reduce(
        (acc, item) => {
          acc.total += item.total;
          acc.top8 += item.top8;
          acc.winners += item.winners;
          return acc;
        },
        {
          total: 0,
          top8: 0,
          winners: 0,
        },
      );

      // Only add "Others" row if there are remaining items with non-zero values
      if (othersData.total > 0 || othersData.top8 > 0 || othersData.winners > 0) {
        const othersSortValue =
          metaPart === 'total'
            ? othersData.total
            : metaPart === 'top8'
              ? othersData.top8
              : othersData.winners;

        // Add "Others" at the end
        top5Items.push({
          key: 'Others',
          sortValue: othersSortValue,
          total: othersData.total,
          top8: othersData.top8,
          winners: othersData.winners,
        });
      }
    }

    return top5Items;
  }, [processedData, metaPart]);

  // Calculate column totals for percentage calculations
  const columnTotals = useMemo(() => {
    return processedData.reduce(
      (acc, item) => ({
        total: acc.total + item.total,
        top8: acc.top8 + item.top8,
        winners: acc.winners + item.winners,
      }),
      { total: 0, top8: 0, winners: 0 },
    );
  }, [processedData]);

  // Helper function to format number with percentage
  const formatWithPercentage = (value: number, columnTotal: number) => {
    if (columnTotal === 0)
      return (
        <div className="flex flex-row items-end">
          <span>{value}</span>
          <span className="text-xs text-muted-foreground">(0%)</span>
        </div>
      );
    const percentage = ((value / columnTotal) * 100).toFixed(1);
    return (
      <div className="flex flex-row justify-end items-center w-16 gap-2">
        <span>{value}</span>
        <span className="text-xs text-muted-foreground">({percentage}%)</span>
      </div>
    );
  };

  const metaInfo = metaView === 'leaders' ? 'leaders' : 'leadersAndBase';

  if (processedData.length === 0) {
    return <p className="text-muted-foreground">No data available.</p>;
  }

  return (
    <div className="w-full min-w-[450px]">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-1 text-left text-sm font-medium">
                {metaView === 'leaders' ? 'Leader' : 'Leader & Base'}
              </th>
              <th className="px-2 py-1 text-right text-sm font-medium w-20">Total</th>
              <th className="px-2 py-1 text-right text-sm font-medium w-20">Top 8</th>
              <th className="px-2 py-1 text-right text-sm font-medium w-20">Champions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tableData.map((item, index) => (
              <tr key={item.key} className="hover:bg-muted/30">
                <td className="px-2 py-1">
                  <div className="flex items-center gap-2">
                    {index < TOP_DISPLAY_COUNT && (
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                    {item.key === 'Others' ? (
                      <span className="text-sm font-medium">Others</span>
                    ) : (
                      labelRenderer(item.key, metaInfo, 'compact')
                    )}
                  </div>
                </td>
                <td
                  className={`px-2 py-1 text-right text-sm font-medium w-20 ${
                    metaPart === 'total' ? 'bg-primary/10' : ''
                  }`}
                >
                  {formatWithPercentage(item.total, columnTotals.total)}
                </td>
                <td
                  className={`px-2 py-1 text-right text-sm font-medium w-20 ${
                    metaPart === 'top8' ? 'bg-primary/10' : ''
                  }`}
                >
                  {columnTotals.top8 === 0 ? (
                    <div className="flex flex-row items-end">
                      <span>{item.top8}</span>
                      <span className="text-xs text-muted-foreground">(0%)</span>
                    </div>
                  ) : (
                    (() => {
                      const totalPct = columnTotals.total === 0 ? 0 : (item.total / columnTotals.total) * 100;
                      const top8Pct = (item.top8 / columnTotals.top8) * 100;
                      const colorClass = top8Pct > totalPct
                        ? 'text-green-600'
                        : top8Pct < totalPct
                          ? 'text-red-600'
                          : 'text-muted-foreground';
                      return (
                        <div className="flex flex-row justify-end items-center w-16 gap-2">
                          <span>{item.top8}</span>
                          <span className={`text-xs ${colorClass}`}>({top8Pct.toFixed(1)}%)</span>
                        </div>
                      );
                    })()
                  )}
                </td>
                <td
                  className={`px-2 py-1 text-right text-sm font-medium w-20 ${
                    metaPart === 'winners' ? 'bg-primary/10' : ''
                  }`}
                >
                  {columnTotals.winners === 0 ? (
                    <div className="flex flex-row items-end">
                      <span>{item.winners}</span>
                      <span className="text-xs text-muted-foreground">(0%)</span>
                    </div>
                  ) : (
                    (() => {
                      const totalPct = columnTotals.total === 0 ? 0 : (item.total / columnTotals.total) * 100;
                      const winnersPct = (item.winners / columnTotals.winners) * 100;
                      const colorClass = winnersPct > totalPct
                        ? 'text-green-600'
                        : winnersPct < totalPct
                          ? 'text-red-600'
                          : 'text-muted-foreground';
                      return (
                        <div className="flex flex-row justify-end items-center w-16 gap-2">
                          <span>{item.winners}</span>
                          <span className={`text-xs ${colorClass}`}>({winnersPct.toFixed(1)}%)</span>
                        </div>
                      );
                    })()
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MetaShareTable;
