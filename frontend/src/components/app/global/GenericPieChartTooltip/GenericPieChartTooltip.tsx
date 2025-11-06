import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import { PieTooltipProps } from '@nivo/pie';

export const getGenericPieChartTooltip = <T extends unknown>(x: PieTooltipProps<T>) => {
  return (
    <div className="bg-card p-2 rounded-md shadow-md border min-w-[150px] flex gap-2 items-center">
      <div
        className={cn(`size-4 min-w-4 min-h-4`)}
        style={{ backgroundColor: x.datum.color }}
      ></div>
      {x.datum.label}
    </div>
  );
};

interface GenericPieChartTooltipProps {
  x: PieTooltipProps<unknown>;
}

const GenericPieChartTooltip: React.FC<GenericPieChartTooltipProps> = ({ x }) => {
  return getGenericPieChartTooltip(x);
};

export default GenericPieChartTooltip;
