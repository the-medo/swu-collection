import { useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';

interface TableDataItem {
  weekId: string;
  weekNumber: number;
  championCount: number;
  championPercentage: number;
  championChange: number;
  championPercentageChange: number;
  top8Count: number;
  top8Percentage: number;
  top8Change: number;
  top8PercentageChange: number;
  totalCount: number;
  totalPercentage: number;
  totalChange: number;
  totalPercentageChange: number;
}

// Helper function to render change values with colors
const renderChange = (value: number, showCounts: boolean): JSX.Element => {
  if (value === 0) {
    return <span className="text-muted-foreground">0</span>;
  }

  const color = value > 0 ? 'text-green-500' : 'text-red-500';
  const prefix = value > 0 ? '+' : '';
  const displayValue = showCounts ? `${prefix}${value}` : `${prefix}${value.toFixed(1)}`;

  return <span className={color}>{displayValue}</span>;
};

export const useSideStatWeeklyShiftTableColumns = (
  showCounts: boolean,
): ColumnDef<TableDataItem>[] => {
  const getColumnId = useCallback(
    (base: string) => (showCounts ? `${base}Count` : `${base}Percentage`),
    [showCounts],
  );

  const getChangeColumnId = useCallback(
    (base: string) => (showCounts ? `${base}Change` : `${base}PercentageChange`),
    [showCounts],
  );

  return useMemo(
    () => [
      {
        id: 'weekNumber',
        accessorKey: 'weekNumber',
        header: () => <div className="font-bold">Wk.</div>,
        cell: ({ row }) => <div className="font-bold">{row.original.weekNumber}</div>,
      },
      {
        id: getColumnId('champion'),
        header: () => <div className="font-bold">Champ</div>,

        cell: ({ row }) => (
          <div className="text-right">
            {showCounts
              ? row.original.championCount
              : `${row.original.championPercentage.toFixed(1)}%`}
          </div>
        ),
      },
      {
        id: getChangeColumnId('champion'),
        header: () => <></>,
        cell: ({ row }) => (
          <div>
            {row.original.weekNumber > 1
              ? showCounts
                ? renderChange(row.original.championChange, true)
                : renderChange(row.original.championPercentageChange, false)
              : null}
          </div>
        ),
      },
      {
        id: getColumnId('top8'),
        header: () => <div className="font-bold">Top 8</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {showCounts ? row.original.top8Count : `${row.original.top8Percentage.toFixed(1)}%`}
          </div>
        ),
      },
      {
        id: getChangeColumnId('top8'),
        header: () => <></>,
        cell: ({ row }) => (
          <div>
            {row.original.weekNumber > 1
              ? showCounts
                ? renderChange(row.original.top8Change, true)
                : renderChange(row.original.top8PercentageChange, false)
              : null}
          </div>
        ),
      },
      {
        id: getColumnId('total'),
        header: () => <div className="font-bold">Total</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {showCounts ? row.original.totalCount : `${row.original.totalPercentage.toFixed(1)}%`}
          </div>
        ),
      },
      {
        id: getChangeColumnId('total'),
        header: () => <></>,
        cell: ({ row }) => (
          <div>
            {row.original.weekNumber > 1
              ? showCounts
                ? renderChange(row.original.totalChange, true)
                : renderChange(row.original.totalPercentageChange, false)
              : null}
          </div>
        ),
      },
    ],
    [showCounts, getColumnId, getChangeColumnId],
  );
};
