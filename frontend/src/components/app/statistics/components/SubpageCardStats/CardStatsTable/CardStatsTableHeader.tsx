import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface StatsTableHeaderCellProps {
  children: React.ReactNode;
  className?: string;
  thickRightBorder?: boolean;
  onClick?: () => void;
  isActive?: 'asc' | 'desc' | false;
}

export const StatsTableHeaderCell: React.FC<StatsTableHeaderCellProps> = ({
  children,
  className = '',
  thickRightBorder = false,
  onClick,
  isActive,
}) => (
  <th
    className={cn(
      `px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${className}`,
      {
        'border-r-2 border-r-slate-400 dark:border-r-slate-600': thickRightBorder,
        'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900': !!onClick,
      },
    )}
    onClick={onClick}
  >
    <span className="inline-flex items-center gap-1">
      {children}
      {isActive === 'desc' && <ArrowDown className="w-3 h-3" />}
      {isActive === 'asc' && <ArrowUp className="w-3 h-3" />}
    </span>
  </th>
);

interface StatsTableHeaderGroupProps {
  children: React.ReactNode;
  colSpan?: number;
  className?: string;
  thickRightBorder?: boolean;
  onClick?: () => void;
}

export const StatsTableHeaderGroup: React.FC<StatsTableHeaderGroupProps> = ({
  children,
  colSpan,
  className = '',
  thickRightBorder = false,
  onClick,
}) => (
  <th
    className={cn(
      `px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`,
      {
        'border-r-2 border-r-slate-400 dark:border-r-slate-600': thickRightBorder,
        'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800': !!onClick,
      },
    )}
    colSpan={colSpan}
    onClick={onClick}
  >
    <span className="inline-flex items-center gap-1">{children}</span>
  </th>
);

interface StatsTableCellProps {
  children: React.ReactNode;
  className?: string;
  thickRightBorder?: boolean;
}

export const StatsTableCell: React.FC<StatsTableCellProps> = ({
  children,
  className = '',
  thickRightBorder = false,
}) => (
  <td
    className={`px-4 py-2 text-right border-x border-slate-200 dark:border-slate-800 ${thickRightBorder ? 'border-r-2 border-r-slate-400 dark:border-r-slate-600' : ''} ${className}`}
  >
    {children}
  </td>
);
