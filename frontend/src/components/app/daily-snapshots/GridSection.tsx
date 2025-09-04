import React from 'react';
import { cn } from '@/lib/utils.ts';

export type GridCardSizing = {
  row: { from: number; to: number };
  col: { from: number; to: number };
};

// 1..4 corresponds to the total column count of the grid at the given breakpoint
export type SectionCardSizing = Record<1 | 2 | 3 | 4, GridCardSizing>;

export type GridSectionProps = {
  sizing: SectionCardSizing;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

// GridSection applies grid placement (row/col start/end) using Tailwind responsive classes
// for each breakpoint: base (1 col), md (2 cols), lg (3 cols), xl (4 cols).
export const GridSection: React.FC<GridSectionProps> = ({ sizing, className, style, children }) => {
  const s1 = sizing[1];
  const s2 = sizing[2];
  const s3 = sizing[3];
  const s4 = sizing[4];

  return (
    <div
      className={cn(
        'min-w-0 min-h-0',
        `row-start-${s1.row.from}`,
        `row-end-${s1.row.to + 1}`, // grid end is exclusive, so +1
        `col-start-${s1.col.from}`,
        `col-end-${s1.col.to + 1}`,
        // md (2 columns)
        `md:row-start-${s2.row.from}`,
        `md:row-end-${s2.row.to + 1}`,
        `md:col-start-${s2.col.from}`,
        `md:col-end-${s2.col.to + 1}`,
        // lg (3 columns)
        `lg:row-start-${s3.row.from}`,
        `lg:row-end-${s3.row.to + 1}`,
        `lg:col-start-${s3.col.from}`,
        `lg:col-end-${s3.col.to + 1}`,
        // xl (4 columns)
        `xl:row-start-${s4.row.from}`,
        `xl:row-end-${s4.row.to + 1}`,
        `xl:col-start-${s4.col.from}`,
        `xl:col-end-${s4.col.to + 1}`,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
};

export default GridSection;
