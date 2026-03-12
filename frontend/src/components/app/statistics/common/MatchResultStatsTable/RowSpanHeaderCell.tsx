import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { headerGroupClass } from '@/components/app/statistics/common/MatchResultStatsTable/matchResultStatsTableLib.ts';

interface RowSpanHeaderCellProps {
  children: React.ReactNode;
  rowSpan?: number;
  className?: string;
  onClick?: () => void;
  isActive?: 'asc' | 'desc' | false;
}

export const RowSpanHeaderCell: React.FC<RowSpanHeaderCellProps> = ({
  children,
  rowSpan,
  className = '',
  onClick,
  isActive = false,
}) => (
  <th
    className={cn(headerGroupClass, className, {
      'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800': !!onClick,
    })}
    rowSpan={rowSpan}
    onClick={onClick}
  >
    <span className="inline-flex items-center gap-1">
      {children}
      {isActive === 'desc' && <ArrowDown className="w-3 h-3" />}
      {isActive === 'asc' && <ArrowUp className="w-3 h-3" />}
    </span>
  </th>
);
