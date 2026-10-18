import * as React from 'react';
import { useMemo } from 'react';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import type { DailySnapshotMetaPart } from './MetaPartSelector.tsx';
import type { DailySnapshotMetaView } from './MetaViewSelector.tsx';
import { collapseMetaShareData, type ProcessedDataItem } from './metaShareData.ts';
import { isKnownSnapshotDeckKey } from '../snapshotDeckKey.ts';
import { cn } from '@/lib/utils.ts';

interface MetaShareTableProps {
  processedData: ProcessedDataItem[];
  metaPart: DailySnapshotMetaPart;
  metaView: DailySnapshotMetaView;
  onClick: (key: string) => void;
  selectedDeckKey: string | null;
}

const TOP_DISPLAY_COUNT = 5;

const MetaShareTable: React.FC<MetaShareTableProps> = ({
  processedData,
  metaPart,
  metaView,
  onClick,
  selectedDeckKey,
}) => {
  const labelRenderer = useLabel();

  const tableData = useMemo(
    () => collapseMetaShareData(processedData, TOP_DISPLAY_COUNT),
    [processedData],
  );

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
      <div className="flex flex-row justify-end items-center w-20 gap-2">
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
    <div
      className={cn(
        'meta-share-table w-full min-w-0',
        '[&_table]:bg-card/80 [&_table]:tabular-nums',
        '[&_thead]:bg-muted/40 [&_thead]:text-muted-foreground',
        '[&_th]:text-[11px] [&_th]:py-1 [&_th]:h-auto',
        '[&_td]:py-1 [&_td]:h-auto',
        '[&_td:first-child_>_div_>_span:first-child]:text-[11px]',
        '[&_tbody_tr:hover]:bg-[var(--meta-tint)]',
        '[&_tr[data-selected]]:bg-[var(--meta-tint)]',
        '[&_tr[data-selected]_td:first-child]:shadow-[inset_3px_0_var(--meta-accent)]',
        '[&_.meta-active-column]:bg-[color-mix(in_srgb,_var(--meta-tint)_70%,_transparent)]',
      )}
    >
      <div
        className={cn(
          'meta-table-scroll w-full overflow-x-auto overscroll-x-contain border border-border rounded-[8px]',
          'focus-visible:outline-2 focus-visible:outline-[var(--meta-accent)] focus-visible:outline-offset-3',
        )}
        role="region"
        aria-label="Meta share rankings"
        tabIndex={0}
      >
        <table className="min-w-[450px] w-full table-fixed">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-1 text-left text-sm font-medium">
                {metaView === 'leaders' ? 'Leader' : 'Leader & Base'}
              </th>
              <th className="px-2 py-1 text-right text-sm font-medium w-24">Total</th>
              <th className="px-2 py-1 text-right text-sm font-medium w-20">Top 8</th>
              <th className="px-2 py-1 text-right text-sm font-medium w-20">Champions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tableData.map((item, index) => (
              <tr
                key={item.key}
                data-selected={selectedDeckKey === item.key || undefined}
                className={cn(
                  'hover:bg-muted/30',
                  isKnownSnapshotDeckKey(item.key) && 'cursor-pointer',
                )}
                onClick={isKnownSnapshotDeckKey(item.key) ? () => onClick(item.key) : undefined}
              >
                <td className="px-2 py-1">
                  <div className="flex items-center gap-2">
                    {index < TOP_DISPLAY_COUNT && isKnownSnapshotDeckKey(item.key) && (
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                    {!isKnownSnapshotDeckKey(item.key) ? (
                      <span className="text-sm font-medium">
                        {item.key === 'unknown' ? 'Unknown' : 'Others'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          'meta-leader-button min-w-0 max-w-full text-left cursor-pointer rounded-[5px]',
                          'focus-visible:outline-2 focus-visible:outline-[var(--meta-accent)] focus-visible:outline-offset-3',
                        )}
                        onClick={event => {
                          event.stopPropagation();
                          onClick(item.key);
                        }}
                        aria-label={`Select ${labelRenderer(item.key, metaInfo, 'text')}`}
                        aria-pressed={selectedDeckKey === item.key}
                      >
                        {labelRenderer(item.key, metaInfo, 'compact')}
                      </button>
                    )}
                  </div>
                </td>
                <td
                  className={`px-2 py-1 text-right text-sm font-medium w-20 ${
                    metaPart === 'total' ? 'meta-active-column' : ''
                  }`}
                >
                  {formatWithPercentage(item.total, columnTotals.total)}
                </td>
                <td
                  className={`px-2 py-1 text-right text-sm font-medium w-20 ${
                    metaPart === 'top8' ? 'meta-active-column' : ''
                  }`}
                >
                  {columnTotals.top8 === 0 ? (
                    <div className="flex flex-row items-end">
                      <span>{item.top8}</span>
                      <span className="text-xs text-muted-foreground">(0%)</span>
                    </div>
                  ) : (
                    (() => {
                      const totalPct =
                        columnTotals.total === 0 ? 0 : (item.total / columnTotals.total) * 100;
                      const top8Pct = (item.top8 / columnTotals.top8) * 100;
                      const colorClass =
                        top8Pct > totalPct
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
                    metaPart === 'winners' ? 'meta-active-column' : ''
                  }`}
                >
                  {columnTotals.winners === 0 ? (
                    <div className="flex flex-row items-end">
                      <span>{item.winners}</span>
                      <span className="text-xs text-muted-foreground">(0%)</span>
                    </div>
                  ) : (
                    (() => {
                      const totalPct =
                        columnTotals.total === 0 ? 0 : (item.total / columnTotals.total) * 100;
                      const winnersPct = (item.winners / columnTotals.winners) * 100;
                      const colorClass =
                        winnersPct > totalPct
                          ? 'text-green-600'
                          : winnersPct < totalPct
                            ? 'text-red-600'
                            : 'text-muted-foreground';
                      return (
                        <div className="flex flex-row justify-end items-center w-16 gap-2">
                          <span>{item.winners}</span>
                          <span className={`text-xs ${colorClass}`}>
                            ({winnersPct.toFixed(1)}%)
                          </span>
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
